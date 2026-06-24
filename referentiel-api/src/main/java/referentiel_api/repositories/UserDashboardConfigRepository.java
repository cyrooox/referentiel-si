package referentiel_api.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import referentiel_api.entities.UserDashboardConfig;

public interface UserDashboardConfigRepository extends JpaRepository<UserDashboardConfig, String> {
}
