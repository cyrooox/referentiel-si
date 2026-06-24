package referentiel_api.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "document_annotations")
public class DocumentAnnotation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long documentId;

    private Long projectId;

    private String authorUserId;

    private String authorName;

    @Column(columnDefinition = "TEXT")
    private String content;

    private Integer pageNumber;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
