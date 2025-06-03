package pl.restaurant.restaurantbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pl.restaurant.restaurantbackend.model.MenuItem;

public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {
}
