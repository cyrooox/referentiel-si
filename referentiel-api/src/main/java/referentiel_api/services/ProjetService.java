package referentiel_api.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import referentiel_api.entities.Projet;
import referentiel_api.repositories.ProjetRepository;

import java.util.List;
import java.util.Optional;

@Service
public class ProjetService {

    @Autowired
    private ProjetRepository projetRepository;

    public List<Projet> getAllProjets() {
        return projetRepository.findAll();
    }

    public Optional<Projet> getProjetById(Long id) {
        return projetRepository.findById(id);
    }

    public Optional<Projet> getProjetByCode(String code) {
        return projetRepository.findByCode(code);
    }

    public Projet saveProjet(Projet projet) {
        if (projet.getId() == null && (projet.getCode() == null || projet.getCode().isEmpty())) {
            String year = String.valueOf(java.time.Year.now().getValue());
            String prefix = "PRJ-" + year + "-";
            long count = projetRepository.countByCodeStartingWith(prefix);
            String newCode = String.format("%s%03d", prefix, count + 1);
            projet.setCode(newCode);
        }

        if (projet.getContrats() != null) projet.getContrats().forEach(x -> x.setProjet(projet));
        if (projet.getSousPhases() != null) projet.getSousPhases().forEach(x -> x.setProjet(projet));
        if (projet.getEcheancesPaiement() != null) projet.getEcheancesPaiement().forEach(x -> x.setProjet(projet));
        if (projet.getRisques() != null) projet.getRisques().forEach(x -> x.setProjet(projet));
        if (projet.getDocumentsLies() != null) projet.getDocumentsLies().forEach(x -> x.setProjet(projet));
        if (projet.getCopilInstances() != null) projet.getCopilInstances().forEach(x -> x.setProjet(projet));

        return projetRepository.save(projet);
    }

    public void deleteProjet(Long id) {
        projetRepository.deleteById(id);
    }
}
