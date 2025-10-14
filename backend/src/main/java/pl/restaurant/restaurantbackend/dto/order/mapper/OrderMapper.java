package pl.restaurant.restaurantbackend.dto.order.mapper;

import java.util.List;
import java.util.stream.Collectors;
import pl.restaurant.restaurantbackend.dto.order.OrderDto;
import pl.restaurant.restaurantbackend.dto.order.OrderItemDto;
import pl.restaurant.restaurantbackend.dto.order.OrderStatusChangeDto;
import pl.restaurant.restaurantbackend.model.OrderEntity;
import pl.restaurant.restaurantbackend.model.OrderItem;
import pl.restaurant.restaurantbackend.model.OrderStatusChange;

public final class OrderMapper {
    private OrderMapper() {}

    public static OrderDto toDto(OrderEntity entity) {
        if (entity == null) {
            return null;
        }
        return new OrderDto(
                entity.getId(),
                entity.getOrderNumber(),
                entity.getOrderDate(),
                entity.getCreatedAt(),
                entity.getType(),
                entity.getStatus(),
                entity.getFinishedAt(),
                toItemDtos(entity.getItems()),
                toStatusHistoryDtos(entity.getStatusHistory())
        );
    }

    public static List<OrderDto> toDtoList(List<OrderEntity> entities) {
        if (entities == null) {
            return List.of();
        }
        return entities.stream()
                .map(OrderMapper::toDto)
                .collect(Collectors.toList());
    }

    private static List<OrderItemDto> toItemDtos(List<OrderItem> items) {
        if (items == null) {
            return List.of();
        }
        return items.stream()
                .map(item -> new OrderItemDto(
                        item.getId(),
                        item.getName(),
                        item.getQuantity(),
                        item.getPrice()
                ))
                .collect(Collectors.toList());
    }

    private static List<OrderStatusChangeDto> toStatusHistoryDtos(List<OrderStatusChange> history) {
        if (history == null) {
            return List.of();
        }
        return history.stream()
                .map(change -> new OrderStatusChangeDto(
                        change.getId(),
                        change.getStatus(),
                        change.getChangedAt()
                ))
                .collect(Collectors.toList());
    }
}
