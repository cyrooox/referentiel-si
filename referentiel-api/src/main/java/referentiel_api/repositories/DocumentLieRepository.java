package referentiel_api.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import referentiel_api.entities.DocumentLie;

@Repository
public interface DocumentLieRepository extends JpaRepository<DocumentLie, Long> {
}
