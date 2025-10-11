package pl.restaurant.restaurantbackend.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Optional;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import pl.restaurant.restaurantbackend.service.AuthService;
import pl.restaurant.restaurantbackend.service.AuthService.AuthSession;

@Component
public class AuthInterceptor implements HandlerInterceptor {
    private final AuthService authService;

    public AuthInterceptor(AuthService authService) {
        this.authService = authService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String path = request.getRequestURI();
        String method = request.getMethod();

        if ("OPTIONS".equalsIgnoreCase(method)) {
            return true;
        }

        if (path.startsWith("/api/manager")) {
            return verifyRole(response, extractToken(request), "manager");
        }

        if (path.startsWith("/api/orders") && !"POST".equalsIgnoreCase(method) && !"GET".equalsIgnoreCase(method)) {
            // zmiany statusow zamowien sa dostepne dla pracownika i menedzera
            return verifyAnyRole(response, extractToken(request), new String[]{"employee", "manager"});
        }

        return true;
    }

    private boolean verifyRole(HttpServletResponse response, Optional<String> tokenOpt, String requiredRole) throws Exception {
        if (tokenOpt.isEmpty()) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Brak tokenu");
            return false;
        }
        Optional<AuthSession> session = authService.validateToken(tokenOpt.get());
        if (session.isPresent() && requiredRole.equalsIgnoreCase(session.get().role())) {
            return true;
        }
        response.sendError(HttpServletResponse.SC_FORBIDDEN, "Brak uprawnien");
        return false;
    }

    private boolean verifyAnyRole(HttpServletResponse response, Optional<String> tokenOpt, String[] roles) throws Exception {
        if (tokenOpt.isEmpty()) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Brak tokenu");
            return false;
        }
        Optional<AuthSession> session = authService.validateToken(tokenOpt.get());
        if (session.isPresent()) {
            for (String role : roles) {
                if (role.equalsIgnoreCase(session.get().role())) {
                    return true;
                }
            }
        }
        response.sendError(HttpServletResponse.SC_FORBIDDEN, "Brak uprawnien");
        return false;
    }

    private Optional<String> extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return Optional.of(header.substring("Bearer ".length()));
        }
        return Optional.empty();
    }
}



