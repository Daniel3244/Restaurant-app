package pl.restaurant.restaurantbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pl.restaurant.restaurantbackend.model.OrderEntity;

import java.time.LocalDateTime;

public interface OrderRepository extends JpaRepository<OrderEntity, Long> {
    // Methods
    OrderEntity findTopByOrderByOrderNumberDesc();
    OrderEntity findTopByCreatedAtBetweenOrderByOrderNumberDesc(LocalDateTime start, LocalDateTime end);
}
