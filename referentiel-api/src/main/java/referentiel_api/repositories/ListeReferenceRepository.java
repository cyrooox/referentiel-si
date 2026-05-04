package referentiel_api.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import referentiel_api.entities.ListeReference;

import java.util.List;

@Repository
public interface ListeReferenceRepository extends JpaRepository<ListeReference, Long> {
    List<ListeReference> findByCategorie(String categorie);
}
