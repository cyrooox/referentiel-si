package referentiel_api.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "validation_requests")
public class ValidationRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String actionType; // CLOTURE_PROJET, SUPPRESSION_DOCUMENT, MODIFICATION_BUDGET

    @Column(columnDefinition = "TEXT")
    private String actionDescription;

    private Long projectId;

    private String projectCode;

    private String projetNom;

    private String requestedByUserId;

    private String requestedByUserName;

    private String validatedByUserId;

    private String validatedByUserName;

    @Builder.Default
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED

    @Column(columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(columnDefinition = "TEXT")
    private String proposedChanges;

    @Builder.Default
    private LocalDateTime requestedAt = LocalDateTime.now();

    private LocalDateTime resolvedAt;
}
