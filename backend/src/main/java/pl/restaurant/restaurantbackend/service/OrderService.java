// OrderService.java
// Service for order business logic: creation, status changes, reporting.
// Handles status change to 'Anulowane' (cancelled) without setting finishedAt.

package pl.restaurant.restaurantbackend.service;

import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.restaurant.restaurantbackend.model.OrderEntity;
import pl.restaurant.restaurantbackend.model.OrderStatusChange;
import pl.restaurant.restaurantbackend.repository.OrderRepository;
import pl.restaurant.restaurantbackend.repository.OrderStatusChangeRepository;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OrderService {
    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderStatusChangeRepository orderStatusChangeRepository;

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
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params, new JREmptyDataSource());
            return JasperExportManager.exportReportToPdf(jasperPrint);
        }
        // Nowe liczenie czasu: zawsze licz od createdAt do finishedAt, z sekundami
        List<Map<String, Object>> data = orders.stream().map(o -> {
            Map<String, Object> m = new HashMap<>();
            m.put("orderNumber", o.getOrderNumber());
            m.put("createdAt", o.getCreatedAt() != null ? o.getCreatedAt().toString().replace("T", " ").substring(0, 19) : "");
            m.put("type", o.getType());
            m.put("status", o.getStatus());
            m.put("items", o.getItems().stream()
                .map(i -> i.getName() + " x " + i.getQuantity() + " (" + String.format("%.2f zł", i.getPrice()) + ")")
                .collect(Collectors.joining(", ")));
            double sum = o.getItems().stream().mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
            m.put("orderSum", String.format("%.2f zł", sum));
            // Licz czas zawsze od createdAt do finishedAt, z sekundami
            if (o.getCreatedAt() != null && o.getFinishedAt() != null) {
                long seconds = java.time.Duration.between(o.getCreatedAt(), o.getFinishedAt()).getSeconds();
                long min = seconds / 60;
                long sec = seconds % 60;
                m.put("readyToDone", String.format("%d min %02d s", min, sec));
            } else {
                m.put("readyToDone", "-");
            }
            return m;
        }).collect(Collectors.toList());
        // Całkowita suma
        double totalSum = orders.stream().flatMap(o -> o.getItems().stream()).mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
        // Średni czas obsługi: licz od createdAt do finishedAt dla wszystkich zamówień, które mają oba pola
        List<Long> allSeconds = orders.stream()
            .filter(o -> o.getCreatedAt() != null && o.getFinishedAt() != null)
            .map(o -> java.time.Duration.between(o.getCreatedAt(), o.getFinishedAt()).getSeconds())
            .collect(Collectors.toList());
        double avgSec = allSeconds.isEmpty() ? 0 : allSeconds.stream().mapToLong(Long::longValue).average().orElse(0);
        long avgMin = (long) (avgSec / 60);
        long avgRemSec = (long) (avgSec % 60);
        params.put("REPORT_TOTAL_SUM", String.format("%.2f zł", totalSum));
        params.put("REPORT_AVG_TIME", allSeconds.isEmpty() ? "-" : String.format("%d min %02d s", avgMin, avgRemSec));
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
        // Statystyka: średni czas obsługi (createdAt -> finishedAt, z sekundami)
        List<Long> allSeconds = orders.stream()
            .filter(o -> o.getCreatedAt() != null && o.getFinishedAt() != null)
            .map(o -> java.time.Duration.between(o.getCreatedAt(), o.getFinishedAt()).getSeconds())
            .collect(Collectors.toList());
        double avgSec = allSeconds.isEmpty() ? 0 : allSeconds.stream().mapToLong(Long::longValue).average().orElse(0);
        long avgMin = (long) (avgSec / 60);
        long avgRemSec = (long) (avgSec % 60);
        stats.add(Map.of("label", "Średni czas obsługi", "value", allSeconds.isEmpty() ? "-" : String.format("%d min %02d s", avgMin, avgRemSec)));
        JRBeanCollectionDataSource ds = new JRBeanCollectionDataSource(stats);
        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params, ds);
        return JasperExportManager.exportReportToPdf(jasperPrint);
    }

    @Transactional
    public void changeOrderStatus(Long orderId, String newStatus) {
        OrderEntity order = orderRepository.findById(orderId).orElseThrow();
        order.setStatus(newStatus);
        OrderStatusChange change = new OrderStatusChange();
        change.setOrder(order);
        change.setStatus(newStatus);
        change.setChangedAt(LocalDateTime.now());
        orderStatusChangeRepository.save(change);
        // Set finishedAt only for 'Zrealizowane', not for 'Anulowane'
        if ("Zrealizowane".equalsIgnoreCase(newStatus)) {
            order.setFinishedAt(LocalDateTime.now());
        }
        orderRepository.save(order);
    }
}
