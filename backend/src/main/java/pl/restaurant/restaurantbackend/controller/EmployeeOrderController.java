// EmployeeOrderController.java
// REST controller for employee order operations (list, status change, cancel)
// Handles order cancellation by setting status to 'Anulowane' instead of deleting.
package pl.restaurant.restaurantbackend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.restaurant.restaurantbackend.model.OrderEntity;
import pl.restaurant.restaurantbackend.repository.OrderRepository;
import pl.restaurant.restaurantbackend.service.OrderService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "http://localhost:5173")
public class EmployeeOrderController {
    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private OrderService orderService;

    @GetMapping
    public List<OrderEntity> getAllOrders() {
        return orderRepository.findAll();
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<OrderEntity> updateOrderStatus(@PathVariable Long id, @RequestBody Map<String, String> request) {
        String status = request.get("status");
        if (status == null) {
            return ResponseEntity.badRequest().build();
        }
        try {
            orderService.changeOrderStatus(id, status);
            return orderRepository.findById(id)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancelOrder(@PathVariable Long id) {
        if (orderRepository.existsById(id)) {
            orderService.changeOrderStatus(id, "Anulowane");
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
