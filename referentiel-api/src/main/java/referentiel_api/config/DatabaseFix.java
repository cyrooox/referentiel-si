package referentiel_api.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseFix {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // Email Keycloak de l'administrateur principal — à adapter si besoin
    private static final String ADMIN_EMAIL = "admin@referentiel.com";

    @PostConstruct
    public void init() {
        dropEnumConstraint();
        migrateTotpColumns();
        ensureAdminExists();
    }

    /**
     * Supprime l'ancienne contrainte CHECK sur le rôle (PostgreSQL enum check)
     * pour permettre les nouvelles valeurs de RoleUser.
     */
    private void dropEnumConstraint() {
        try {
            jdbcTemplate.execute("ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check");
            System.out.println("✅ Constraint utilisateurs_role_check dropped (or did not exist).");
        } catch (Exception e) {
            System.out.println("❌ Could not drop constraint: " + e.getMessage());
        }
    }

    /**
     * Ajoute les colonnes TOTP si elles n'existent pas encore (migration idempotente).
     * Nécessaire lors du premier démarrage après l'introduction du 2FA TOTP.
     */
    private void migrateTotpColumns() {
        try {
            jdbcTemplate.execute(
                "ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255)"
            );
            jdbcTemplate.execute(
                "ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE"
            );
            System.out.println("✅ Colonnes TOTP vérifiées/ajoutées (totp_secret, totp_enabled).");
        } catch (Exception e) {
            System.out.println("⚠️ Migration TOTP : " + e.getMessage());
        }
    }

    /**
     * Garantit qu'un compte ADMIN existe en base au démarrage.
     * Si l'email admin est absent → insère avec rôle ADMIN.
     * Si présent avec rôle EN_ATTENTE → met à jour vers ADMIN.
     * Sinon → ne touche à rien (préserve le rôle existant).
     */
    private void ensureAdminExists() {
        try {
            Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM utilisateurs WHERE LOWER(email) = LOWER(?)",
                Integer.class, ADMIN_EMAIL
            );

            if (count == null || count == 0) {
                // Insertion de l'admin s'il n'existe pas
                jdbcTemplate.update(
                    "INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, totp_enabled) VALUES (?, ?, ?, ?, ?, ?)",
                    "Administrateur", "CDG", ADMIN_EMAIL.toLowerCase(), "keycloak-managed", "ADMIN", false
                );
                System.out.println("✅ Compte admin créé automatiquement pour : " + ADMIN_EMAIL);
            } else {
                // Corrige le rôle EN_ATTENTE si l'admin existe mais est bloqué
                int updated = jdbcTemplate.update(
                    "UPDATE utilisateurs SET role = 'ADMIN' WHERE LOWER(email) = LOWER(?) AND role = 'EN_ATTENTE'",
                    ADMIN_EMAIL
                );
                if (updated > 0) {
                    System.out.println("✅ Rôle admin restauré pour : " + ADMIN_EMAIL);
                } else {
                    System.out.println("ℹ️ Compte admin déjà configuré pour : " + ADMIN_EMAIL);
                }
            }
        } catch (Exception e) {
            System.out.println("❌ Erreur lors de l'initialisation de l'admin : " + e.getMessage());
        }
    }
}
