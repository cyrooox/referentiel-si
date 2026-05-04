package referentiel_api.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import referentiel_api.entities.Risque;

@Repository
public interface RisqueRepository extends JpaRepository<Risque, Long> {
}
