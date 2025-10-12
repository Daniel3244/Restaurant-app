package pl.restaurant.restaurantbackend.service;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
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
import pl.restaurant.restaurantbackend.dto.CreateOrderRequest;
import pl.restaurant.restaurantbackend.dto.OrderSearchCriteria;
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
    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderStatusChangeRepository orderStatusChangeRepository;

    @Autowired
    private MenuItemRepository menuItemRepository;

    @Autowired
    private DailyOrderCounterRepository dailyOrderCounterRepository;

    @Transactional
    public OrderEntity createOrder(CreateOrderRequest request) {
        if (request == null || request.items() == null || request.items().isEmpty()) {
            throw new IllegalArgumentException("Zamowienie musi zawierac przynajmniej jedna pozycje.");
        }

        LocalDate today = LocalDate.now();
        DailyOrderCounter counter = dailyOrderCounterRepository.findByOrderDate(today)
                .orElseGet(() -> dailyOrderCounterRepository.saveAndFlush(new DailyOrderCounter(today, 0L)));
        Long todayNumber = counter.nextValue();
        dailyOrderCounterRepository.save(counter);

        List<OrderItem> orderItems = new ArrayList<>();
        for (CreateOrderRequest.Item itemRequest : request.items()) {
            if (itemRequest == null || itemRequest.menuItemId() == null) {
                throw new IllegalArgumentException("Brak identyfikatora pozycji menu.");
            }
            MenuItem menuItem = menuItemRepository.findById(itemRequest.menuItemId())
                    .orElseThrow(() -> new IllegalArgumentException("Pozycja menu nie istnieje."));
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
        return orderRepository.save(order);
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
        InputStream reportStream = new ClassPathResource("orders_report.jrxml").getInputStream();
        JasperReport jasperReport = JasperCompileManager.compileReport(reportStream);
        Map<String, Object> params = new HashMap<>();
        params.put("REPORT_TITLE", title);
        params.put("REPORT_DATE_FROM", dateFrom);
        params.put("REPORT_DATE_TO", dateTo);
        if (orders == null || orders.isEmpty()) {
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params, new JREmptyDataSource());
            return JasperExportManager.exportReportToPdf(jasperPrint);
        }
        List<Map<String, Object>> data = orders.stream().map(o -> {
            Map<String, Object> m = new HashMap<>();
            m.put("orderNumber", o.getOrderNumber());
            m.put("createdAt", o.getCreatedAt() != null ? o.getCreatedAt().toString().replace("T", " ").substring(0, 19) : "");
            m.put("type", o.getType());
            m.put("status", o.getStatus());
            m.put("items", o.getItems().stream()
                .map(i -> i.getName() + " x " + i.getQuantity() + " (" + String.format("%.2f zł", i.getPrice()) + ")")
                .collect(Collectors.joining(", ")));
            double sum = o.getItems().stream().mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
            m.put("orderSum", String.format("%.2f zł", sum));
            if (o.getCreatedAt() != null && o.getFinishedAt() != null) {
                long seconds = java.time.Duration.between(o.getCreatedAt(), o.getFinishedAt()).getSeconds();
                long min = seconds / 60;
                long sec = seconds % 60;
                m.put("readyToDone", String.format("%d min %02d s", min, sec));
            } else {
                m.put("readyToDone", "-");
            }
            return m;
        }).collect(Collectors.toList());
        double totalSum = orders.stream().flatMap(o -> o.getItems().stream()).mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
        List<Long> allSeconds = orders.stream()
            .filter(o -> o.getCreatedAt() != null && o.getFinishedAt() != null)
            .map(o -> java.time.Duration.between(o.getCreatedAt(), o.getFinishedAt()).getSeconds())
            .collect(Collectors.toList());
        double avgSec = allSeconds.isEmpty() ? 0 : allSeconds.stream().mapToLong(Long::longValue).average().orElse(0);
        long avgMin = (long) (avgSec / 60);
        long avgRemSec = (long) (avgSec % 60);
        params.put("REPORT_TOTAL_SUM", String.format("%.2f zł", totalSum));
        params.put("REPORT_AVG_TIME", allSeconds.isEmpty() ? "-" : String.format("%d min %02d s", avgMin, avgRemSec));
        JRBeanCollectionDataSource ds = new JRBeanCollectionDataSource(data, false);
        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params, ds);
        return JasperExportManager.exportReportToPdf(jasperPrint);
    }

    public byte[] generateOrdersReport(List<OrderEntity> orders, String title, String dateFrom, String dateTo, String timeFrom, String timeTo) throws Exception {
        InputStream reportStream = new ClassPathResource("orders_report.jrxml").getInputStream();
        JasperReport jasperReport = JasperCompileManager.compileReport(reportStream);
        Map<String, Object> params = new HashMap<>();
        params.put("REPORT_TITLE", title);
        params.put("REPORT_DATE_FROM", dateFrom);
        params.put("REPORT_DATE_TO", dateTo);
        if (orders == null || orders.isEmpty()) {
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params, new JREmptyDataSource());
            return JasperExportManager.exportReportToPdf(jasperPrint);
        }
        List<Map<String, Object>> data = orders.stream().map(o -> {
            Map<String, Object> m = new HashMap<>();
            m.put("orderNumber", o.getOrderNumber());
            if (o.getCreatedAt() != null) {
                m.put("createdAt", o.getCreatedAt().toString().replace("T", " ").substring(0, 19));
                m.put("createdDate", o.getCreatedAt().toLocalDate().toString());
                m.put("createdTime", o.getCreatedAt().toLocalTime().toString().substring(0,5));
            } else {
                m.put("createdAt", "");
                m.put("createdDate", "");
                m.put("createdTime", "");
            }
            m.put("type", o.getType());
            m.put("status", o.getStatus());
            m.put("items", o.getItems().stream()
                .map(i -> i.getName() + " x " + i.getQuantity() + " (" + String.format("%.2f zł", i.getPrice()) + ")")
                .collect(Collectors.joining(", ")));
            double sum = o.getItems().stream().mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
            m.put("orderSum", String.format("%.2f zł", sum));
            if (o.getCreatedAt() != null && o.getFinishedAt() != null) {
                long seconds = java.time.Duration.between(o.getCreatedAt(), o.getFinishedAt()).getSeconds();
                long min = seconds / 60;
                long sec = seconds % 60;
                m.put("readyToDone", String.format("%d min %02d s", min, sec));
            } else {
                m.put("readyToDone", "-");
            }
            return m;
        }).collect(Collectors.toList());
        JRBeanCollectionDataSource ds = new JRBeanCollectionDataSource(data, false);
        double totalSum = orders.stream().flatMap(o -> o.getItems().stream()).mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
        List<Long> allSeconds = orders.stream()
            .filter(o -> o.getCreatedAt() != null && o.getFinishedAt() != null)
            .map(o -> java.time.Duration.between(o.getCreatedAt(), o.getFinishedAt()).getSeconds())
            .collect(Collectors.toList());
        double avgSec = allSeconds.isEmpty() ? 0 : allSeconds.stream().mapToLong(Long::longValue).average().orElse(0);
        long avgMin = (long) (avgSec / 60);
        long avgRemSec = (long) (avgSec % 60);
        params.put("REPORT_TOTAL_SUM", String.format("%.2f zł", totalSum));
        params.put("REPORT_AVG_TIME", allSeconds.isEmpty() ? "-" : String.format("%d min %02d s", avgMin, avgRemSec));
        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params, ds);
        return JasperExportManager.exportReportToPdf(jasperPrint);
    }

    public byte[] generateStatsReport(List<OrderEntity> orders, String title, String dateFrom, String dateTo) throws Exception {
        InputStream reportStream = new ClassPathResource("orders_stats_report.jrxml").getInputStream();
        JasperReport jasperReport = JasperCompileManager.compileReport(reportStream);
        Map<String, Object> params = new HashMap<>();
        params.put("REPORT_TITLE", title);
        params.put("REPORT_DATE_FROM", dateFrom);
        params.put("REPORT_DATE_TO", dateTo);
        List<Map<String, String>> stats = new ArrayList<>();
        stats.add(Map.of("label", "Liczba zamówień", "value", String.valueOf(orders.size())));
        Map<String, Long> productCount = orders.stream()
                .flatMap(o -> o.getItems().stream())
                .collect(Collectors.groupingBy(i -> i.getName(), Collectors.summingLong(i -> i.getQuantity())));
        Optional<Map.Entry<String, Long>> topProduct = productCount.entrySet().stream().max(Map.Entry.comparingByValue());
        stats.add(Map.of("label", "Najczęściej kupowany produkt", "value", topProduct.map(Map.Entry::getKey).orElse("Brak")));
        double total = orders.stream().flatMap(o -> o.getItems().stream()).mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
        stats.add(Map.of("label", "Suma wartości zamówień", "value", String.format("%.2f zł", total)));
        double avg = orders.isEmpty() ? 0 : total / orders.size();
        stats.add(Map.of("label", "Średnia wartość zamówienia", "value", String.format("%.2f zł", avg)));
        List<Long> allSeconds = orders.stream()
            .filter(o -> o.getCreatedAt() != null && o.getFinishedAt() != null)
            .map(o -> java.time.Duration.between(o.getCreatedAt(), o.getFinishedAt()).getSeconds())
            .collect(Collectors.toList());
        double avgSec = allSeconds.isEmpty() ? 0 : allSeconds.stream().mapToLong(Long::longValue).average().orElse(0);
        long avgMin = (long) (avgSec / 60);
        long avgRemSec = (long) (avgSec % 60);
        stats.add(Map.of("label", "Średni czas obsługi", "value", allSeconds.isEmpty() ? "-" : String.format("%d min %02d s", avgMin, avgRemSec)));
        JRBeanCollectionDataSource ds = new JRBeanCollectionDataSource(stats);
        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params, ds);
        return JasperExportManager.exportReportToPdf(jasperPrint);
    }

    public byte[] generateStatsReport(List<OrderEntity> orders, String title, String dateFrom, String dateTo, String timeFrom, String timeTo) throws Exception {
        InputStream reportStream = new ClassPathResource("orders_stats_report.jrxml").getInputStream();
        JasperReport jasperReport = JasperCompileManager.compileReport(reportStream);
        Map<String, Object> params = new HashMap<>();
        params.put("REPORT_TITLE", title);
        params.put("REPORT_DATE_FROM", dateFrom);
        params.put("REPORT_DATE_TO", dateTo);
        List<OrderEntity> filtered = orders;
        if (timeFrom != null || timeTo != null) {
            filtered = orders.stream().filter(o -> {
                if (o.getCreatedAt() == null) return false;
                String orderTime = o.getCreatedAt().toLocalTime().toString().substring(0,5);
                boolean afterFrom = timeFrom == null || orderTime.compareTo(timeFrom) >= 0;
                boolean beforeTo = timeTo == null || orderTime.compareTo(timeTo) <= 0;
                return afterFrom && beforeTo;
            }).collect(Collectors.toList());
        }
        List<Map<String, String>> stats = new ArrayList<>();
        stats.add(Map.of("label", "Liczba zamówień", "value", String.valueOf(filtered.size())));
        Map<String, Long> productCount = filtered.stream()
                .flatMap(o -> o.getItems().stream())
                .collect(Collectors.groupingBy(i -> i.getName(), Collectors.summingLong(i -> i.getQuantity())));
        Optional<Map.Entry<String, Long>> topProduct = productCount.entrySet().stream().max(Map.Entry.comparingByValue());
        stats.add(Map.of("label", "Najczęściej kupowany produkt", "value", topProduct.map(Map.Entry::getKey).orElse("Brak")));
        double total = filtered.stream().flatMap(o -> o.getItems().stream()).mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
        stats.add(Map.of("label", "Suma wartości zamówień", "value", String.format("%.2f zł", total)));
        double avg = filtered.isEmpty() ? 0 : total / filtered.size();
        stats.add(Map.of("label", "Średnia wartość zamówienia", "value", String.format("%.2f zł", avg)));
        List<Long> allSeconds = filtered.stream()
            .filter(o -> o.getCreatedAt() != null && o.getFinishedAt() != null)
            .map(o -> java.time.Duration.between(o.getCreatedAt(), o.getFinishedAt()).getSeconds())
            .collect(Collectors.toList());
        double avgSec = allSeconds.isEmpty() ? 0 : allSeconds.stream().mapToLong(Long::longValue).average().orElse(0);
        long avgMin = (long) (avgSec / 60);
        long avgRemSec = (long) (avgSec % 60);
        stats.add(Map.of("label", "Średni czas obsługi", "value", allSeconds.isEmpty() ? "-" : String.format("%d min %02d s", avgMin, avgRemSec)));
        JRBeanCollectionDataSource ds = new JRBeanCollectionDataSource(stats);
        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params, ds);
        return JasperExportManager.exportReportToPdf(jasperPrint);
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

    @Transactional
    public void changeOrderStatus(Long orderId, String newStatus) {
        OrderEntity order = orderRepository.findById(orderId).orElseThrow();
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
    }
}
