package pl.restaurant.restaurantbackend.service;

import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.restaurant.restaurantbackend.model.OrderEntity;
import pl.restaurant.restaurantbackend.repository.OrderRepository;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

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

    public byte[] generateOrdersReport(List<OrderEntity> orders, String title, String dateFrom, String dateTo) throws Exception {
        InputStream reportStream = new ClassPathResource("orders_report.jrxml").getInputStream();
        JasperReport jasperReport = JasperCompileManager.compileReport(reportStream);
        Map<String, Object> params = new HashMap<>();
        params.put("REPORT_TITLE", title);
        params.put("REPORT_DATE_FROM", dateFrom);
        params.put("REPORT_DATE_TO", dateTo);
        if (orders == null || orders.isEmpty()) {
            // Pusta lista – wyświetl sekcję <noData>
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params, new JREmptyDataSource());
            return JasperExportManager.exportReportToPdf(jasperPrint);
        }
        // Zamień listę pozycji na string do PDF
        List<Map<String, Object>> data = orders.stream().map(o -> {
            Map<String, Object> m = new HashMap<>();
            m.put("orderNumber", o.getOrderNumber());
            m.put("createdAt", o.getCreatedAt());
            m.put("type", o.getType());
            m.put("status", o.getStatus());
            // Dodaj ceny do pozycji, np. "Burger x 2 (12.00 zł)"
            m.put("items", o.getItems().stream()
                .map(i -> i.getName() + " x " + i.getQuantity() + " (" + String.format("%.2f zł", i.getPrice()) + ")")
                .collect(Collectors.joining(", ")));
            return m;
        }).collect(Collectors.toList());
        JRBeanCollectionDataSource ds = new JRBeanCollectionDataSource(data, false);
        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params, ds);
        return JasperExportManager.exportReportToPdf(jasperPrint);
    }

    public byte[] generateStatsReport(List<OrderEntity> orders, String title, String dateFrom, String dateTo) throws Exception {
        InputStream reportStream = new ClassPathResource("orders_stats_report.jrxml").getInputStream();
        JasperReport jasperReport = JasperCompileManager.compileReport(reportStream);
        Map<String, Object> params = new HashMap<>();
        params.put("REPORT_TITLE", title);
        params.put("REPORT_DATE_FROM", dateFrom);
        params.put("REPORT_DATE_TO", dateTo);
        List<Map<String, String>> stats = new ArrayList<>();
        // Statystyka: liczba zamówień
        stats.add(Map.of("label", "Liczba zamówień", "value", String.valueOf(orders.size())));
        // Statystyka: najczęściej kupowany produkt
        Map<String, Long> productCount = orders.stream()
                .flatMap(o -> o.getItems().stream())
                .collect(Collectors.groupingBy(i -> i.getName(), Collectors.summingLong(i -> i.getQuantity())));
        Optional<Map.Entry<String, Long>> topProduct = productCount.entrySet().stream().max(Map.Entry.comparingByValue());
        stats.add(Map.of("label", "Najczęściej kupowany produkt", "value", topProduct.map(Map.Entry::getKey).orElse("Brak")));
        // Statystyka: suma wartości zamówień
        double total = orders.stream().flatMap(o -> o.getItems().stream()).mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
        stats.add(Map.of("label", "Suma wartości zamówień", "value", String.format("%.2f zł", total)));
        // Statystyka: średnia wartość zamówienia
        double avg = orders.isEmpty() ? 0 : total / orders.size();
        stats.add(Map.of("label", "Średnia wartość zamówienia", "value", String.format("%.2f zł", avg)));
        JRBeanCollectionDataSource ds = new JRBeanCollectionDataSource(stats);
        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params, ds);
        return JasperExportManager.exportReportToPdf(jasperPrint);
    }
}
