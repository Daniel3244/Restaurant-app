package pl.restaurant.restaurantbackend.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import pl.restaurant.restaurantbackend.model.OrderEntity;
import pl.restaurant.restaurantbackend.model.OrderItem;

@SpringBootTest
@ActiveProfiles("test")
class OrderServiceReportTest {

    @Autowired
    private OrderService orderService;

    @Test
    void generateOrdersCsv_outputsExpectedRows() {
        List<OrderEntity> orders = List.of(
                order(401, LocalDateTime.of(2025, 11, 4, 12, 10), "W realizacji", "na miejscu",
                        item("Burger", 2, 25.0), item("Frytki", 1, 8.5)),
                order(402, LocalDateTime.of(2025, 11, 4, 12, 25), "Gotowe", "na wynos",
                        item("Kawa", 1, 9.0))
        );

        String csv = orderService.generateOrdersCsv(orders, "2025-11-04", "2025-11-04", "10:00", "14:00");

        String[] lines = csv.split("\n");
        assertThat(lines).hasSize(3);
        assertThat(lines[0]).contains("order_number", "created_date", "items");
        assertThat(lines[1]).contains("401", "Burger x 2", "Frytki x 1", "na miejscu", "W realizacji");
        assertThat(lines[2]).contains("402", "Kawa x 1", "na wynos", "Gotowe");
    }

    @Test
    void generateOrdersReport_containsOrderInformationInPdf() throws Exception {
        List<OrderEntity> orders = List.of(
                order(501, LocalDateTime.of(2025, 11, 4, 10, 0), "Zrealizowane", "na miejscu",
                        item("Latte", 1, 12.0))
        );

        byte[] pdfBytes = orderService.generateOrdersReport(
                orders,
                "Raport testowy",
                "2025-11-04",
                "2025-11-04",
                "09:00",
                "11:00"
        );

        assertContainsText(pdfBytes, List.of("Raport testowy", "501", "Latte", "Zrealizowane"));
    }

    @Test
    void generateStatsReport_containsAggregatedValuesInPdf() throws Exception {
        List<OrderEntity> orders = List.of(
                order(601, LocalDateTime.of(2025, 11, 4, 11, 0), "Zrealizowane", "na miejscu",
                        item("Herbata", 2, 7.0)),
                order(602, LocalDateTime.of(2025, 11, 4, 12, 30), "Gotowe", "na wynos",
                        item("Herbata", 1, 7.0))
        );
        orders.get(0).setFinishedAt(orders.get(0).getCreatedAt().plusMinutes(15));
        orders.get(1).setFinishedAt(orders.get(1).getCreatedAt().plusMinutes(20));

        byte[] pdfBytes = orderService.generateStatsReport(
                orders,
                "Statystyki testowe",
                "2025-11-04",
                "2025-11-04",
                null,
                null
        );

        assertContainsText(pdfBytes, List.of("Statystyki testowe", "Liczba zamowien", "2", "Herbata", "21.00 zl"));
    }

    private OrderItem item(String name, int quantity, double price) {
        OrderItem orderItem = new OrderItem();
        orderItem.setMenuItemId(1L);
        orderItem.setName(name);
        orderItem.setQuantity(quantity);
        orderItem.setPrice(price);
        return orderItem;
    }

    private OrderEntity order(long number, LocalDateTime createdAt, String status, String type, OrderItem... items) {
        OrderEntity order = new OrderEntity();
        order.setOrderNumber(number);
        order.setOrderDate(createdAt.toLocalDate());
        order.setCreatedAt(createdAt);
        order.setStatus(status);
        order.setType(type);
        order.setItems(List.of(items));
        return order;
    }

    private void assertContainsText(byte[] pdfBytes, List<String> expectedStrings) throws IOException {
        assertThat(pdfBytes).isNotEmpty();
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            String text = new PDFTextStripper().getText(document);
            for (String expected : expectedStrings) {
                assertThat(text).contains(expected);
            }
        }
    }
}
