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
				List<MenuSeed> seeds = List.of(
						new MenuSeed("Lemoniada", "Lemoniada cytrynowa", 8.00, "napoje", "/uploads/bb16f6f9-aeb3-4d70-9946-780d2d0c488a.jpg"),
						new MenuSeed("Coca-Cola", "Coca cola mala", 7.00, "napoje", "/uploads/5ff3cd3e-2718-43c1-9d81-29bcea62189c.jpg"),
						new MenuSeed("Frytki", "Frytki z sola", 9.00, "dodatki", "/uploads/5644a5c3-e463-4de3-8446-69d97a190daf.jpg"),
						new MenuSeed("Burger Wolowy", "Burger z wolowina", 19.00, "burgery", "/uploads/b50cdc8f-72aa-44f5-a26f-3819bbb69d8a.jpg"),
						new MenuSeed("Burger Wolowy + Coca-Cola + Frytki", "Zestaw", 28.00, "zestawy", "/uploads/67a278a2-b730-4105-832b-b420b92a21d1.jpg"),
						new MenuSeed("Wrap Kurczak", "Wrap z kurczakiem", 17.00, "wrapy", "/uploads/74559695-ab8c-4db0-a7da-c3b4004f0dfb.jpg"),
						new MenuSeed("Sos do frytek", "Sos do frytek", 2.00, "dodatki", "/uploads/999c4842-2f56-4c4d-a73c-3ec4e08f19c5.jpg"),
						new MenuSeed("Burger BBQ", "Burger BBQ", 21.00, "burgery", "/uploads/59183c1b-4c61-4e70-a70d-2591b55ba491.jpg"),
						new MenuSeed("Burger Vege", "Burger vege", 18.00, "burgery", "/uploads/312b0359-85a3-4605-99cf-c83a6af55799.jpg"),
						new MenuSeed("Wrap Vege", "Wrap vege", 16.00, "wrapy", "/uploads/d714437d-5f38-4356-bf2f-31c6113cd15b.jpg"),
						new MenuSeed("Wrap + Sprite + Frytki", "Wrap + Sprite + Frytki zestaw", 27.00, "zestawy", "/uploads/06fce736-28e0-4fd9-9881-34d3cce13b3f.jpg"),
						new MenuSeed("Sprite", "Sprite", 7.00, "napoje", "/uploads/14ec6d21-3f2e-45b7-80e2-4374cae71b4c.jpg"),
						new MenuSeed("Woda", "", 5.00, "napoje", "/uploads/13b31389-726b-428a-a8c3-a913c822a9af.jpg")
				);

				for (MenuSeed seed : seeds) {
					MenuItem item = new MenuItem();
					item.setName(seed.name());
					item.setDescription(seed.description());
					item.setPrice(seed.price());
					item.setCategory(seed.category());
					item.setImageUrl(seed.imageUrl());
					item.setActive(true);
					menuItemRepository.save(item);
				}
			}

			if (orderRepository.count() == 0) {
				List<MenuItem> menu = menuItemRepository.findAll();
				MenuItem burger = menu.stream().filter(m -> m.getName().contains("Burger")).findFirst().orElse(null);
				MenuItem wrap = menu.stream().filter(m -> m.getName().contains("Wrap")).findFirst().orElse(null);
				MenuItem fries = menu.stream().filter(m -> m.getName().contains("Frytki")).findFirst().orElse(null);

				LocalDateTime now = LocalDateTime.now();
				List<OrderEntity> orders = new ArrayList<>();
				orders.add(createOrder(1L, now.truncatedTo(java.time.temporal.ChronoUnit.MINUTES), "na miejscu", "W realizacji", List.of(
						createOrderItem(burger, 1), createOrderItem(fries, 1))));
				orders.add(createOrder(2L, now.minusMinutes(15), "na wynos", "Gotowe", List.of(
						createOrderItem(wrap, 1), createOrderItem(fries, 2))));
				orders.add(createOrder(3L, now.minusDays(1), "na miejscu", "Zrealizowane", List.of(
						createOrderItem(burger, 2), createOrderItem(fries, 1))));
				orders.add(createOrder(4L, now.minusDays(3), "na wynos", "Anulowane", List.of(
						createOrderItem(wrap, 1))));
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

	private record MenuSeed(String name, String description, double price, String category, String imageUrl) {}
}
