package pl.restaurant.restaurantbackend.dto;

import java.util.List;
import pl.restaurant.restaurantbackend.model.OrderEntity;

public record OrdersPageResponse(
        List<OrderEntity> orders,
        long totalElements,
        int totalPages,
        int page,
        int size
) {}

