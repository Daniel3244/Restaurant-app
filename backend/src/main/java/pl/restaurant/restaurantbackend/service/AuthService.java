package pl.restaurant.restaurantbackend.service;

import java.time.Instant;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.restaurant.restaurantbackend.model.UserAccount;
import pl.restaurant.restaurantbackend.repository.UserAccountRepository;

@Service
public class AuthService {
    private final UserAccountRepository userAccountRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final Map<String, AuthSession> activeSessions = new ConcurrentHashMap<>();
    private static final Duration SESSION_TTL = Duration.ofHours(8);

    public AuthService(UserAccountRepository userAccountRepository) {
        this.userAccountRepository = userAccountRepository;
    }

    @Transactional(readOnly = true)
    public Optional<AuthSession> authenticate(String username, String rawPassword) {
        return userAccountRepository.findByUsernameIgnoreCase(username)
                .filter(user -> passwordEncoder.matches(rawPassword, user.getPasswordHash()))
                .map(user -> {
                    cleanupExpiredSessions();
                    String token = UUID.randomUUID().toString();
                    AuthSession session = new AuthSession(token, user.getUsername(), user.getRole(), Instant.now());
                    activeSessions.put(token, session);
                    return session;
                });
    }

    public Optional<AuthSession> validateToken(String token) {
        cleanupExpiredSessions();
        AuthSession session = activeSessions.get(token);
        if (session == null) {
            return Optional.empty();
        }
        if (session.issuedAt().plus(SESSION_TTL).isBefore(Instant.now())) {
            activeSessions.remove(token);
            return Optional.empty();
        }
        return Optional.of(session);
    }

    public void invalidateToken(String token) {
        activeSessions.remove(token);
    }

    private void cleanupExpiredSessions() {
        Instant now = Instant.now();
        activeSessions.values().removeIf(session -> session.issuedAt().plus(SESSION_TTL).isBefore(now));
    }

    public record AuthSession(String token, String username, String role, Instant issuedAt) {}
}
