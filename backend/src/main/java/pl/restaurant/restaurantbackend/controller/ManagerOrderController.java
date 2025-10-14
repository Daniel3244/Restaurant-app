package pl.restaurant.restaurantbackend.controller;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pl.restaurant.restaurantbackend.dto.OrderSearchCriteria;
import pl.restaurant.restaurantbackend.dto.OrdersPageResponse;
import pl.restaurant.restaurantbackend.dto.order.OrderDto;
import pl.restaurant.restaurantbackend.dto.order.mapper.OrderMapper;
import pl.restaurant.restaurantbackend.model.OrderEntity;
import pl.restaurant.restaurantbackend.service.OrderService;

@RestController
@RequestMapping("/api/manager/orders")
public class ManagerOrderController {
    private static final int DEFAULT_PAGE_SIZE = 50;
    private static final int MAX_PAGE_SIZE = 500;

    private final OrderService orderService;

    @Autowired
    public ManagerOrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public OrdersPageResponse getOrders(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String timeFrom,
            @RequestParam(required = false) String timeTo,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size
    ) {
        int normalizedPage = Math.max(page, 0);
        int normalizedSize = Math.max(1, Math.min(size, MAX_PAGE_SIZE));
        Pageable pageable = PageRequest.of(normalizedPage, normalizedSize);

        OrderSearchCriteria criteria = toCriteria(dateFrom, dateTo, timeFrom, timeTo, status, type);
        Page<OrderDto> results = orderService.findOrders(criteria, pageable).map(OrderMapper::toDto);
        return new OrdersPageResponse(
                results.getContent(),
                results.getTotalElements(),
                results.getTotalPages(),
                results.getNumber(),
                results.getSize()
        );
    }

    @GetMapping("/report")
    public ResponseEntity<byte[]> getOrdersReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String timeFrom,
            @RequestParam(required = false) String timeTo,
            @RequestParam(defaultValue = "orders") String reportType,
            @RequestParam(defaultValue = "pdf") String format
    ) throws Exception {
        OrderSearchCriteria criteria = toCriteria(dateFrom, dateTo, timeFrom, timeTo, null, null);
        List<OrderEntity> filtered = orderService.findOrders(criteria);

        boolean stats = "stats".equalsIgnoreCase(reportType);
        boolean csv = "csv".equalsIgnoreCase(format);
        String dateFromStr = dateFrom != null ? dateFrom.toString() : "";
        String dateToStr = dateTo != null ? dateTo.toString() : "";

        if (csv) {
            String filename = stats ? "statystyki.csv" : "zamowienia.csv";
            String csvContent = stats
                    ? orderService.generateStatsCsv(filtered, dateFromStr, dateToStr, timeFrom, timeTo)
                    : orderService.generateOrdersCsv(filtered, dateFromStr, dateToStr, timeFrom, timeTo);
            byte[] data = csvContent.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            MediaType csvType = new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                    .contentType(csvType)
                    .body(data);
        }

        String title = stats ? "Statystyki zamowien" : "Raport zamowien";
        byte[] pdf = stats
                ? orderService.generateStatsReport(filtered, title, dateFromStr, dateToStr, timeFrom, timeTo)
                : orderService.generateOrdersReport(filtered, title, dateFromStr, dateToStr, timeFrom, timeTo);
        String filename = stats ? "statystyki.pdf" : "zamowienia.pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    private OrderSearchCriteria toCriteria(
            LocalDate dateFrom,
            LocalDate dateTo,
            String timeFrom,
            String timeTo,
            String status,
            String type
    ) {
        OrderSearchCriteria.Builder builder = OrderSearchCriteria.builder();
        if (dateFrom != null) {
            builder.dateFrom(dateFrom);
        }
        if (dateTo != null) {
            builder.dateTo(dateTo);
        }
        parseTime(timeFrom).ifPresent(builder::timeFrom);
        parseTime(timeTo).ifPresent(builder::timeTo);
        if (status != null && !status.isBlank()) {
            builder.status(status);
        }
        if (type != null && !type.isBlank()) {
            builder.type(type);
        }
        return builder.build();
    }

    private Optional<LocalTime> parseTime(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(LocalTime.parse(value));
        } catch (DateTimeParseException ex) {
            return Optional.empty();
        }
    }
}
