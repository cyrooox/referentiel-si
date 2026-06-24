package referentiel_api.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String recipientUserId;

    private String type; // ECHEANCE, BUDGET_DEPASSE, VALIDATION_REQUISE, GENERAL

    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    private Long projectId;

    private String projectCode;

    @Builder.Default
    private boolean read = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
