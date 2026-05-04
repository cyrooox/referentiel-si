package referentiel_api.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import referentiel_api.entities.Action;

@Repository
public interface ActionRepository extends JpaRepository<Action, Long> {
}
