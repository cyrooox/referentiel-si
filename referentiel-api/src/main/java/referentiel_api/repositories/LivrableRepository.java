package referentiel_api.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import referentiel_api.entities.Livrable;

@Repository
public interface LivrableRepository extends JpaRepository<Livrable, Long> {
}
