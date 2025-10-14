package pl.restaurant.restaurantbackend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.restaurant.restaurantbackend.model.MenuItem;
import pl.restaurant.restaurantbackend.service.MenuItemService;

import java.util.List;

@RestController
@RequestMapping("/api/menu")
public class MenuItemController {
    private final MenuItemService menuItemService;

    public MenuItemController(MenuItemService menuItemService) {
        this.menuItemService = menuItemService;
    }

    @GetMapping
    public List<MenuItem> getMenu() {
        return menuItemService.getAllMenuItems();
    }
}
