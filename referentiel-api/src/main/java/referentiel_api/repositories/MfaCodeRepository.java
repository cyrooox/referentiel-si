package referentiel_api.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import referentiel_api.entities.MfaCode;

import java.util.Optional;

@Repository
public interface MfaCodeRepository extends JpaRepository<MfaCode, Long> {
    Optional<MfaCode> findFirstByEmailAndCodeAndVerifiedFalseOrderByExpiryTimeDesc(String email, String code);
    Optional<MfaCode> findFirstByEmailAndVerifiedTrueOrderByExpiryTimeDesc(String email);
    void deleteByEmail(String email);
}
