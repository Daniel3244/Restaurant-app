package pl.restaurant.restaurantbackend.repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import pl.restaurant.restaurantbackend.model.OrderEntity;

public interface OrderRepository extends JpaRepository<OrderEntity, Long>, JpaSpecificationExecutor<OrderEntity> {
    List<OrderEntity> findByOrderDateAndStatusIn(LocalDate orderDate, Collection<String> statuses, Sort sort);
}
