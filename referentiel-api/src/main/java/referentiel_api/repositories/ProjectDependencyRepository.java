package referentiel_api.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import referentiel_api.entities.ProjectDependency;

import java.util.List;

public interface ProjectDependencyRepository extends JpaRepository<ProjectDependency, Long> {
    List<ProjectDependency> findBySourceProjectId(Long sourceProjectId);
    List<ProjectDependency> findByTargetProjectId(Long targetProjectId);
    void deleteBySourceProjectIdAndTargetProjectId(Long sourceId, Long targetId);
}
