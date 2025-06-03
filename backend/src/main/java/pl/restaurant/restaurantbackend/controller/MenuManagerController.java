package pl.restaurant.restaurantbackend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import pl.restaurant.restaurantbackend.model.MenuItem;
import pl.restaurant.restaurantbackend.repository.MenuItemRepository;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/manager/menu")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class MenuManagerController {
    private final MenuItemRepository menuItemRepository;
    private static final String UPLOAD_DIR = "uploads/";

    public MenuManagerController(MenuItemRepository menuItemRepository) {
        this.menuItemRepository = menuItemRepository;
        File uploadDir = new File(UPLOAD_DIR);
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }
    }

    @GetMapping
    public List<MenuItem> getAll() {
        return menuItemRepository.findAll();
    }

    @PostMapping
    public MenuItem addMenuItem(@RequestBody MenuItem menuItem) {
        return menuItemRepository.save(menuItem);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MenuItem> updateMenuItem(@PathVariable Long id, @RequestBody MenuItem menuItem) {
        Optional<MenuItem> existing = menuItemRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();
        menuItem.setId(id);
        return ResponseEntity.ok(menuItemRepository.save(menuItem));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMenuItem(@PathVariable Long id) {
        if (!menuItemRepository.existsById(id)) return ResponseEntity.notFound().build();
        menuItemRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/upload")
    public ResponseEntity<String> uploadImage(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Brak pliku");
        }
        String filename = StringUtils.cleanPath(file.getOriginalFilename());
        String ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
        if (!ext.equals("jpg") && !ext.equals("jpeg")) {
            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body("Dozwolone tylko pliki JPG");
        }
        String newFileName = UUID.randomUUID() + ".jpg";
        Path uploadPath = Paths.get(UPLOAD_DIR, newFileName);
        try {
            Files.copy(file.getInputStream(), uploadPath);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Błąd zapisu pliku");
        }
        return ResponseEntity.ok("/" + UPLOAD_DIR + newFileName);
    }

    @PatchMapping("/{id}/toggle-active")
    public ResponseEntity<MenuItem> toggleActive(@PathVariable Long id) {
        Optional<MenuItem> itemOpt = menuItemRepository.findById(id);
        if (itemOpt.isEmpty()) return ResponseEntity.notFound().build();
        MenuItem item = itemOpt.get();
        item.setActive(!item.isActive());
        menuItemRepository.save(item);
        return ResponseEntity.ok(item);
    }
}

