package referentiel_api.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import referentiel_api.entities.Notification;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientUserIdOrderByCreatedAtDesc(String userId);
    List<Notification> findByRecipientUserIdInOrderByCreatedAtDesc(List<String> userIds);
    long countByRecipientUserIdAndReadFalse(String userId);
    long countByRecipientUserIdInAndReadFalse(List<String> userIds);

    boolean existsByRecipientUserIdAndProjectIdAndType(String recipientUserId, Long projectId, String type);

    @Query("SELECT COUNT(n) > 0 FROM Notification n WHERE n.recipientUserId = :recipientUserId AND n.projectId = :projectId AND n.type = :type AND n.message LIKE %:messagePart%")
    boolean existsByRecipientUserIdAndProjectIdAndTypeAndMessageContaining(
        @Param("recipientUserId") String recipientUserId,
        @Param("projectId") Long projectId,
        @Param("type") String type,
        @Param("messagePart") String messagePart
    );
}
