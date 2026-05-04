package referentiel_api.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import referentiel_api.dto.OcrResultDto;
import referentiel_api.services.OcrService;

import java.io.IOException;

/**
 * Controller REST pour l'extraction OCR de documents.
 * POST /api/ocr/extract → reçoit un fichier, retourne les données extraites en JSON.
 */
@RestController
@RequestMapping("/api/ocr")
@CrossOrigin(origins = "http://localhost:5173")
public class OcrController {

    private final OcrService ocrService;

    public OcrController(OcrService ocrService) {
        this.ocrService = ocrService;
    }

    /**
     * Extrait les informations d'un document uploadé (PDF).
     * @param file Le fichier à analyser (PDF de contrat, fiche projet...)
     * @return OcrResultDto avec les champs extraits en JSON
     */
    @PostMapping("/extract")
    public ResponseEntity<?> extractFromDocument(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Fichier vide ou manquant.");
        }

        String originalFilename = file.getOriginalFilename();
        String filename = originalFilename != null ? originalFilename.toLowerCase() : "";
        if (!filename.endsWith(".pdf")) {
            return ResponseEntity.badRequest().body("Seuls les fichiers PDF sont supportés pour le moment.");
        }

        try {
            OcrResultDto result = ocrService.extractFromDocument(file);
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                .body("Erreur lors de la lecture du document : " + e.getMessage());
        }
    }
}
