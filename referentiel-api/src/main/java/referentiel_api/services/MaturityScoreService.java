package referentiel_api.services;

import org.springframework.stereotype.Service;
import referentiel_api.entities.Projet;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Service for calculating the maturity score of a Projet (0-100).
 * Each criterion contributes a fixed number of points.
 */
@Service
public class MaturityScoreService {

    /**
     * Calculate the total maturity score (0-100) for the given project.
     */
    public int calculateScore(Projet p) {
        int score = 0;
        for (int pts : getScoreDetails(p).values()) {
            score += pts;
        }
        return score;
    }

    /**
     * Returns a map of criterion label → points earned (0 or max).
     * The map preserves insertion order for display purposes.
     */
    public Map<String, Integer> getScoreDetails(Projet p) {
        Map<String, Integer> details = new LinkedHashMap<>();

        // Nom et Code (+5)
        details.put("nomEtCode", (p.getNom() != null && !p.getNom().isBlank()
                && p.getCode() != null && !p.getCode().isBlank()) ? 5 : 0);

        // Description (+10)
        details.put("description", (p.getDescription() != null && !p.getDescription().isBlank()) ? 10 : 0);

        // Type (+5)
        details.put("type", (p.getType() != null && !p.getType().isBlank()) ? 5 : 0);

        // Direction Métier (+5)
        details.put("directionMetier", (p.getDirectionMetier() != null && !p.getDirectionMetier().isBlank()) ? 5 : 0);

        // Dates prévisionnelles (+10)
        details.put("datesPrevues", (p.getDateDebutPrevue() != null && p.getDateFinPrevue() != null) ? 10 : 0);

        // Budget Initial (+15)
        details.put("budgetInitial", (p.getBudgetInitial() != null && p.getBudgetInitial() > 0) ? 15 : 0);

        // Chef de Projet (+5)
        details.put("chefDeProjet", ((p.getChefDeProjet() != null && !p.getChefDeProjet().isEmpty())
                || (p.getNomChefDeProjet() != null && !p.getNomChefDeProjet().isBlank())) ? 5 : 0);

        // Sous-phases (+15)
        details.put("sousPhases", (p.getSousPhases() != null && !p.getSousPhases().isEmpty()) ? 15 : 0);

        // Documents (+10)
        details.put("documentsLies", (p.getDocumentsLies() != null && !p.getDocumentsLies().isEmpty()) ? 10 : 0);

        // Risques (+10)
        details.put("risques", (p.getRisques() != null && !p.getRisques().isEmpty()) ? 10 : 0);

        // COPIL (+10)
        details.put("copilInstances", (p.getCopilInstances() != null && !p.getCopilInstances().isEmpty()) ? 10 : 0);

        return details;
    }

    /**
     * Returns a boolean map of each criterion (true = criterion met).
     * Convenience method for simple display checks.
     */
    public Map<String, Boolean> getCriteriaStatus(Projet p) {
        Map<String, Integer> detail = getScoreDetails(p);
        Map<String, Boolean> status = new LinkedHashMap<>();
        // max points per criterion
        Map<String, Integer> maxPts = Map.ofEntries(
                Map.entry("nomEtCode", 5),
                Map.entry("description", 10),
                Map.entry("type", 5),
                Map.entry("directionMetier", 5),
                Map.entry("datesPrevues", 10),
                Map.entry("budgetInitial", 15),
                Map.entry("chefDeProjet", 5),
                Map.entry("sousPhases", 15),
                Map.entry("documentsLies", 10),
                Map.entry("risques", 10),
                Map.entry("copilInstances", 10)
        );
        detail.forEach((k, v) -> status.put(k, v > 0));
        return status;
    }
}
