package referentiel_api.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import referentiel_api.entities.ListeReference;
import referentiel_api.repositories.ListeReferenceRepository;

import java.util.List;

@RestController
@RequestMapping("/api/references")
@CrossOrigin(origins = "http://localhost:5173")
public class ListeReferenceController {

    @Autowired
    private ListeReferenceRepository listeReferenceRepository;

    @GetMapping
    public List<ListeReference> getAll() {
        return listeReferenceRepository.findAll();
    }

    @GetMapping("/categorie/{categorie}")
    public List<ListeReference> getByCategorie(@PathVariable String categorie) {
        return listeReferenceRepository.findByCategorie(categorie);
    }

    @PostMapping
    public ListeReference create(@RequestBody ListeReference listeReference) {
        return listeReferenceRepository.save(listeReference);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        listeReferenceRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
