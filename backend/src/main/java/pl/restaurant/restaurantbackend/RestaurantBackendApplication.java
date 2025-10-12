package pl.restaurant.restaurantbackend;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import pl.restaurant.restaurantbackend.model.MenuItem;
import pl.restaurant.restaurantbackend.model.OrderEntity;
import pl.restaurant.restaurantbackend.model.OrderItem;
import pl.restaurant.restaurantbackend.model.UserAccount;
import pl.restaurant.restaurantbackend.repository.MenuItemRepository;
import pl.restaurant.restaurantbackend.repository.OrderRepository;
import pl.restaurant.restaurantbackend.repository.UserAccountRepository;

@SpringBootApplication
public class RestaurantBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(RestaurantBackendApplication.class, args);
	}

	@Bean
	public CommandLineRunner seedData(
			MenuItemRepository menuItemRepository,
			OrderRepository orderRepository,
			UserAccountRepository userAccountRepository
	) {
		return args -> {
			if (menuItemRepository.count() == 0) {
				MenuItem burger = new MenuItem();
				burger.setName("Burger Klasyczny");
				burger.setDescription("Wolowina, salata, pomidor, ogorek, sos");
				burger.setPrice(22.99);
				burger.setCategory("burgery");
				burger.setImageUrl("/img/burgery.jpg");
				menuItemRepository.save(burger);

				MenuItem wrap = new MenuItem();
				wrap.setName("Wrap Kurczak");
				wrap.setDescription("Kurczak, warzywa, sos czosnkowy");
				wrap.setPrice(18.50);
				wrap.setCategory("wrapy");
				wrap.setImageUrl("/img/wrapy.jpg");
				menuItemRepository.save(wrap);

				MenuItem fries = new MenuItem();
				fries.setName("Frytki");
				fries.setDescription("Porcja frytek");
				fries.setPrice(7.00);
				fries.setCategory("dodatki");
				fries.setImageUrl("/img/dodatki.jpg");
				menuItemRepository.save(fries);
			}

			if (orderRepository.count() == 0) {
				List<MenuItem> menu = menuItemRepository.findAll();
				MenuItem burger = menu.stream().filter(m -> m.getName().contains("Burger")).findFirst().orElse(null);
				MenuItem wrap = menu.stream().filter(m -> m.getName().contains("Wrap")).findFirst().orElse(null);
				MenuItem fries = menu.stream().filter(m -> m.getName().contains("Frytki")).findFirst().orElse(null);

				List<OrderEntity> orders = new ArrayList<>();
				orders.add(createOrder(1L, LocalDateTime.now().minusDays(5), "na miejscu", "Zrealizowane", List.of(
						createOrderItem(burger, 2), createOrderItem(fries, 1))));
				orders.add(createOrder(2L, LocalDateTime.now().minusDays(3), "na wynos", "Gotowe", List.of(
						createOrderItem(wrap, 1), createOrderItem(fries, 2))));
				orders.add(createOrder(3L, LocalDateTime.now().minusDays(1), "na miejscu", "W realizacji", List.of(
						createOrderItem(burger, 1), createOrderItem(wrap, 1))));
				orders.add(createOrder(4L, LocalDateTime.now(), "na wynos", "W realizacji", List.of(
						createOrderItem(fries, 3))));
				orders.add(createOrder(5L, LocalDateTime.now().minusDays(2), "na miejscu", "Zrealizowane", List.of(
						createOrderItem(wrap, 2))));
				for (OrderEntity order : orders) {
					orderRepository.save(order);
				}
			}

			if (userAccountRepository.count() == 0) {
				BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

				UserAccount manager = new UserAccount();
				manager.setUsername("manager");
				manager.setPasswordHash(encoder.encode("manager123"));
				manager.setRole("manager");
				userAccountRepository.save(manager);

				UserAccount employee = new UserAccount();
				employee.setUsername("employee");
				employee.setPasswordHash(encoder.encode("employee123"));
				employee.setRole("employee");
				userAccountRepository.save(employee);
			}
		};
	}

	private static OrderEntity createOrder(Long orderNumber, LocalDateTime date, String type, String status, List<OrderItem> items) {
		OrderEntity order = new OrderEntity();
		order.setOrderNumber(orderNumber);
		order.setOrderDate(date.toLocalDate());
		order.setCreatedAt(date);
		order.setType(type);
		order.setStatus(status);
		order.setItems(items);
		return order;
	}

	private static OrderItem createOrderItem(MenuItem menuItem, int quantity) {
		OrderItem item = new OrderItem();
		if (menuItem != null) {
			item.setMenuItemId(menuItem.getId());
			item.setName(menuItem.getName());
			item.setPrice(menuItem.getPrice());
		}
		item.setQuantity(quantity);
		return item;
	}
}
