package referentiel_api.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import referentiel_api.entities.Projet;
import referentiel_api.services.MaturityScoreService;
import referentiel_api.services.ProjetService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projets")
@CrossOrigin(origins = "http://localhost:5173")
public class ProjetController {

    @Autowired
    private ProjetService projetService;

    @Autowired
    private MaturityScoreService maturityScoreService;

    @Autowired
    private referentiel_api.services.NotificationSchedulerService notificationSchedulerService;

    @GetMapping
    public List<Projet> getAllProjets() {
        List<Projet> projets = projetService.getAllProjets();
        projets.forEach(p -> p.setMaturityScore(maturityScoreService.calculateScore(p)));
        return projets;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Projet> getProjetById(@PathVariable Long id) {
        return projetService.getProjetById(id)
                .map(p -> {
                    p.setMaturityScore(maturityScoreService.calculateScore(p));
                    return ResponseEntity.ok(p);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Projet createProjet(@RequestBody Projet projet) {
        Projet saved = projetService.saveProjet(projet);
        notificationSchedulerService.checkSingleProject(saved);
        return saved;
    }

    @PutMapping("/{id}")
    public ResponseEntity<Projet> updateProjet(@PathVariable Long id, @RequestBody Projet projet) {
        if (!projetService.getProjetById(id).isPresent()) {
            return ResponseEntity.notFound().build();
        }
        projet.setId(id);
        Projet saved = projetService.saveProjet(projet);
        notificationSchedulerService.checkSingleProject(saved);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProjet(@PathVariable Long id) {
        projetService.deleteProjet(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Returns the maturity score and the breakdown per criterion for a single project.
     */
    @GetMapping("/{id}/maturity-score")
    public ResponseEntity<Map<String, Object>> getMaturityScore(@PathVariable Long id) {
        return projetService.getProjetById(id).map(p -> {
            int score = maturityScoreService.calculateScore(p);
            Map<String, Object> result = new HashMap<>();
            result.put("score", score);
            result.put("details", maturityScoreService.getScoreDetails(p));
            result.put("criteriaStatus", maturityScoreService.getCriteriaStatus(p));
            return ResponseEntity.ok(result);
        }).orElse(ResponseEntity.notFound().build());
    }
}
