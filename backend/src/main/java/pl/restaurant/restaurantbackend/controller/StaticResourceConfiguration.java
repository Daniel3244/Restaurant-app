package pl.restaurant.restaurantbackend.controller;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import pl.restaurant.restaurantbackend.security.AuthInterceptor;

@Configuration
public class StaticResourceConfiguration implements WebMvcConfigurer {
    private final AuthInterceptor authInterceptor;
    private final String[] allowedOrigins;
    private final boolean allowCredentials;
    private final Path uploadDirectory;

    public StaticResourceConfiguration(
            AuthInterceptor authInterceptor,
            @Value("${app.cors.allowed-origins:http://localhost:5173}") String allowedOriginsProperty,
            @Value("${app.upload.dir:uploads}") String uploadDirProperty
    ) {
        this.authInterceptor = authInterceptor;
        List<String> origins = Arrays.stream(allowedOriginsProperty.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .collect(Collectors.toList());
        if (origins.isEmpty()) {
            origins = List.of("http://localhost:5173");
        }
        if (origins.contains("*")) {
            this.allowedOrigins = new String[]{"*"};
            this.allowCredentials = false;
        } else {
            this.allowedOrigins = origins.toArray(String[]::new);
            this.allowCredentials = true;
        }
        this.uploadDirectory = Paths.get(uploadDirProperty).toAbsolutePath().normalize();
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String uploadLocation = this.uploadDirectory.toUri().toString();
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadLocation);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(allowCredentials);
        registry.addMapping("/uploads/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET")
                .allowedHeaders("*")
                .allowCredentials(allowCredentials);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor);
    }
}
