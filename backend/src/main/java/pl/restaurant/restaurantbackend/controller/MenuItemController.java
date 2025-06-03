package pl.restaurant.restaurantbackend.controller;

import org.springframework.web.bind.annotation.*;
import pl.restaurant.restaurantbackend.model.MenuItem;
import pl.restaurant.restaurantbackend.service.MenuItemService;

import java.util.List;

@RestController
@RequestMapping("/api/menu")
@CrossOrigin(origins = "*")
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
