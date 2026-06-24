package referentiel_api.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import referentiel_api.entities.ValidationRequest;

import java.util.List;

public interface ValidationRequestRepository extends JpaRepository<ValidationRequest, Long> {
    List<ValidationRequest> findByStatusOrderByRequestedAtDesc(String status);
    List<ValidationRequest> findByRequestedByUserIdOrderByRequestedAtDesc(String userId);
    List<ValidationRequest> findByProjectIdOrderByRequestedAtDesc(Long projectId);
}
