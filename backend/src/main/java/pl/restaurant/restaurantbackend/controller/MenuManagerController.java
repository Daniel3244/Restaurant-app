package pl.restaurant.restaurantbackend.controller;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import pl.restaurant.restaurantbackend.model.MenuItem;
import pl.restaurant.restaurantbackend.repository.MenuItemRepository;

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
        MenuItem current = existing.get();
        menuItem.setId(id);
        // keep current visibility unless it is changed through the dedicated toggle endpoint
        menuItem.setActive(current.isActive());
        return ResponseEntity.ok(menuItemRepository.save(menuItem));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMenuItem(@PathVariable Long id) {
        if (!menuItemRepository.existsById(id)) return ResponseEntity.notFound().build();
        menuItemRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/upload")
    public ResponseEntity<ImageUploadResponse> uploadImage(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(ImageUploadResponse.error("Brak pliku"));
        }
        String originalName = Optional.ofNullable(file.getOriginalFilename()).orElse("");
        String filename = StringUtils.cleanPath(originalName);
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex <= 0) {
            return ResponseEntity.badRequest().body(ImageUploadResponse.error("Plik musi mieć rozszerzenie JPG"));
        }
        String ext = filename.substring(dotIndex + 1).toLowerCase();
        if (!ext.equals("jpg") && !ext.equals("jpeg")) {
            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                    .body(ImageUploadResponse.error("Dozwolone tylko pliki JPG"));
        }
        String contentType = Optional.ofNullable(file.getContentType()).orElse("");
        if (!MediaType.IMAGE_JPEG_VALUE.equalsIgnoreCase(contentType)
                && !"image/pjpeg".equalsIgnoreCase(contentType)) {
            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                    .body(ImageUploadResponse.error("Niepoprawny typ pliku"));
        }
        String newFileName = UUID.randomUUID() + ".jpg";
        Path uploadPath = Paths.get(UPLOAD_DIR, newFileName);
        try {
            Files.copy(file.getInputStream(), uploadPath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ImageUploadResponse.error("Błąd zapisu pliku"));
        }
        return ResponseEntity.ok(ImageUploadResponse.success("/" + UPLOAD_DIR + newFileName, filename));
    }

    public static class ImageUploadResponse {
        private final String url;
        private final String originalName;
        private final String error;

        private ImageUploadResponse(String url, String originalName, String error) {
            this.url = url;
            this.originalName = originalName;
            this.error = error;
        }

        public String getUrl() {
            return url;
        }

        public String getOriginalName() {
            return originalName;
        }

        public String getError() {
            return error;
        }

        public static ImageUploadResponse success(String url, String originalName) {
            return new ImageUploadResponse(url, originalName, null);
        }

        public static ImageUploadResponse error(String message) {
            return new ImageUploadResponse(null, null, message);
        }

        public boolean isSuccess() {
            return error == null;
        }
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

