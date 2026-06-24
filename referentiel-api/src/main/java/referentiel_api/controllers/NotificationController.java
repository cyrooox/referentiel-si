package referentiel_api.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import referentiel_api.entities.Notification;
import referentiel_api.services.NotificationService;

import java.util.List;
import java.util.Map;

import org.springframework.security.oauth2.jwt.Jwt;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "http://localhost:5173")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    private List<String> getUserIdsFromAuth(Authentication authentication) {
        List<String> ids = new ArrayList<>();
        if (authentication != null) {
            ids.add(authentication.getName()); // Keycloak sub ID
            if (authentication.getPrincipal() instanceof Jwt) {
                Jwt jwt = (Jwt) authentication.getPrincipal();
                String email = jwt.getClaimAsString("email");
                if (email != null && !email.isBlank()) {
                    ids.add(email.toLowerCase());
                }
            }
        }
        return ids;
    }

    /**
     * Get all notifications for the currently authenticated user.
     * The Keycloak sub is exposed as Authentication.getName().
     */
    @GetMapping
    public List<Notification> getMyNotifications(Authentication authentication) {
        List<String> userIds = getUserIdsFromAuth(authentication);
        return notificationService.getNotificationsForUser(userIds);
    }

    /**
     * Return the count of unread notifications for the current user.
     */
    @GetMapping("/unread-count")
    public Map<String, Long> getUnreadCount(Authentication authentication) {
        List<String> userIds = getUserIdsFromAuth(authentication);
        long count = notificationService.countUnread(userIds);
        return Map.of("count", count);
    }

    /**
     * Mark a single notification as read.
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Mark all notifications for the current user as read.
     */
    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(Authentication authentication) {
        List<String> userIds = getUserIdsFromAuth(authentication);
        notificationService.markAllAsRead(userIds);
        return ResponseEntity.ok().build();
    }

    /**
     * Delete a notification.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Test endpoint: create a sample notification for the current user.
     */
    @PostMapping("/test")
    public Notification createTestNotification(Authentication authentication) {
        String userId = authentication.getName();
        return notificationService.createNotification(
                userId,
                "GENERAL",
                "Notification de test",
                "Ceci est une notification de test créée depuis l'API.",
                null,
                null
        );
    }
}
