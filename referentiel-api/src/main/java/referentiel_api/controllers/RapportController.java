package referentiel_api.controllers;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import referentiel_api.entities.Projet;
import referentiel_api.repositories.ProjetRepository;
import referentiel_api.services.RapportService;

import java.util.Optional;

/**
 * Controller REST pour la génération de rapports PDF.
 * GET /api/projets/{id}/rapport?role=PMO
 * GET /api/projets/{id}/rapport?role=CHEF_PROJET
 */
@RestController
@RequestMapping("/api/projets")
public class RapportController {

    private final ProjetRepository projetRepository;
    private final RapportService   rapportService;

    public RapportController(ProjetRepository projetRepository, RapportService rapportService) {
        this.projetRepository = projetRepository;
        this.rapportService   = rapportService;
    }

    @GetMapping("/{id}/rapport")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> genererRapport(
            @PathVariable Long id,
            @RequestParam(defaultValue = "PMO") String role) {

        Optional<Projet> optProjet = projetRepository.findById(id);
        if (optProjet.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        Projet projet = optProjet.get();

        // Forcer le chargement des relations LAZY dans la transaction
        if (projet.getSousPhases() != null) {
            projet.getSousPhases().forEach(sp -> {
                if (sp.getLivrables() != null) sp.getLivrables().size();
            });
        }
        if (projet.getContrats() != null)          projet.getContrats().size();
        if (projet.getEcheancesPaiement() != null) projet.getEcheancesPaiement().size();
        if (projet.getRisques() != null)            projet.getRisques().size();
        if (projet.getActions() != null)            projet.getActions().size();
        if (projet.getDocumentsLies() != null)      projet.getDocumentsLies().size();
        if (projet.getCopilInstances() != null)     projet.getCopilInstances().size();

        try {
            byte[] pdfBytes = rapportService.genererRapport(projet, role);

            // Nom du fichier : Rapport_PMO_PRJ-2026-001.pdf
            String rolePropre = role.replace("_", "-");
            String nomFichier = String.format("Rapport_%s_%s.pdf", rolePropre, projet.getCode());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", nomFichier);
            headers.setContentLength(pdfBytes.length);

            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
