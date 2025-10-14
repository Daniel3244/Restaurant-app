package pl.restaurant.restaurantbackend.dto.order;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record OrderDto(
        Long id,
        Long orderNumber,
        LocalDate orderDate,
        LocalDateTime createdAt,
        String type,
        String status,
        LocalDateTime finishedAt,
        List<OrderItemDto> items,
        List<OrderStatusChangeDto> statusHistory
) {}
