package referentiel_api.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import referentiel_api.entities.Notification;
import referentiel_api.repositories.NotificationRepository;

import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    /**
     * Create and persist a new notification.
     */
    public Notification createNotification(String recipientUserId, String type, String title,
                                           String message, Long projectId, String projectCode) {
        Notification notification = Notification.builder()
                .recipientUserId(recipientUserId)
                .type(type)
                .title(title)
                .message(message)
                .projectId(projectId)
                .projectCode(projectCode)
                .read(false)
                .build();
        return notificationRepository.save(notification);
    }

    /**
     * Get all notifications for a user, ordered newest first.
     */
    public List<Notification> getNotificationsForUser(String userId) {
        return notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getNotificationsForUser(List<String> userIds) {
        return notificationRepository.findByRecipientUserIdInOrderByCreatedAtDesc(userIds);
    }

    /**
     * Mark a single notification as read.
     */
    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }

    /**
     * Mark all notifications for a user as read.
     */
    public void markAllAsRead(String userId) {
        List<Notification> notifications = notificationRepository
                .findByRecipientUserIdOrderByCreatedAtDesc(userId);
        notifications.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(notifications);
    }

    public void markAllAsRead(List<String> userIds) {
        List<Notification> notifications = notificationRepository
                .findByRecipientUserIdInOrderByCreatedAtDesc(userIds);
        notifications.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(notifications);
    }

    /**
     * Count unread notifications for a user.
     */
    public long countUnread(String userId) {
        return notificationRepository.countByRecipientUserIdAndReadFalse(userId);
    }

    public long countUnread(List<String> userIds) {
        return notificationRepository.countByRecipientUserIdInAndReadFalse(userIds);
    }

    /**
     * Delete a notification by id.
     */
    public void deleteNotification(Long id) {
        notificationRepository.deleteById(id);
    }
}
