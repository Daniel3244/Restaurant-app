package pl.restaurant.restaurantbackend.dto.order;

public record OrderItemDto(
        Long id,
        String name,
        Integer quantity,
        Double price
) {}
