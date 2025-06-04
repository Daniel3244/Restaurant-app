package pl.restaurant.restaurantbackend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.restaurant.restaurantbackend.model.OrderEntity;
import pl.restaurant.restaurantbackend.repository.OrderRepository;

import java.time.LocalDateTime;

@Service
public class OrderService {
    @Autowired
    private OrderRepository orderRepository;

    @Transactional
    public OrderEntity createOrder(OrderEntity order) {
        Long lastNumber = 1L;
        OrderEntity lastOrder = orderRepository.findTopByOrderByOrderNumberDesc();
        if (lastOrder != null) {
            lastNumber = lastOrder.getOrderNumber() + 1;
        }
        order.setOrderNumber(lastNumber);
        order.setCreatedAt(LocalDateTime.now());
        order.setStatus("Nowe");
        return orderRepository.save(order);
    }
}
