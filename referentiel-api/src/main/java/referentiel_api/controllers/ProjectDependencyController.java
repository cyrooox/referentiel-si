package referentiel_api.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import referentiel_api.entities.ProjectDependency;
import referentiel_api.entities.Projet;
import referentiel_api.repositories.ProjectDependencyRepository;
import referentiel_api.repositories.ProjetRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/project-dependencies")
@CrossOrigin(origins = "http://localhost:5173")
public class ProjectDependencyController {

    // Lightweight DTO to avoid circular refs with full Projet entity
    record DependencyDTO(
            Long id,
            Long sourceId,
            String sourceName,
            String sourceCode,
            Long targetId,
            String targetName,
            String targetCode,
            String dependencyType,
            String description
    ) {}

    @Autowired
    private ProjectDependencyRepository dependencyRepository;

    @Autowired
    private ProjetRepository projetRepository;

    /**
     * Get all dependencies where sourceProject.id = sourceId.
     */
    @GetMapping
    public List<DependencyDTO> getBySource(@RequestParam(required = false) Long sourceId) {
        List<ProjectDependency> list = (sourceId != null)
                ? dependencyRepository.findBySourceProjectId(sourceId)
                : dependencyRepository.findAll();
        return list.stream().map(this::toDTO).collect(Collectors.toList());
    }

    /**
     * Get all dependencies (for roadmap/graph view).
     */
    @GetMapping("/all")
    public List<DependencyDTO> getAllDependencies() {
        return dependencyRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Create a new dependency between two projects.
     * Body: { sourceProjectId, targetProjectId, dependencyType, description }
     */
    @PostMapping
    public ResponseEntity<DependencyDTO> createDependency(@RequestBody Map<String, Object> body) {
        Long sourceId = getLong(body, "sourceProjectId");
        Long targetId = getLong(body, "targetProjectId");
        String dependencyType = (String) body.get("dependencyType");
        String description = (String) body.get("description");

        Projet source = projetRepository.findById(sourceId).orElse(null);
        Projet target = projetRepository.findById(targetId).orElse(null);

        if (source == null || target == null) {
            return ResponseEntity.badRequest().build();
        }

        ProjectDependency dep = ProjectDependency.builder()
                .sourceProject(source)
                .targetProject(target)
                .dependencyType(dependencyType)
                .description(description)
                .build();

        ProjectDependency saved = dependencyRepository.save(dep);
        return ResponseEntity.ok(toDTO(saved));
    }

    /**
     * Delete a dependency by id.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDependency(@PathVariable Long id) {
        dependencyRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ---- Helpers ----

    private DependencyDTO toDTO(ProjectDependency dep) {
        Projet src = dep.getSourceProject();
        Projet tgt = dep.getTargetProject();
        return new DependencyDTO(
                dep.getId(),
                src != null ? src.getId() : null,
                src != null ? src.getNom() : null,
                src != null ? src.getCode() : null,
                tgt != null ? tgt.getId() : null,
                tgt != null ? tgt.getNom() : null,
                tgt != null ? tgt.getCode() : null,
                dep.getDependencyType(),
                dep.getDescription()
        );
    }

    private Long getLong(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).longValue();
        return Long.parseLong(val.toString());
    }
}
