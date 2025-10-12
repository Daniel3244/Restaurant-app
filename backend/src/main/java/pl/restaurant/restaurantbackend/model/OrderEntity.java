package pl.restaurant.restaurantbackend.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "order_entity",
    uniqueConstraints = @UniqueConstraint(name = "uk_order_date_number", columnNames = {"order_date", "order_number"})
)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class OrderEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_number", nullable = false)
    private Long orderNumber;

    @Column(name = "order_date", nullable = false)
    private LocalDate orderDate;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    // order type: "na miejscu" (dine-in) lub "na wynos" (take-out)
    private String type;

    @Column(nullable = false)
    // status values: W realizacji, Gotowe, Zrealizowane, Anulowane
    private String status;

    // nie dodajemy tutaj JsonManagedReference, bo powoduje zapetlone mapowanie
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "order_id")
    private List<OrderItem> items;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @com.fasterxml.jackson.annotation.JsonManagedReference
    private List<OrderStatusChange> statusHistory;

    @Column
    // moment zakonczenia zamowienia (wykorzystywany przy statusie Zrealizowane)
    private LocalDateTime finishedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getOrderNumber() { return orderNumber; }
    public void setOrderNumber(Long orderNumber) { this.orderNumber = orderNumber; }
    public LocalDate getOrderDate() { return orderDate; }
    public void setOrderDate(LocalDate orderDate) { this.orderDate = orderDate; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public List<OrderItem> getItems() { return items; }
    public void setItems(List<OrderItem> items) { this.items = items; }
    public List<OrderStatusChange> getStatusHistory() { return statusHistory; }
    public void setStatusHistory(List<OrderStatusChange> statusHistory) { this.statusHistory = statusHistory; }
    public LocalDateTime getFinishedAt() { return finishedAt; }
    public void setFinishedAt(LocalDateTime finishedAt) { this.finishedAt = finishedAt; }
}
