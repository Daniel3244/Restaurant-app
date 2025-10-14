package pl.restaurant.restaurantbackend.dto.order;

import java.time.LocalDateTime;

public record OrderStatusChangeDto(
        Long id,
        String status,
        LocalDateTime changedAt
) {}
