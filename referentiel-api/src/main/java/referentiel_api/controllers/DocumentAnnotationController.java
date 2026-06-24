package referentiel_api.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import referentiel_api.entities.DocumentAnnotation;
import referentiel_api.repositories.DocumentAnnotationRepository;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/annotations")
@CrossOrigin(origins = "http://localhost:5173")
public class DocumentAnnotationController {

    @Autowired
    private DocumentAnnotationRepository annotationRepository;

    /**
     * Get all annotations for a document.
     */
    @GetMapping
    public List<DocumentAnnotation> getByDocument(@RequestParam Long documentId) {
        return annotationRepository.findByDocumentIdOrderByCreatedAtDesc(documentId);
    }

    /**
     * Get all annotations for a project.
     */
    @GetMapping("/project/{projectId}")
    public List<DocumentAnnotation> getByProject(@PathVariable Long projectId) {
        return annotationRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
    }

    /**
     * Create a new annotation.
     * Body: { documentId, projectId, authorUserId, authorName, content, pageNumber }
     */
    @PostMapping
    public DocumentAnnotation createAnnotation(@RequestBody DocumentAnnotation annotation) {
        annotation.setCreatedAt(LocalDateTime.now());
        return annotationRepository.save(annotation);
    }

    /**
     * Delete an annotation by id.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAnnotation(@PathVariable Long id) {
        annotationRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
