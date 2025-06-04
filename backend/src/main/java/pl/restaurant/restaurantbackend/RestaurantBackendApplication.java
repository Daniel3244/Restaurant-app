package pl.restaurant.restaurantbackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.beans.factory.annotation.Autowired;
import pl.restaurant.restaurantbackend.model.MenuItem;
import pl.restaurant.restaurantbackend.model.OrderEntity;
import pl.restaurant.restaurantbackend.model.OrderItem;
import pl.restaurant.restaurantbackend.repository.MenuItemRepository;
import pl.restaurant.restaurantbackend.repository.OrderRepository;

import java.time.LocalDateTime;
import java.util.*;

@SpringBootApplication
public class RestaurantBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(RestaurantBackendApplication.class, args);
	}

	@Bean
	public CommandLineRunner seedData(
			@Autowired MenuItemRepository menuItemRepository,
			@Autowired OrderRepository orderRepository
	) {
		return args -> {
			if (menuItemRepository.count() == 0) {
				MenuItem burger = new MenuItem();
				burger.setName("Burger Klasyczny");
				burger.setDescription("Wołowina, sałata, pomidor, ogórek, sos");
				burger.setPrice(22.99);
				burger.setCategory("Burgery");
				burger.setImageUrl("/img/burgery.jpg");
				menuItemRepository.save(burger);

				MenuItem wrap = new MenuItem();
				wrap.setName("Wrap Kurczak");
				wrap.setDescription("Kurczak, warzywa, sos czosnkowy");
				wrap.setPrice(18.50);
				wrap.setCategory("Wrapy");
				wrap.setImageUrl("/img/wrapy.jpg");
				menuItemRepository.save(wrap);

				MenuItem fries = new MenuItem();
				fries.setName("Frytki");
				fries.setDescription("Porcja frytek");
				fries.setPrice(7.00);
				fries.setCategory("Dodatki");
				fries.setImageUrl("/img/dodatki.jpg");
				menuItemRepository.save(fries);
			}

			if (orderRepository.count() == 0) {
				List<MenuItem> menu = menuItemRepository.findAll();
				MenuItem burger = menu.stream().filter(m -> m.getName().contains("Burger")).findFirst().orElse(null);
				MenuItem wrap = menu.stream().filter(m -> m.getName().contains("Wrap")).findFirst().orElse(null);
				MenuItem fries = menu.stream().filter(m -> m.getName().contains("Frytki")).findFirst().orElse(null);

				// Zamówienia z różnymi datami, statusami, typami
				List<OrderEntity> orders = new ArrayList<>();
				orders.add(createOrder(1L, LocalDateTime.now().minusDays(5), "na miejscu", "Zrealizowane", List.of(
						createOrderItem(burger, 2), createOrderItem(fries, 1))));
				orders.add(createOrder(2L, LocalDateTime.now().minusDays(3), "na wynos", "Gotowe", List.of(
						createOrderItem(wrap, 1), createOrderItem(fries, 2))));
				orders.add(createOrder(3L, LocalDateTime.now().minusDays(1), "na miejscu", "W realizacji", List.of(
						createOrderItem(burger, 1), createOrderItem(wrap, 1))));
				orders.add(createOrder(4L, LocalDateTime.now(), "na wynos", "Nowe", List.of(
						createOrderItem(fries, 3))));
				orders.add(createOrder(5L, LocalDateTime.now().minusDays(2), "na miejscu", "Zrealizowane", List.of(
						createOrderItem(wrap, 2))));
				for (OrderEntity o : orders) {
					orderRepository.save(o);
				}
			}
		};
	}

	private static OrderEntity createOrder(Long orderNumber, LocalDateTime date, String type, String status, List<OrderItem> items) {
		OrderEntity order = new OrderEntity();
		order.setOrderNumber(orderNumber);
		order.setCreatedAt(date);
		order.setType(type);
		order.setStatus(status);
		order.setItems(items);
		return order;
	}

	private static OrderItem createOrderItem(MenuItem menuItem, int quantity) {
		OrderItem item = new OrderItem();
		item.setMenuItemId(menuItem.getId());
		item.setName(menuItem.getName());
		item.setPrice(menuItem.getPrice());
		item.setQuantity(quantity);
		return item;
	}
}
