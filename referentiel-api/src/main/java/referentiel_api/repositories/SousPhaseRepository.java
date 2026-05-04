package referentiel_api.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import referentiel_api.entities.SousPhase;

@Repository
public interface SousPhaseRepository extends JpaRepository<SousPhase, Long> {
}
