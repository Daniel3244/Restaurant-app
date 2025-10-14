package pl.restaurant.restaurantbackend.dto;

import java.util.List;
import pl.restaurant.restaurantbackend.dto.order.OrderDto;

public record OrdersPageResponse(
        List<OrderDto> orders,
        long totalElements,
        int totalPages,
        int page,
        int size
) {}
