package pl.restaurant.restaurantbackend.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.stream.Collectors;
import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.DigestUtils;
import pl.restaurant.restaurantbackend.dto.CreateOrderRequest;
import pl.restaurant.restaurantbackend.dto.OrderSearchCriteria;
import pl.restaurant.restaurantbackend.dto.PublicOrderView;
import pl.restaurant.restaurantbackend.model.DailyOrderCounter;
import pl.restaurant.restaurantbackend.model.MenuItem;
import pl.restaurant.restaurantbackend.model.OrderEntity;
import pl.restaurant.restaurantbackend.model.OrderItem;
import pl.restaurant.restaurantbackend.model.OrderStatusChange;
import pl.restaurant.restaurantbackend.repository.DailyOrderCounterRepository;
import pl.restaurant.restaurantbackend.repository.MenuItemRepository;
import pl.restaurant.restaurantbackend.repository.OrderRepository;
import pl.restaurant.restaurantbackend.repository.OrderStatusChangeRepository;
import pl.restaurant.restaurantbackend.repository.specification.OrderSpecifications;

@Service
public class OrderService {
    private static final List<String> SCREEN_ORDER_STATUSES = List.of("W realizacji", "Gotowe");
    private static final List<String> ORDER_STATUSES = List.of("W realizacji", "Gotowe", "Zrealizowane", "Anulowane");
    private static final Duration ACTIVE_ORDERS_CACHE_TTL = Duration.ofSeconds(2);
    private static final String ORDERS_REPORT_TEMPLATE = "orders_report.jrxml";
    private static final String STATS_REPORT_TEMPLATE = "orders_stats_report.jrxml";
    private static final DateTimeFormatter DATE_TIME_REPORT_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter DATE_REPORT_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter TIME_REPORT_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderStatusChangeRepository orderStatusChangeRepository;

    @Autowired
    private MenuItemRepository menuItemRepository;

    @Autowired
    private DailyOrderCounterRepository dailyOrderCounterRepository;

    private final ConcurrentMap<LocalDate, Object> counterLocks = new ConcurrentHashMap<>();
    private final Object activeOrdersCacheLock = new Object();
    private final Object ordersReportTemplateLock = new Object();
    private final Object statsReportTemplateLock = new Object();
    private volatile ActiveOrdersCache activeOrdersCache = ActiveOrdersCache.empty();
    private volatile JasperReport ordersReportTemplate;
    private volatile JasperReport statsReportTemplate;

    @Transactional
    public OrderEntity createOrder(CreateOrderRequest request) {
        if (request == null || request.items() == null || request.items().isEmpty()) {
            throw new IllegalArgumentException("Zamowienie musi zawierac przynajmniej jedna pozycje.");
        }

        LocalDate today = LocalDate.now();
        DailyOrderCounter counter = dailyOrderCounterRepository.findByOrderDate(today).orElse(null);
        if (counter == null) {
            Object lock = counterLocks.computeIfAbsent(today, date -> new Object());
            try {
                synchronized (lock) {
                    counter = dailyOrderCounterRepository.findByOrderDate(today)
                            .orElseGet(() -> dailyOrderCounterRepository.saveAndFlush(new DailyOrderCounter(today, 0L)));
                }
            } finally {
                counterLocks.remove(today, lock);
            }
        }
        if (counter == null) {
            throw new IllegalStateException("Nie mozna pobrac licznika zamowien dla daty " + today);
        }
        Long todayNumber = counter.nextValue();
        dailyOrderCounterRepository.saveAndFlush(counter);

        List<CreateOrderRequest.Item> itemRequests = request.items();
        List<Long> menuItemIds = new ArrayList<>(itemRequests.size());
        for (CreateOrderRequest.Item itemRequest : itemRequests) {
            if (itemRequest == null || itemRequest.menuItemId() == null) {
                throw new IllegalArgumentException("Brak identyfikatora pozycji menu.");
            }
            menuItemIds.add(itemRequest.menuItemId());
        }

        Map<Long, MenuItem> menuItemsById = new HashMap<>();
        for (MenuItem menuItem : menuItemRepository.findAllById(menuItemIds)) {
            menuItemsById.put(menuItem.getId(), menuItem);
        }

        List<OrderItem> orderItems = new ArrayList<>();
        for (CreateOrderRequest.Item itemRequest : itemRequests) {
            MenuItem menuItem = menuItemsById.get(itemRequest.menuItemId());
            if (menuItem == null) {
                throw new IllegalArgumentException("Pozycja menu nie istnieje.");
            }
            if (!menuItem.isActive()) {
                throw new IllegalArgumentException("Pozycja menu jest aktualnie niedostepna.");
            }
            int quantity = itemRequest.quantity() != null && itemRequest.quantity() > 0 ? itemRequest.quantity() : 1;
            OrderItem orderItem = new OrderItem();
            orderItem.setMenuItemId(menuItem.getId());
            orderItem.setName(menuItem.getName());
            orderItem.setPrice(menuItem.getPrice());
            orderItem.setQuantity(quantity);
            orderItems.add(orderItem);
        }

        OrderEntity order = new OrderEntity();
        order.setOrderNumber(todayNumber);
        order.setOrderDate(today);
        order.setCreatedAt(LocalDateTime.now());
        order.setStatus("W realizacji");
        order.setType(normalizeOrderType(request.type()));
        order.setItems(orderItems);
        OrderEntity saved = orderRepository.save(order);
        invalidateActiveOrdersCache();
        return saved;
    }

    public Page<OrderEntity> findOrders(OrderSearchCriteria criteria, Pageable pageable) {
        Specification<OrderEntity> spec = OrderSpecifications.withCriteria(criteria);
        Sort sort = defaultSort();
        Pageable effectivePageable;
        if (pageable == null) {
            effectivePageable = PageRequest.of(0, 50, sort);
        } else if (pageable.getSort().isUnsorted()) {
            effectivePageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);
        } else {
            effectivePageable = pageable;
        }
        return orderRepository.findAll(spec, effectivePageable);
    }

    public List<OrderEntity> findOrders(OrderSearchCriteria criteria) {
        Specification<OrderEntity> spec = OrderSpecifications.withCriteria(criteria);
        return orderRepository.findAll(spec, defaultSort());
    }

    public List<OrderEntity> findOrders(OrderSearchCriteria criteria, int maxRows) {
        if (maxRows <= 0) {
            return List.of();
        }
        Specification<OrderEntity> spec = OrderSpecifications.withCriteria(criteria);
        Pageable pageable = PageRequest.of(0, maxRows, defaultSort());
        Page<OrderEntity> page = orderRepository.findAll(spec, pageable);
        if (page.getTotalElements() > maxRows) {
            throw new ReportLimitExceededException(maxRows, page.getTotalElements());
        }
        return page.getContent();
    }

    private Sort defaultSort() {
        return Sort.by(Sort.Direction.DESC, "orderDate").and(Sort.by(Sort.Direction.DESC, "orderNumber"));
    }

    private String normalizeOrderType(String rawType) {
        if (rawType == null) {
            return "na miejscu";
        }
        if ("na wynos".equalsIgnoreCase(rawType.trim())) {
            return "na wynos";
        }
        return "na miejscu";
    }

    public byte[] generateOrdersReport(List<OrderEntity> orders, String title, String dateFrom, String dateTo) throws Exception {
        return generateOrdersReport(orders, title, dateFrom, dateTo, null, null);
    }

    public byte[] generateOrdersReport(List<OrderEntity> orders, String title, String dateFrom, String dateTo, String timeFrom, String timeTo) throws Exception {
        JasperReport jasperReport = getOrdersReportTemplate();
        Map<String, Object> params = new HashMap<>();
        params.put("REPORT_TITLE", title);
        params.put("REPORT_DATE_FROM", dateFrom);
        params.put("REPORT_DATE_TO", dateTo);
        if (orders == null || orders.isEmpty()) {
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params, new JREmptyDataSource());
            return JasperExportManager.exportReportToPdf(jasperPrint);
        }
        List<OrderEntity> filtered = filterOrdersByTime(orders, timeFrom, timeTo);
        List<Map<String, Object>> data = filtered.stream()
                .map(this::buildOrderReportRow)
                .collect(Collectors.toList());
        double totalSum = filtered.stream()
                .flatMap(o -> o.getItems().stream())
                .mapToDouble(i -> i.getPrice() * i.getQuantity())
                .sum();
        List<Long> durations = collectDurationsInSeconds(filtered);
        params.put("REPORT_TOTAL_SUM", formatCurrency(totalSum));
        params.put("REPORT_AVG_TIME", formatAverageDuration(durations));
        JRBeanCollectionDataSource ds = new JRBeanCollectionDataSource(data, false);
        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params, ds);
        return JasperExportManager.exportReportToPdf(jasperPrint);
    }

        public byte[] generateStatsReport(List<OrderEntity> orders, String title, String dateFrom, String dateTo) throws Exception {
        return generateStatsReport(orders, title, dateFrom, dateTo, null, null);
    }

        public byte[] generateStatsReport(List<OrderEntity> orders, String title, String dateFrom, String dateTo, String timeFrom, String timeTo) throws Exception {
        JasperReport jasperReport = getStatsReportTemplate();
        Map<String, Object> params = new HashMap<>();
        params.put("REPORT_TITLE", title);
        params.put("REPORT_DATE_FROM", dateFrom);
        params.put("REPORT_DATE_TO", dateTo);
        if (orders == null) {
            orders = List.of();
        }
        List<OrderEntity> filtered = filterOrdersByTime(orders, timeFrom, timeTo);
        List<Map<String, String>> stats = buildStatsRows(filtered);
        JRBeanCollectionDataSource ds = new JRBeanCollectionDataSource(stats, false);
        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params, ds);
        return JasperExportManager.exportReportToPdf(jasperPrint);
    }

    private List<OrderEntity> filterOrdersByTime(List<OrderEntity> orders, String timeFrom, String timeTo) {
        if (orders == null || orders.isEmpty()) {
            return orders == null ? List.of() : orders;
        }
        LocalTime from = parseTimeOrNull(timeFrom);
        LocalTime to = parseTimeOrNull(timeTo);
        if (from == null && to == null) {
            return orders;
        }
        return orders.stream()
                .filter(order -> {
                    LocalDateTime createdAt = order.getCreatedAt();
                    if (createdAt == null) {
                        return false;
                    }
                    LocalTime orderTime = createdAt.toLocalTime();
                    if (from != null && orderTime.isBefore(from)) {
                        return false;
                    }
                    if (to != null && orderTime.isAfter(to)) {
                        return false;
                    }
                    return true;
                })
                .collect(Collectors.toList());
    }

    private LocalTime parseTimeOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalTime.parse(value);
        } catch (Exception ex) {
            return null;
        }
    }

    private Map<String, Object> buildOrderReportRow(OrderEntity order) {
        Map<String, Object> row = new HashMap<>();
        row.put("orderNumber", order.getOrderNumber());
        row.put("createdAt", formatDateTime(order.getCreatedAt()));
        row.put("createdDate", formatDate(order.getCreatedAt()));
        row.put("createdTime", formatTime(order.getCreatedAt()));
        row.put("type", order.getType());
        row.put("status", order.getStatus());
        row.put("items", order.getItems().stream()
                .map(item -> item.getName() + " x " + item.getQuantity() + " (" + formatCurrency(item.getPrice()) + ")")
                .collect(Collectors.joining(", ")));
        double orderSum = order.getItems().stream()
                .mapToDouble(i -> i.getPrice() * i.getQuantity())
                .sum();
        row.put("orderSum", formatCurrency(orderSum));
        row.put("readyToDone", formatDuration(order.getCreatedAt(), order.getFinishedAt()));
        return row;
    }

    private List<Map<String, String>> buildStatsRows(List<OrderEntity> orders) {
        List<Map<String, String>> stats = new ArrayList<>();
        stats.add(statRow("Liczba zamowien", String.valueOf(orders.size())));
        Map<String, Long> productCount = orders.stream()
                .flatMap(o -> o.getItems().stream())
                .collect(Collectors.groupingBy(OrderItem::getName, Collectors.summingLong(OrderItem::getQuantity)));
        Optional<Map.Entry<String, Long>> topProduct = productCount.entrySet().stream().max(Map.Entry.comparingByValue());
        stats.add(statRow("Najczesciej kupowany produkt", topProduct.map(Map.Entry::getKey).orElse("Brak")));
        double total = orders.stream()
                .flatMap(o -> o.getItems().stream())
                .mapToDouble(i -> i.getPrice() * i.getQuantity())
                .sum();
        stats.add(statRow("Suma wartosci zamowien", formatCurrency(total)));
        double average = orders.isEmpty() ? 0 : total / orders.size();
        stats.add(statRow("Srednia wartosc zamowienia", formatCurrency(average)));
        List<Long> durations = collectDurationsInSeconds(orders);
        stats.add(statRow("Sredni czas obslugi", formatAverageDuration(durations)));
        return stats;
    }

    private Map<String, String> statRow(String label, String value) {
        return Map.of("label", label, "value", value);
    }

    private List<Long> collectDurationsInSeconds(List<OrderEntity> orders) {
        if (orders == null || orders.isEmpty()) {
            return List.of();
        }
        return orders.stream()
                .filter(o -> o.getCreatedAt() != null && o.getFinishedAt() != null && !o.getFinishedAt().isBefore(o.getCreatedAt()))
                .map(o -> java.time.Duration.between(o.getCreatedAt(), o.getFinishedAt()).getSeconds())
                .collect(Collectors.toList());
    }

    private String formatDuration(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null || end.isBefore(start)) {
            return "-";
        }
        long seconds = java.time.Duration.between(start, end).getSeconds();
        long minutes = seconds / 60;
        long remSeconds = seconds % 60;
        return String.format("%d min %02d s", minutes, remSeconds);
    }

    private String formatAverageDuration(List<Long> durations) {
        if (durations.isEmpty()) {
            return "-";
        }
        double avgSec = durations.stream().mapToLong(Long::longValue).average().orElse(0);
        long roundedSeconds = Math.round(avgSec);
        long minutes = roundedSeconds / 60;
        long remSeconds = roundedSeconds % 60;
        return String.format("%d min %02d s", minutes, remSeconds);
    }

    private String formatDateTime(LocalDateTime value) {
        return value != null ? DATE_TIME_REPORT_FORMAT.format(value) : "";
    }

    private String formatDate(LocalDateTime value) {
        return value != null ? DATE_REPORT_FORMAT.format(value.toLocalDate()) : "";
    }

    private String formatTime(LocalDateTime value) {
        return value != null ? TIME_REPORT_FORMAT.format(value.toLocalTime()) : "";
    }

    private String formatCurrency(double value) {
        return formatMoney(value) + " zl";
    }

    public String generateOrdersCsv(List<OrderEntity> orders, String dateFrom, String dateTo, String timeFrom, String timeTo) {
        StringBuilder sb = new StringBuilder();
        sb.append("order_number,created_date,created_time,type,status,total_value,items\n");
        for (OrderEntity order : orders) {
            String createdDate = order.getCreatedAt() != null ? order.getCreatedAt().toLocalDate().toString() : "";
            String createdTime = order.getCreatedAt() != null ? order.getCreatedAt().toLocalTime().toString().substring(0, 5) : "";
            double total = order.getItems().stream().mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
            String items = order.getItems().stream()
                    .map(i -> i.getName() + " x " + i.getQuantity() + " (" + formatMoney(i.getPrice()) + ")")
                    .collect(Collectors.joining(" | "));
            sb.append(valueOrEmpty(order.getOrderNumber()))
                    .append(',').append(escapeCsv(createdDate))
                    .append(',').append(escapeCsv(createdTime))
                    .append(',').append(escapeCsv(order.getType()))
                    .append(',').append(escapeCsv(order.getStatus()))
                    .append(',').append(escapeCsv(formatMoney(total)))
                    .append(',').append(escapeCsv(items))
                    .append('\n');
        }
        return sb.toString();
    }

    public String generateStatsCsv(List<OrderEntity> orders, String dateFrom, String dateTo, String timeFrom, String timeTo) {
        StringBuilder sb = new StringBuilder();
        sb.append("metric,value\n");
        sb.append("Liczba zamowien,").append(orders.size()).append('\n');
        Map<String, Long> productCount = orders.stream()
                .flatMap(o -> o.getItems().stream())
                .collect(Collectors.groupingBy(OrderItem::getName, Collectors.summingLong(OrderItem::getQuantity)));
        Optional<Map.Entry<String, Long>> topProduct = productCount.entrySet().stream().max(Map.Entry.comparingByValue());
        sb.append("Najczesciej kupowany produkt,").append(escapeCsv(topProduct.map(Map.Entry::getKey).orElse("Brak"))).append('\n');
        double total = orders.stream().flatMap(o -> o.getItems().stream()).mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
        sb.append("Suma wartosci zamowien,").append(formatMoney(total)).append('\n');
        double avg = orders.isEmpty() ? 0 : total / orders.size();
        sb.append("Srednia wartosc zamowienia,").append(formatMoney(avg)).append('\n');
        List<Long> durations = orders.stream()
                .filter(o -> o.getCreatedAt() != null && o.getFinishedAt() != null)
                .map(o -> java.time.Duration.between(o.getCreatedAt(), o.getFinishedAt()).getSeconds())
                .collect(Collectors.toList());
        double avgSec = durations.isEmpty() ? 0 : durations.stream().mapToLong(Long::longValue).average().orElse(0);
        long avgMin = (long) (avgSec / 60);
        long avgRemSec = (long) (avgSec % 60);
        sb.append("Sredni czas obslugi,").append(durations.isEmpty() ? "-" : String.format("%d min %02d s", avgMin, avgRemSec)).append('\n');
        return sb.toString();
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        String escaped = value.replace("\"", "\"\"");
        if (escaped.contains(",") || escaped.contains("\n") || escaped.contains("\r")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }

    private String valueOrEmpty(Long number) {
        return number == null ? "" : number.toString();
    }

    private String formatMoney(double value) {
        return String.format(Locale.US, "%.2f", value);
    }

    private JasperReport getOrdersReportTemplate() {
        JasperReport cached = ordersReportTemplate;
        if (cached != null) {
            return cached;
        }
        synchronized (ordersReportTemplateLock) {
            cached = ordersReportTemplate;
            if (cached == null) {
                cached = compileReport(ORDERS_REPORT_TEMPLATE);
                ordersReportTemplate = cached;
            }
            return cached;
        }
    }

    private JasperReport getStatsReportTemplate() {
        JasperReport cached = statsReportTemplate;
        if (cached != null) {
            return cached;
        }
        synchronized (statsReportTemplateLock) {
            cached = statsReportTemplate;
            if (cached == null) {
                cached = compileReport(STATS_REPORT_TEMPLATE);
                statsReportTemplate = cached;
            }
            return cached;
        }
    }

    private JasperReport compileReport(String resourcePath) {
        try (InputStream stream = new ClassPathResource(resourcePath).getInputStream()) {
            return JasperCompileManager.compileReport(stream);
        } catch (IOException | JRException ex) {
            throw new IllegalStateException("Nie mozna skompilowac szablonu raportu: " + resourcePath, ex);
        }
    }

    @Transactional
    public void changeOrderStatus(Long orderId, String newStatus) {
        OrderEntity order = orderRepository.findById(orderId).orElseThrow();
        if (!ORDER_STATUSES.contains(newStatus)) {
            throw new IllegalArgumentException("Nieznany status zamowienia: " + newStatus);
        }
        order.setStatus(newStatus);
        OrderStatusChange change = new OrderStatusChange();
        change.setOrder(order);
        change.setStatus(newStatus);
        change.setChangedAt(LocalDateTime.now());
        orderStatusChangeRepository.save(change);
        if ("Zrealizowane".equalsIgnoreCase(newStatus)) {
            order.setFinishedAt(LocalDateTime.now());
        } else {
            order.setFinishedAt(null);
        }
        orderRepository.save(order);
        invalidateActiveOrdersCache();
    }

    public ActiveOrdersSnapshot getActiveOrdersSnapshot() {
        ActiveOrdersCache snapshot = activeOrdersCache;
        if (snapshot.isFresh()) {
            return snapshot.toSnapshot();
        }
        synchronized (activeOrdersCacheLock) {
            snapshot = activeOrdersCache;
            if (snapshot.isFresh()) {
                return snapshot.toSnapshot();
            }
            List<OrderEntity> activeOrders = orderRepository.findByStatusIn(
                    SCREEN_ORDER_STATUSES,
                    Sort.by(Sort.Direction.ASC, "orderDate")
                            .and(Sort.by(Sort.Direction.ASC, "orderNumber"))
            );
            List<PublicOrderView> view = activeOrders.stream()
                    .map(o -> new PublicOrderView(o.getId(), o.getOrderNumber(), o.getStatus()))
                    .collect(Collectors.toList());
            String etag = computeOrdersEtag(activeOrders);
            ActiveOrdersCache refreshed = new ActiveOrdersCache(view, etag, Instant.now());
            activeOrdersCache = refreshed;
            return refreshed.toSnapshot();
        }
    }

    private void invalidateActiveOrdersCache() {
        activeOrdersCache = ActiveOrdersCache.stale();
    }

    private String computeOrdersEtag(List<OrderEntity> orders) {
        if (orders.isEmpty()) {
            return "\"empty\"";
        }
        String payload = orders.stream()
                .map(o -> o.getId() + "|" + o.getOrderNumber() + "|" + o.getStatus() + "|" +
                        (o.getFinishedAt() != null ? o.getFinishedAt().toString() : "") + "|" +
                        (o.getCreatedAt() != null ? o.getCreatedAt().toString() : ""))
                .collect(Collectors.joining(";"));
        String digest = DigestUtils.md5DigestAsHex(payload.getBytes(StandardCharsets.UTF_8));
        return "\"" + digest + "\"";
    }

    private record ActiveOrdersCache(List<PublicOrderView> orders, String etag, Instant fetchedAt) {
        boolean isFresh() {
            return fetchedAt != null
                    && Instant.now().isBefore(fetchedAt.plus(ACTIVE_ORDERS_CACHE_TTL));
        }

        ActiveOrdersSnapshot toSnapshot() {
            return new ActiveOrdersSnapshot(orders, etag);
        }

        static ActiveOrdersCache empty() {
            return new ActiveOrdersCache(List.of(), "\"empty\"", Instant.EPOCH);
        }

        static ActiveOrdersCache stale() {
            return new ActiveOrdersCache(List.of(), "\"stale\"", Instant.EPOCH);
        }
    }

    public record ActiveOrdersSnapshot(List<PublicOrderView> orders, String etag) {}

    public static class ReportLimitExceededException extends RuntimeException {
        private final int limit;
        private final long total;

        public ReportLimitExceededException(int limit, long total) {
            super("Przekroczono limit " + limit + " rekordow dla raportu (znaleziono " + total + ")");
            this.limit = limit;
            this.total = total;
        }

        public int getLimit() {
            return limit;
        }

        public long getTotal() {
            return total;
        }
    }
}



