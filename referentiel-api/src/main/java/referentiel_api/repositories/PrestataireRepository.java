package referentiel_api.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import referentiel_api.entities.Prestataire;

@Repository
public interface PrestataireRepository extends JpaRepository<Prestataire, Long> {
    java.util.Optional<Prestataire> findByNom(String nom);
}
