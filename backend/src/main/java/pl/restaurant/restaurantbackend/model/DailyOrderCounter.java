package pl.restaurant.restaurantbackend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;

@Entity
@Table(name = "daily_order_counter")
public class DailyOrderCounter {
    @Id
    @Column(name = "order_date", nullable = false, unique = true)
    private LocalDate orderDate;

    @Column(name = "last_number", nullable = false)
    private Long lastNumber;

    public DailyOrderCounter() {}

    public DailyOrderCounter(LocalDate orderDate, Long lastNumber) {
        this.orderDate = orderDate;
        this.lastNumber = lastNumber;
    }

    public LocalDate getOrderDate() {
        return orderDate;
    }

    public void setOrderDate(LocalDate orderDate) {
        this.orderDate = orderDate;
    }

    public Long getLastNumber() {
        return lastNumber;
    }

    public void setLastNumber(Long lastNumber) {
        this.lastNumber = lastNumber;
    }

    public Long nextValue() {
        this.lastNumber = (this.lastNumber == null ? 1L : this.lastNumber + 1);
        return this.lastNumber;
    }
}

