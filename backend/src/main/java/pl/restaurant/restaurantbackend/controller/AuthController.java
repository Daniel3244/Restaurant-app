package pl.restaurant.restaurantbackend.controller;

import java.util.Optional;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.restaurant.restaurantbackend.service.AuthService;
import pl.restaurant.restaurantbackend.service.AuthService.AuthSession;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        return authService.authenticate(request.username(), request.password())
                .map(session -> ResponseEntity.ok(new AuthResponse(
                        session.token(),
                        session.role(),
                        session.expiresAt().toEpochMilli()
                )))
                .orElseGet(() -> ResponseEntity.status(401).build());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(name = "Authorization", required = false) String authorization) {
        if (authorization != null && authorization.startsWith("Bearer ")) {
            String token = authorization.substring("Bearer ".length());
            authService.invalidateToken(token);
        }
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestBody ChangePasswordRequest request
    ) {
        Optional<AuthSession> session = extractSession(authorization);
        if (session.isEmpty()) {
            return ResponseEntity.status(401).body(new ErrorResponse("Brak autoryzacji"));
        }
        try {
            authService.changePassword(session.get().username(), request.currentPassword(), request.newPassword());
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new ErrorResponse(ex.getMessage()));
        }
    }

    private Optional<AuthSession> extractSession(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return Optional.empty();
        }
        String token = authorization.substring("Bearer ".length());
        return authService.validateToken(token);
    }

    public record LoginRequest(String username, String password) {}
    public record AuthResponse(String token, String role, long expiresAt) {}
    public record ChangePasswordRequest(String currentPassword, String newPassword) {}
    public record ErrorResponse(String message) {}
}
