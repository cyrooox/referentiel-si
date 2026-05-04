package referentiel_api.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import referentiel_api.entities.EcheancePaiement;

@Repository
public interface EcheancePaiementRepository extends JpaRepository<EcheancePaiement, Long> {
}
