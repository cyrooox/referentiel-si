package referentiel_api.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import referentiel_api.dto.PrestatairePerformanceDto;
import referentiel_api.dto.ProjectDelayRiskDto;
import referentiel_api.services.PredictiveService;

@RestController
@RequestMapping("/api/predictive")
@CrossOrigin(origins = "http://localhost:5173")
public class PredictiveController {

    private final PredictiveService predictiveService;

    public PredictiveController(PredictiveService predictiveService) {
        this.predictiveService = predictiveService;
    }

    @GetMapping("/projets/{id}/delai-risque")
    public ResponseEntity<ProjectDelayRiskDto> getProjectDelayRisk(@PathVariable Long id) {
        return predictiveService.calculateProjectDelayRisk(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/prestataires/{id}/performance")
    public ResponseEntity<PrestatairePerformanceDto> getPrestatairePerformance(@PathVariable Long id) {
        return predictiveService.calculatePrestatairePerformance(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/prestataires/performance")
    public ResponseEntity<PrestatairePerformanceDto> getPrestatairePerformanceByNom(@RequestParam String nom) {
        return predictiveService.calculatePrestatairePerformanceByNom(nom)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
