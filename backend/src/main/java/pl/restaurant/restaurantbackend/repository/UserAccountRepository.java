package pl.restaurant.restaurantbackend.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import pl.restaurant.restaurantbackend.model.UserAccount;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {
    Optional<UserAccount> findByUsernameIgnoreCase(String username);
}
