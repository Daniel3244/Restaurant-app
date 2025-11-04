package pl.restaurant.restaurantbackend.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import pl.restaurant.restaurantbackend.dto.OrderSearchCriteria;
import pl.restaurant.restaurantbackend.model.OrderEntity;
import pl.restaurant.restaurantbackend.model.OrderItem;
import pl.restaurant.restaurantbackend.repository.specification.OrderSpecifications;

@DataJpaTest(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
@ActiveProfiles("test")
public class OrderSpecificationsTest {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private javax.sql.DataSource dataSource;

    @BeforeEach
    void clean() throws Exception {
        registerTimeAlias();
        orderRepository.deleteAll();
    }

    @DynamicPropertySource
    static void overrideDatasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:h2:mem:orderspec;MODE=MYSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE");
        registry.add("spring.datasource.driver-class-name", () -> "org.h2.Driver");
        registry.add("spring.datasource.username", () -> "sa");
        registry.add("spring.datasource.password", () -> "");
    }

    @Test
    void filtersByDateRange() {
        OrderEntity older = orderRepository.save(order(LocalDate.now().minusDays(3), LocalTime.of(9, 0), "W realizacji", "na miejscu", 101));
        OrderEntity withinRange = orderRepository.save(order(LocalDate.now().minusDays(1), LocalTime.of(10, 30), "W realizacji", "na miejscu", 102));
        orderRepository.save(order(LocalDate.now(), LocalTime.of(11, 0), "Gotowe", "na wynos", 103));

        OrderSearchCriteria criteria = OrderSearchCriteria.builder()
                .dateFrom(LocalDate.now().minusDays(2))
                .dateTo(LocalDate.now().minusDays(1))
                .build();

        Specification<OrderEntity> spec = OrderSpecifications.withCriteria(criteria);
        List<OrderEntity> results = orderRepository.findAll(spec);

        assertThat(results)
                .extracting(OrderEntity::getOrderNumber)
                .containsExactly(withinRange.getOrderNumber())
                .doesNotContain(older.getOrderNumber());
    }

    @Test
    void filtersByStatusAndTypeCaseInsensitive() {
        orderRepository.save(order(LocalDate.now(), LocalTime.of(9, 0), "W realizacji", "na miejscu", 201));
        OrderEntity expected = orderRepository.save(order(LocalDate.now(), LocalTime.of(9, 30), "gotowe", "NA WYNOS", 202));
        orderRepository.save(order(LocalDate.now(), LocalTime.of(10, 0), "Zrealizowane", "na wynos", 203));

        OrderSearchCriteria criteria = OrderSearchCriteria.builder()
                .status("gotowe")
                .type("na wynos")
                .build();

        List<OrderEntity> results = orderRepository.findAll(OrderSpecifications.withCriteria(criteria));

        assertThat(results)
                .singleElement()
                .extracting(OrderEntity::getOrderNumber)
                .isEqualTo(expected.getOrderNumber());
    }

    @Test
    void filtersByTimeRangeUsingCreatedAt() {
        orderRepository.save(order(LocalDate.now(), LocalTime.of(8, 0), "W realizacji", "na miejscu", 301));
        OrderEntity withinRange = orderRepository.save(order(LocalDate.now(), LocalTime.of(12, 15), "W realizacji", "na miejscu", 302));
        orderRepository.save(order(LocalDate.now(), LocalTime.of(15, 45), "W realizacji", "na miejscu", 303));

        OrderSearchCriteria criteria = OrderSearchCriteria.builder()
                .timeFrom(LocalTime.of(12, 0))
                .timeTo(LocalTime.of(13, 0))
                .build();

        List<OrderEntity> results = orderRepository.findAll(OrderSpecifications.withCriteria(criteria));

        assertThat(results)
                .extracting(OrderEntity::getOrderNumber)
                .containsExactly(withinRange.getOrderNumber());
    }

    private OrderEntity order(LocalDate date, LocalTime time, String status, String type, long orderNumber) {
        OrderItem item = new OrderItem();
        item.setMenuItemId(1L);
        item.setName("Test Item");
        item.setPrice(10.0);
        item.setQuantity(1);

        OrderEntity order = new OrderEntity();
        order.setOrderNumber(orderNumber);
        order.setOrderDate(date);
        order.setCreatedAt(LocalDateTime.of(date, time));
        order.setStatus(status);
        order.setType(type);
        order.setItems(List.of(item));
        return order;
    }

    private void registerTimeAlias() throws Exception {
        try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement()) {
            String productName = connection.getMetaData().getDatabaseProductName();
            if (!productName.toLowerCase().contains("h2")) {
                return;
            }
            statement.execute(
                    "CREATE ALIAS IF NOT EXISTS TIME FOR \"" + OrderSpecificationsTest.class.getName() + ".timeOf\""
            );
            try (ResultSet ignored = statement.executeQuery("SELECT TIME(TIMESTAMP '2025-01-01 10:00:00')")) {
                // ensure alias is available
            }
        }
    }

    @SuppressWarnings("unused")
    public static java.sql.Time timeOf(java.sql.Timestamp timestamp) {
        if (timestamp == null) {
            return null;
        }
        return java.sql.Time.valueOf(timestamp.toLocalDateTime().toLocalTime());
    }
}
