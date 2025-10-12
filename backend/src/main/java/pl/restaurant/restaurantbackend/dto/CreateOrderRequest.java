package pl.restaurant.restaurantbackend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CreateOrderRequest(String type, List<Item> items) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Item(Long menuItemId, Integer quantity) {}
}

