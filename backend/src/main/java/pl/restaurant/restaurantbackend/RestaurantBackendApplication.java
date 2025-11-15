package pl.restaurant.restaurantbackend;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.util.StringUtils;
import pl.restaurant.restaurantbackend.model.MenuItem;
import pl.restaurant.restaurantbackend.model.OrderEntity;
import pl.restaurant.restaurantbackend.model.OrderItem;
import pl.restaurant.restaurantbackend.model.UserAccount;
import pl.restaurant.restaurantbackend.repository.MenuItemRepository;
import pl.restaurant.restaurantbackend.repository.OrderItemRepository;
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
			OrderItemRepository orderItemRepository,
			UserAccountRepository userAccountRepository
	) {
		return args -> {
			List<MenuSeed> seeds = List.of(
					new MenuSeed("Lemoniada", "Lemoniada cytrynowa", "Lemonade", "Refreshing lemon drink.", 8.00, "napoje", "/uploads/bb16f6f9-aeb3-4d70-9946-780d2d0c488a.jpg"),
					new MenuSeed("Cola", "Klasyczny napój cola.", "Cola", "Classic cola drink.", 7.00, "napoje", "/uploads/5ff3cd3e-2718-43c1-9d81-29bcea62189c.jpg"),
					new MenuSeed("Frytki", "Frytki z sola", "Fries", "Salted fries.", 9.00, "dodatki", "/uploads/5644a5c3-e463-4de3-8446-69d97a190daf.jpg"),
					new MenuSeed("Burger Wolowy", "Burger z wolowina", "Beef Burger", "Juicy beef burger.", 19.00, "burgery", "/uploads/b50cdc8f-72aa-44f5-a26f-3819bbb69d8a.jpg"),
					new MenuSeed("Burger Wolowy + Cola + Frytki", "Zestaw Burger Wolowy + Cola + Frytki", "Beef Burger + Cola + Fries", "Combo meal.", 28.00, "zestawy", "/uploads/67a278a2-b730-4105-832b-b420b92a21d1.jpg"),
					new MenuSeed("Wrap Kurczak", "Wrap z kurczakiem", "Chicken Wrap", "Wrap filled with chicken.", 17.00, "wrapy", "/uploads/74559695-ab8c-4db0-a7da-c3b4004f0dfb.jpg"),
					new MenuSeed("Sos do frytek", "Sos do frytek", "Fries Dip", "Dip served with fries.", 2.00, "dodatki", "/uploads/999c4842-2f56-4c4d-a73c-3ec4e08f19c5.jpg"),
					new MenuSeed("Burger BBQ", "Burger BBQ", "BBQ Burger", "Burger with BBQ sauce.", 21.00, "burgery", "/uploads/59183c1b-4c61-4e70-a70d-2591b55ba491.jpg"),
					new MenuSeed("Burger Vege", "Burger vege", "Veggie Burger", "Plant-based burger.", 18.00, "burgery", "/uploads/312b0359-85a3-4605-99cf-c83a6af55799.jpg"),
					new MenuSeed("Wrap Vege", "Wrap vege", "Veggie Wrap", "Wrap with veggie filling.", 16.00, "wrapy", "/uploads/d714437d-5f38-4356-bf2f-31c6113cd15b.jpg"),
					new MenuSeed("Wrap + Lemon Drink + Frytki", "Wrap + Lemon Drink + Frytki zestaw", "Wrap + Lemon Drink + Fries", "Wrap combo with drink and fries.", 27.00, "zestawy", "/uploads/06fce736-28e0-4fd9-9881-34d3cce13b3f.jpg"),
					new MenuSeed("Lemon Drink", "Orzeźwiający napój cytrynowy.", "Lemon Drink", "Lemon-flavoured soda.", 7.00, "napoje", "/uploads/14ec6d21-3f2e-45b7-80e2-4374cae71b4c.jpg"),
					new MenuSeed("Woda", "", "Water", "Still water.", 5.00, "napoje", "/uploads/13b31389-726b-428a-a8c3-a913c822a9af.jpg")
			);

			if (menuItemRepository.count() == 0) {
				for (MenuSeed seed : seeds) {
					MenuItem item = new MenuItem();
					item.setName(seed.namePl());
					item.setDescription(seed.descriptionPl());
					item.setNameEn(seed.nameEn());
					item.setDescriptionEn(seed.descriptionEn());
					item.setPrice(seed.price());
					item.setCategory(seed.category());
					item.setImageUrl(seed.imageUrl());
					item.setActive(true);
					menuItemRepository.save(item);
				}
			}

			ensureEnglishMenuFields(menuItemRepository, seeds);
			ensureOrderItemsEnglishFields(menuItemRepository, orderItemRepository);

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

	private static void ensureEnglishMenuFields(MenuItemRepository menuItemRepository, List<MenuSeed> seeds) {
		Map<String, MenuSeed> lookup = seeds.stream()
				.collect(Collectors.toMap(seed -> normalize(seed.namePl()), Function.identity(), (existing, ignored) -> existing));

		List<MenuItem> toUpdate = new ArrayList<>();
		for (MenuItem item : menuItemRepository.findAll()) {
			MenuSeed match = lookup.get(normalize(item.getName()));
			boolean changed = false;

			String fallbackNameEn = match != null && StringUtils.hasText(match.nameEn())
					? match.nameEn()
					: item.getName();
			if (!StringUtils.hasText(item.getNameEn()) && StringUtils.hasText(fallbackNameEn)) {
				item.setNameEn(fallbackNameEn);
				changed = true;
			}

			String fallbackDescriptionEn = match != null && StringUtils.hasText(match.descriptionEn())
					? match.descriptionEn()
					: item.getDescription();
			if (!StringUtils.hasText(item.getDescriptionEn()) && StringUtils.hasText(fallbackDescriptionEn)) {
				item.setDescriptionEn(fallbackDescriptionEn);
				changed = true;
			}

			if (changed) {
				toUpdate.add(item);
			}
		}
		if (!toUpdate.isEmpty()) {
			menuItemRepository.saveAll(toUpdate);
		}
	}

	private static void ensureOrderItemsEnglishFields(
			MenuItemRepository menuItemRepository,
			OrderItemRepository orderItemRepository
	) {
		List<MenuItem> menuItems = menuItemRepository.findAll();
		Map<Long, MenuItem> menuById = menuItems.stream()
				.filter(item -> item.getId() != null)
				.collect(Collectors.toMap(MenuItem::getId, Function.identity(), (existing, ignored) -> existing));

		List<OrderItem> toUpdate = new ArrayList<>();
		for (OrderItem orderItem : orderItemRepository.findAll()) {
			if (StringUtils.hasText(orderItem.getNameEn())) {
				continue;
			}
			MenuItem source = orderItem.getMenuItemId() != null ? menuById.get(orderItem.getMenuItemId()) : null;
			String fallback = source != null && StringUtils.hasText(source.getNameEn())
					? source.getNameEn()
					: orderItem.getName();
			if (StringUtils.hasText(fallback)) {
				orderItem.setNameEn(fallback);
				toUpdate.add(orderItem);
			}
		}
		if (!toUpdate.isEmpty()) {
			orderItemRepository.saveAll(toUpdate);
		}
	}

	private static String normalize(String value) {
		if (!StringUtils.hasText(value)) {
			return "";
		}
		return Normalizer.normalize(value, Normalizer.Form.NFD)
				.replaceAll("\\p{M}+", "")
				.toLowerCase(Locale.ROOT)
				.trim();
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
			item.setNameEn(menuItem.getNameEn());
			item.setPrice(menuItem.getPrice());
		}
		item.setQuantity(quantity);
		return item;
	}

	private record MenuSeed(
			String namePl,
			String descriptionPl,
			String nameEn,
			String descriptionEn,
			double price,
			String category,
			String imageUrl
	) {}
}
