package pl.restaurant.restaurantbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pl.restaurant.restaurantbackend.model.OrderItem;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
}
