package pl.restaurant.restaurantbackend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.restaurant.restaurantbackend.service.AuthService;
import pl.restaurant.restaurantbackend.service.AuthService.AuthSession;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
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

    public record LoginRequest(String username, String password) {}
    public record AuthResponse(String token, String role, long expiresAt) {}
}
