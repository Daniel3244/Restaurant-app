package pl.restaurant.restaurantbackend.controller;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.restaurant.restaurantbackend.dto.PublicOrderView;
import pl.restaurant.restaurantbackend.service.OrderService;

@RestController
@RequestMapping("/api/public/orders")
public class PublicOrderController {
    private final OrderService orderService;

    public PublicOrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping("/active")
    public ResponseEntity<List<PublicOrderView>> getActiveOrders(HttpServletRequest request) {
        OrderService.ActiveOrdersSnapshot snapshot = orderService.getActiveOrdersSnapshot();
        String currentEtag = snapshot.etag();
        String ifNoneMatch = request.getHeader(HttpHeaders.IF_NONE_MATCH);
        if (currentEtag != null && currentEtag.equals(ifNoneMatch)) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED)
                    .eTag(currentEtag)
                    .build();
        }
        return ResponseEntity.ok()
                .eTag(currentEtag)
                .body(snapshot.orders());
    }
}
