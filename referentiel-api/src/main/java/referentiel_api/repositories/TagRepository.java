package referentiel_api.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import referentiel_api.entities.ProjectTag;

import java.util.List;
import java.util.Optional;

public interface TagRepository extends JpaRepository<ProjectTag, Long> {
    Optional<ProjectTag> findByName(String name);
    List<ProjectTag> findByNameContainingIgnoreCase(String query);
}
