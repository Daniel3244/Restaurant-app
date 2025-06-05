// OrderEntity.java
// JPA entity representing a customer order in the restaurant system.
// Status can be: "W realizacji", "Gotowe", "Zrealizowane", "Anulowane"
package pl.restaurant.restaurantbackend.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.time.LocalDateTime;

@Entity
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class OrderEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long orderNumber;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private String type; // "na miejscu" lub "na wynos"

    @Column(nullable = false)
    private String status; // "W realizacji", "Gotowe", "Zrealizowane", "Anulowane"

    // NIE dodawaj @JsonManagedReference do items!
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "order_id")
    private List<OrderItem> items;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @com.fasterxml.jackson.annotation.JsonManagedReference
    private List<OrderStatusChange> statusHistory;

    @Column
    private LocalDateTime finishedAt; // data zakończenia (status Zrealizowane)

    // Gettery i settery
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getOrderNumber() { return orderNumber; }
    public void setOrderNumber(Long orderNumber) { this.orderNumber = orderNumber; }
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
