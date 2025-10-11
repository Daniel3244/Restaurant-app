package pl.restaurant.restaurantbackend.service;

import java.time.Instant;
import java.util.Optional;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.restaurant.restaurantbackend.model.UserAccount;
import pl.restaurant.restaurantbackend.repository.UserAccountRepository;

@Service
public class AuthService {
    private final UserAccountRepository userAccountRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final JwtService jwtService;

    public AuthService(UserAccountRepository userAccountRepository, JwtService jwtService) {
        this.userAccountRepository = userAccountRepository;
        this.jwtService = jwtService;
    }

    @Transactional(readOnly = true)
    public Optional<AuthSession> authenticate(String username, String rawPassword) {
        return userAccountRepository.findByUsernameIgnoreCase(username)
                .filter(user -> passwordEncoder.matches(rawPassword, user.getPasswordHash()))
                .map(user -> {
                    String token = jwtService.generateToken(user.getUsername(), user.getRole());
                    return jwtService.parseToken(token)
                            .map(payload -> new AuthSession(token, payload.username(), payload.role(), payload.expiresAt()))
                            .orElseThrow();
                });
    }

    public Optional<AuthSession> validateToken(String token) {
        return jwtService.parseToken(token)
                .map(payload -> new AuthSession(token, payload.username(), payload.role(), payload.expiresAt()));
    }

    public void invalidateToken(String token) {
        // JWT jest bezstanowy, wiec wystarczy usunac token po stronie klienta
    }

    @Transactional
    public void changePassword(String username, String currentPassword, String newPassword) {
        if (newPassword == null || newPassword.trim().length() < 6) {
            throw new IllegalArgumentException("Haslo musi miec co najmniej 6 znakow");
        }
        UserAccount user = userAccountRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new IllegalArgumentException("Nie znaleziono uzytkownika"));
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("Bledne haslo");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword.trim()));
        userAccountRepository.save(user);
    }

    public record AuthSession(String token, String username, String role, Instant expiresAt) {}
}


