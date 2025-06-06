package pl.restaurant.restaurantbackend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.restaurant.restaurantbackend.model.OrderEntity;
import pl.restaurant.restaurantbackend.repository.OrderRepository;
import pl.restaurant.restaurantbackend.service.OrderService;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/manager/orders")
@CrossOrigin(origins = "http://localhost:5173")
public class ManagerOrderController {
    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private OrderService orderService;

    @GetMapping
    public List<OrderEntity> getOrders(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type
    ) {
        List<OrderEntity> all = orderRepository.findAll();
        return all.stream()
                .filter(o -> dateFrom == null || (o.getCreatedAt() != null && !o.getCreatedAt().toLocalDate().isBefore(dateFrom)))
                .filter(o -> dateTo == null || (o.getCreatedAt() != null && !o.getCreatedAt().toLocalDate().isAfter(dateTo)))
                .filter(o -> status == null || status.isEmpty() || o.getStatus().equalsIgnoreCase(status))
                .filter(o -> type == null || type.isEmpty() || o.getType().equalsIgnoreCase(type))
                .collect(Collectors.toList());
    }

    @GetMapping("/report")
    public ResponseEntity<byte[]> getOrdersReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String timeFrom,
            @RequestParam(required = false) String timeTo,
            @RequestParam(defaultValue = "orders") String type
    ) throws Exception {
        List<OrderEntity> all = orderRepository.findAll();
        List<OrderEntity> filtered = all.stream()
                .filter(o -> (dateFrom == null || (o.getCreatedAt() != null && !o.getCreatedAt().toLocalDate().isBefore(dateFrom))))
                .filter(o -> (dateTo == null || (o.getCreatedAt() != null && !o.getCreatedAt().toLocalDate().isAfter(dateTo))))
                .filter(o -> {
                    if (timeFrom == null && timeTo == null) return true;
                    if (o.getCreatedAt() == null) return false;
                    String orderTime = o.getCreatedAt().toLocalTime().toString().substring(0,5);
                    boolean afterFrom = timeFrom == null || orderTime.compareTo(timeFrom) >= 0;
                    boolean beforeTo = timeTo == null || orderTime.compareTo(timeTo) <= 0;
                    return afterFrom && beforeTo;
                })
                .toList();
        String title = type.equals("stats") ? "Statystyki zamówień" : "Raport zamówień";
        String dateFromStr = dateFrom != null ? dateFrom.toString() : "";
        String dateToStr = dateTo != null ? dateTo.toString() : "";
        byte[] pdf = type.equals("stats") ?
            orderService.generateStatsReport(filtered, title, dateFromStr, dateToStr, timeFrom, timeTo) :
            orderService.generateOrdersReport(filtered, title, dateFromStr, dateToStr, timeFrom, timeTo);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + (type.equals("stats") ? "statystyki.pdf" : "zamowienia.pdf"))
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
