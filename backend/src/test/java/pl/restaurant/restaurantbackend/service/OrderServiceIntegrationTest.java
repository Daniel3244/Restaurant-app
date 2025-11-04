package pl.restaurant.restaurantbackend.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import pl.restaurant.restaurantbackend.dto.CreateOrderRequest;
import pl.restaurant.restaurantbackend.dto.PublicOrderView;
import pl.restaurant.restaurantbackend.model.DailyOrderCounter;
import pl.restaurant.restaurantbackend.model.MenuItem;
import pl.restaurant.restaurantbackend.model.OrderEntity;
import pl.restaurant.restaurantbackend.model.OrderItem;
import pl.restaurant.restaurantbackend.model.OrderStatusChange;
import pl.restaurant.restaurantbackend.repository.DailyOrderCounterRepository;
import pl.restaurant.restaurantbackend.repository.MenuItemRepository;
import pl.restaurant.restaurantbackend.repository.OrderRepository;
import pl.restaurant.restaurantbackend.repository.OrderStatusChangeRepository;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class OrderServiceIntegrationTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private MenuItemRepository menuItemRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private DailyOrderCounterRepository counterRepository;

    @Autowired
    private OrderStatusChangeRepository orderStatusChangeRepository;

    @BeforeEach
    void cleanDatabase() {
        orderStatusChangeRepository.deleteAll();
        orderRepository.deleteAll();
        counterRepository.deleteAll();
        menuItemRepository.deleteAll();
    }

    @Test
    void createOrder_assignsSequentialNumbersAndPersistsItems() {
        MenuItem burger = buildMenuItem("Burger", 25.0);
        MenuItem fries = buildMenuItem("Fries", 8.5);
        burger = menuItemRepository.save(burger);
        fries = menuItemRepository.save(fries);

        CreateOrderRequest firstRequest = new CreateOrderRequest(
                "na wynos",
                List.of(
                        new CreateOrderRequest.Item(burger.getId(), 2),
                        new CreateOrderRequest.Item(fries.getId(), 1)
                )
        );
        CreateOrderRequest secondRequest = new CreateOrderRequest(
                "na miejscu",
                List.of(
                        new CreateOrderRequest.Item(burger.getId(), 1)
                )
        );

        OrderEntity firstOrder = orderService.createOrder(firstRequest);
        OrderEntity secondOrder = orderService.createOrder(secondRequest);

        assertThat(firstOrder.getOrderNumber()).isEqualTo(1L);
        assertThat(secondOrder.getOrderNumber()).isEqualTo(2L);
        assertThat(orderRepository.count()).isEqualTo(2);

        DailyOrderCounter counter = counterRepository.findByOrderDate(LocalDate.now()).orElseThrow();
        assertThat(counter.getLastNumber()).isEqualTo(2L);
    }

    @Test
    void changeOrderStatus_updatesFinishedAtAndHistory() {
        MenuItem soup = menuItemRepository.save(buildMenuItem("Soup", 14.0));
        OrderEntity order = orderService.createOrder(new CreateOrderRequest(
                "na miejscu",
                List.of(new CreateOrderRequest.Item(soup.getId(), 1))
        ));

        orderService.changeOrderStatus(order.getId(), "Zrealizowane");

        OrderEntity updated = orderRepository.findById(order.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo("Zrealizowane");
        assertThat(updated.getFinishedAt()).isNotNull();

        List<OrderStatusChange> history = orderStatusChangeRepository.findAll();
        assertThat(history)
                .anyMatch(change -> change.getOrder().getId().equals(order.getId())
                        && "Zrealizowane".equals(change.getStatus()));
    }

    @Test
    void getActiveOrdersSnapshot_includesOrdersFromPreviousDay() {
        MenuItem coffee = menuItemRepository.save(buildMenuItem("Coffee", 9.0));

        OrderItem item = new OrderItem();
        item.setMenuItemId(coffee.getId());
        item.setName(coffee.getName());
        item.setPrice(coffee.getPrice());
        item.setQuantity(1);

        OrderEntity previousDayOrder = new OrderEntity();
        previousDayOrder.setOrderNumber(42L);
        previousDayOrder.setOrderDate(LocalDate.now().minusDays(1));
        previousDayOrder.setCreatedAt(LocalDateTime.now().minusDays(1));
        previousDayOrder.setType("na miejscu");
        previousDayOrder.setStatus("W realizacji");
        previousDayOrder.setItems(List.of(item));
        orderRepository.save(previousDayOrder);

        OrderService.ActiveOrdersSnapshot snapshot = orderService.getActiveOrdersSnapshot();

        assertThat(snapshot.orders())
                .extracting(PublicOrderView::orderNumber)
                .contains(previousDayOrder.getOrderNumber());
    }

    private MenuItem buildMenuItem(String name, double price) {
        MenuItem item = new MenuItem();
        item.setName(name);
        item.setDescription(name + " description");
        item.setPrice(price);
        item.setCategory("test");
        item.setImageUrl("/img/test.jpg");
        item.setActive(true);
        return item;
    }
}
