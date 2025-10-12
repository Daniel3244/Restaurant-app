package pl.restaurant.restaurantbackend.repository;

import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import pl.restaurant.restaurantbackend.model.DailyOrderCounter;

public interface DailyOrderCounterRepository extends JpaRepository<DailyOrderCounter, LocalDate> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<DailyOrderCounter> findByOrderDate(LocalDate orderDate);
}

