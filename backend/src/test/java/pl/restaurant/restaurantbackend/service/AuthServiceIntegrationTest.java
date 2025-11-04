package pl.restaurant.restaurantbackend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import pl.restaurant.restaurantbackend.model.UserAccount;
import pl.restaurant.restaurantbackend.repository.UserAccountRepository;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AuthServiceIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserAccountRepository userAccountRepository;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    @BeforeEach
    void setUp() {
        userAccountRepository.deleteAll();
    }

    @Test
    void authenticate_returnsSessionForValidCredentials() {
        String username = "manager-" + System.nanoTime();
        UserAccount user = new UserAccount();
        user.setUsername(username);
        user.setPasswordHash(encoder.encode("manager123"));
        user.setRole("manager");
        userAccountRepository.save(user);

        Optional<AuthService.AuthSession> session = authService.authenticate(username, "manager123");

        assertThat(session).isPresent();
        AuthService.AuthSession authSession = session.orElseThrow();
        assertThat(authSession.role()).isEqualTo("manager");
        assertThat(authSession.token()).isNotBlank();
        assertThat(authSession.expiresAt()).isAfter(java.time.Instant.now());
    }

    @Test
    void changePassword_rejectsInvalidCurrentPassword() {
        String username = "employee-" + System.nanoTime();
        UserAccount user = new UserAccount();
        user.setUsername(username);
        user.setPasswordHash(encoder.encode("employee123"));
        user.setRole("employee");
        userAccountRepository.save(user);

        assertThatThrownBy(() -> authService.changePassword(username, "wrong-pass", "newpass"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Bledne haslo");
    }

    @Test
    void changePassword_updatesStoredHash() {
        String username = "employee-" + System.nanoTime();
        UserAccount user = new UserAccount();
        user.setUsername(username);
        user.setPasswordHash(encoder.encode("employee123"));
        user.setRole("employee");
        userAccountRepository.save(user);

        authService.changePassword(username, "employee123", "newStrongPass");

        UserAccount updated = userAccountRepository.findByUsernameIgnoreCase(username).orElseThrow();
        assertThat(encoder.matches("newStrongPass", updated.getPasswordHash())).isTrue();
    }
}
