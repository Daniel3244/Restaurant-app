package pl.restaurant.restaurantbackend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import pl.restaurant.restaurantbackend.model.OrderEntity;
import pl.restaurant.restaurantbackend.repository.OrderRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/manager/orders")
@CrossOrigin(origins = "http://localhost:5173")
public class ManagerOrderController {
    @Autowired
    private OrderRepository orderRepository;

    @GetMapping
    public List<OrderEntity> getOrders(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type
    ) {
        List<OrderEntity> all = orderRepository.findAll();
        return all.stream()
                .filter(o -> date == null || (o.getCreatedAt() != null && o.getCreatedAt().toLocalDate().equals(date)))
                .filter(o -> status == null || o.getStatus().equalsIgnoreCase(status))
                .filter(o -> type == null || o.getType().equalsIgnoreCase(type))
                .collect(Collectors.toList());
    }
}
