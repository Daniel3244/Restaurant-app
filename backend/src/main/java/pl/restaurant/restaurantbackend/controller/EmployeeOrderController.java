package pl.restaurant.restaurantbackend.controller;

import java.time.LocalDate;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pl.restaurant.restaurantbackend.dto.OrderSearchCriteria;
import pl.restaurant.restaurantbackend.dto.OrdersPageResponse;
import pl.restaurant.restaurantbackend.dto.order.OrderDto;
import pl.restaurant.restaurantbackend.dto.order.mapper.OrderMapper;
import pl.restaurant.restaurantbackend.repository.OrderRepository;
import pl.restaurant.restaurantbackend.service.OrderService;

@RestController
@RequestMapping("/api/orders")
public class EmployeeOrderController {
    private static final int DEFAULT_PAGE_SIZE = 100;
    private static final int MAX_PAGE_SIZE = 250;

    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private OrderService orderService;

    @GetMapping
    public OrdersPageResponse getOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "true") boolean todayOnly
    ) {
        int normalizedPage = Math.max(page, 0);
        int normalizedSize = Math.max(1, Math.min(size, MAX_PAGE_SIZE));
        Pageable pageable = PageRequest.of(normalizedPage, normalizedSize);

        OrderSearchCriteria.Builder builder = OrderSearchCriteria.builder();
        if (todayOnly) {
            LocalDate today = LocalDate.now();
            builder.dateFrom(today).dateTo(today);
        }
        if (status != null && !status.isBlank()) {
            builder.status(status);
        }
        if (type != null && !type.isBlank()) {
            builder.type(type);
        }

        Page<OrderDto> results = orderService.findOrders(builder.build(), pageable).map(OrderMapper::toDto);
        return new OrdersPageResponse(
                results.getContent(),
                results.getTotalElements(),
                results.getTotalPages(),
                results.getNumber(),
                results.getSize()
        );
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<OrderDto> updateOrderStatus(@PathVariable Long id, @RequestBody Map<String, String> request) {
        String status = request.get("status");
        if (status == null) {
            return ResponseEntity.badRequest().build();
        }
        try {
            orderService.changeOrderStatus(id, status);
            return orderRepository.findById(id)
                    .map(OrderMapper::toDto)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancelOrder(@PathVariable Long id) {
        if (orderRepository.existsById(id)) {
            orderService.changeOrderStatus(id, "Anulowane");
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
