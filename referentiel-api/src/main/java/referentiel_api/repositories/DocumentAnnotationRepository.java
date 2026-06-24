package referentiel_api.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import referentiel_api.entities.DocumentAnnotation;

import java.util.List;

public interface DocumentAnnotationRepository extends JpaRepository<DocumentAnnotation, Long> {
    List<DocumentAnnotation> findByDocumentIdOrderByCreatedAtDesc(Long documentId);
    List<DocumentAnnotation> findByProjectIdOrderByCreatedAtDesc(Long projectId);
}
