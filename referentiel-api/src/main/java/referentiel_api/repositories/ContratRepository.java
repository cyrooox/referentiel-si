package referentiel_api.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import referentiel_api.entities.Contrat;

@Repository
public interface ContratRepository extends JpaRepository<Contrat, Long> {
}
