package pl.restaurant.restaurantbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pl.restaurant.restaurantbackend.model.OrderStatusChange;

// Repository
public interface OrderStatusChangeRepository extends JpaRepository<OrderStatusChange, Long> {
	// Methods
}
