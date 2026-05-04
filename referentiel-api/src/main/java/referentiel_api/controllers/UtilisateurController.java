package referentiel_api.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import referentiel_api.entities.Utilisateur;
import referentiel_api.entities.RoleUser;
import referentiel_api.services.UtilisateurService;
import referentiel_api.repositories.ListeReferenceRepository;
import referentiel_api.entities.ListeReference;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/utilisateurs")
@CrossOrigin(origins = "http://localhost:5173") // Allow frontend (React/Vite default port)
public class UtilisateurController {

    @Autowired
    private UtilisateurService utilisateurService;

    @Autowired
    private ListeReferenceRepository listeReferenceRepository;

    @GetMapping
    public List<Utilisateur> getAllUtilisateurs() {
        return utilisateurService.getAllUtilisateurs();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Utilisateur> getUtilisateurById(@PathVariable Long id) {
        return utilisateurService.getUtilisateurById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Utilisateur createUtilisateur(@RequestBody Utilisateur utilisateur) {
        return utilisateurService.saveUtilisateur(utilisateur);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUtilisateur(@PathVariable Long id) {
        utilisateurService.deleteUtilisateur(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/role")
    public ResponseEntity<?> updateRole(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        return utilisateurService.getUtilisateurById(id).map(utilisateur -> {
            try {
                RoleUser newRole = RoleUser.valueOf(payload.get("role"));
                utilisateur.setRole(newRole);
                utilisateurService.saveUtilisateur(utilisateur);
                return ResponseEntity.ok(utilisateur);
            } catch(IllegalArgumentException e) {
                return ResponseEntity.badRequest().body("Rôle invalide");
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/referentiels")
    public ResponseEntity<?> updateReferentiels(@PathVariable Long id, @RequestBody List<Long> referentielIds) {
        return utilisateurService.getUtilisateurById(id).map(utilisateur -> {
            List<ListeReference> referentiels = listeReferenceRepository.findAllById(referentielIds);
            utilisateur.setReferentiels(referentiels);
            utilisateurService.saveUtilisateur(utilisateur);
            return ResponseEntity.ok(utilisateur);
        }).orElse(ResponseEntity.notFound().build());
    }
}
