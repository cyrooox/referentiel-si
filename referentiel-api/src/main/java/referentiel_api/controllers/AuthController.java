package referentiel_api.controllers;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorConfig;
import com.warrenstrange.googleauth.GoogleAuthenticatorConfig.GoogleAuthenticatorConfigBuilder;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import com.warrenstrange.googleauth.GoogleAuthenticatorQRGenerator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import referentiel_api.entities.RoleUser;
import referentiel_api.entities.Utilisateur;
import referentiel_api.repositories.UtilisateurRepository;
import referentiel_api.dto.RegisterRequest;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;


@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:5175"})
public class AuthController {

    @Autowired
    private UtilisateurRepository utilisateurRepository;

    private final GoogleAuthenticator gAuth;

    public AuthController() {
        GoogleAuthenticatorConfig config = new GoogleAuthenticatorConfigBuilder()
            .setWindowSize(5) // Augmente la tolérance à 5 étapes (2.5 minutes de décalage avant/après)
            .build();
        this.gAuth = new GoogleAuthenticator(config);
    }

    // ── Constantes TOTP ──────────────────────────────────────────────────────
    private static final String ISSUER = "Référentiel SI";

    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Debug : retourne tous les claims du token JWT Keycloak
     */
    @GetMapping("/debug-token")
    public ResponseEntity<?> debugToken(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(Map.of(
            "allClaims",          jwt.getClaims(),
            "email",              jwt.getClaimAsString("email"),
            "preferred_username", jwt.getClaimAsString("preferred_username"),
            "given_name",         jwt.getClaimAsString("given_name"),
            "family_name",        jwt.getClaimAsString("family_name"),
            "realm_access",       jwt.getClaimAsMap("realm_access")
        ));
    }

    /**
     * Appelé par le frontend après connexion Keycloak.
     *
     * Flux Microsoft :
     *  - totpEnabled = false → demander setup TOTP (première fois)
     *  - totpEnabled = true  → demander vérification TOTP (connexions suivantes)
     *
     * Flux normal (local) : synchronisation directe.
     */
    @PostMapping("/sync")
    public ResponseEntity<?> syncUser(@AuthenticationPrincipal Jwt jwt) {
        String email             = jwt.getClaimAsString("email");
        String preferredUsername = jwt.getClaimAsString("preferred_username");
        String nom               = jwt.getClaimAsString("family_name");
        String prenom            = jwt.getClaimAsString("given_name");

        String identifier = (email != null && !email.isBlank()) ? email : preferredUsername;

        if (identifier == null) {
            return ResponseEntity.badRequest().body("Token invalide : aucun identifiant trouvé");
        }

        String emailLower = identifier.toLowerCase();

        // 1. Détecter si l'utilisateur se connecte via Microsoft
        if (isMicrosoftUser(jwt)) {
            // Chercher ou créer l'utilisateur
            Utilisateur utilisateur = utilisateurRepository.findByEmailIgnoreCase(emailLower)
                .orElseGet(() -> {
                    Utilisateur newUser = new Utilisateur();
                    newUser.setEmail(emailLower);
                    newUser.setNom(nom != null ? nom : "");
                    newUser.setPrenom(prenom != null ? prenom : "");
                    newUser.setMotDePasse("keycloak-managed");
                    newUser.setRole(RoleUser.EN_ATTENTE);
                    newUser.setTotpEnabled(false);
                    return utilisateurRepository.save(newUser);
                });

            if (!utilisateur.isTotpEnabled()) {
                // Première connexion → setup TOTP requis
                return ResponseEntity.ok(Map.of(
                    "totpSetupRequired", true,
                    "email", emailLower
                ));
            } else {
                // TOTP déjà activé → vérification requise
                return ResponseEntity.ok(Map.of(
                    "totpVerifyRequired", true,
                    "email", emailLower
                ));
            }
        }

        // 2. Synchronisation normale (utilisateur local)
        Utilisateur utilisateur = utilisateurRepository.findByEmailIgnoreCase(identifier)
            .or(() -> utilisateurRepository.findByEmailIgnoreCase(preferredUsername != null ? preferredUsername : ""))
            .orElseGet(() -> {
                Utilisateur newUser = new Utilisateur();
                newUser.setEmail(emailLower);
                newUser.setNom(nom != null ? nom : "");
                newUser.setPrenom(prenom != null ? prenom : "");
                newUser.setMotDePasse("keycloak-managed");
                newUser.setRole(RoleUser.EN_ATTENTE);
                return utilisateurRepository.save(newUser);
            });

        return ResponseEntity.ok(Map.of(
            "id",     utilisateur.getId(),
            "email",  utilisateur.getEmail(),
            "nom",    utilisateur.getNom(),
            "prenom", utilisateur.getPrenom(),
            "role",   utilisateur.getRole().name()
        ));
    }

    // ════════════════════════════════════════════════════════════════════════
    //  TOTP — Setup (première configuration)
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Génère une clé secrète TOTP et retourne l'URI otpauth:// pour le QR Code.
     * L'utilisateur doit scanner ce QR Code avec Microsoft Authenticator.
     */
    @PostMapping("/totp/setup")
    public ResponseEntity<?> totpSetup(@AuthenticationPrincipal Jwt jwt,
                                       @RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        if (email == null) return ResponseEntity.badRequest().body("Email requis.");

        String emailLower = email.toLowerCase();
        Utilisateur utilisateur = utilisateurRepository.findByEmailIgnoreCase(emailLower)
            .orElse(null);

        if (utilisateur == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Utilisateur introuvable.");
        }

        // Générer une nouvelle clé secrète TOTP
        GoogleAuthenticatorKey key = gAuth.createCredentials();
        String secret = key.getKey();

        // Sauvegarder la clé (pas encore activée)
        utilisateur.setTotpSecret(secret);
        utilisateur.setTotpEnabled(false);
        utilisateurRepository.save(utilisateur);

        // Générer l'URI otpauth:// pour le QR Code
        String otpAuthUri = GoogleAuthenticatorQRGenerator.getOtpAuthTotpURL(
            ISSUER,
            emailLower,
            key
        );

        return ResponseEntity.ok(Map.of(
            "secret",     secret,
            "otpAuthUri", otpAuthUri
        ));
    }

    // ════════════════════════════════════════════════════════════════════════
    //  TOTP — Activation (premier code saisi pour confirmer le scan)
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Vérifie le premier code TOTP saisi après le scan du QR Code.
     * Si correct → active définitivement le 2FA pour cet utilisateur.
     */
    @PostMapping("/totp/activate")
    public ResponseEntity<?> totpActivate(@AuthenticationPrincipal Jwt jwt,
                                          @RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String codeStr = payload.get("code");

        if (email == null || codeStr == null) {
            return ResponseEntity.badRequest().body("Email et code requis.");
        }

        String emailLower = email.toLowerCase();
        Utilisateur utilisateur = utilisateurRepository.findByEmailIgnoreCase(emailLower)
            .orElse(null);

        if (utilisateur == null || utilisateur.getTotpSecret() == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body("Utilisateur introuvable ou clé TOTP non générée. Relancez le setup.");
        }

        int code;
        try {
            code = Integer.parseInt(codeStr.trim());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body("Code invalide.");
        }

        boolean valid = gAuth.authorize(utilisateur.getTotpSecret(), code);
        if (!valid) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body("Code incorrect. Vérifiez l'heure de votre appareil et réessayez.");
        }

        // Activer le TOTP
        utilisateur.setTotpEnabled(true);
        utilisateurRepository.save(utilisateur);

        return ResponseEntity.ok(Map.of(
            "id",     utilisateur.getId(),
            "email",  utilisateur.getEmail(),
            "nom",    utilisateur.getNom(),
            "prenom", utilisateur.getPrenom(),
            "role",   utilisateur.getRole().name(),
            "message", "2FA activé avec succès !"
        ));
    }

    // ════════════════════════════════════════════════════════════════════════
    //  TOTP — Vérification (à chaque connexion)
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Vérifie le code TOTP à 6 chiffres généré par Microsoft Authenticator.
     * Appelé à chaque connexion une fois le 2FA activé.
     */
    @PostMapping("/totp/verify")
    public ResponseEntity<?> totpVerify(@AuthenticationPrincipal Jwt jwt,
                                        @RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String codeStr = payload.get("code");

        if (email == null || codeStr == null) {
            return ResponseEntity.badRequest().body("Email et code requis.");
        }

        String emailLower = email.toLowerCase();
        Utilisateur utilisateur = utilisateurRepository.findByEmailIgnoreCase(emailLower)
            .orElse(null);

        if (utilisateur == null || !utilisateur.isTotpEnabled() || utilisateur.getTotpSecret() == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body("Utilisateur introuvable ou 2FA non configuré.");
        }

        int code;
        try {
            code = Integer.parseInt(codeStr.trim());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body("Code invalide.");
        }

        // Vérification avec fenêtre de ±1 période (tolérance horloge)
        boolean valid = gAuth.authorize(utilisateur.getTotpSecret(), code);
        if (!valid) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body("Code incorrect ou expiré. Le code change toutes les 30 secondes.");
        }

        return ResponseEntity.ok(Map.of(
            "id",     utilisateur.getId(),
            "email",  utilisateur.getEmail(),
            "nom",    utilisateur.getNom(),
            "prenom", utilisateur.getPrenom(),
            "role",   utilisateur.getRole().name()
        ));
    }

    // ════════════════════════════════════════════════════════════════════════
    //  Helper — Détection connexion Microsoft
    // ════════════════════════════════════════════════════════════════════════

    private boolean isMicrosoftUser(Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        if (email != null) {
            String lower = email.toLowerCase();
            if (lower.endsWith("@outlook.com") || lower.endsWith("@outlook.fr")
                    || lower.endsWith("@hotmail.com") || lower.endsWith("@hotmail.fr")) {
                return true;
            }
        }

        try {
            String keycloakUserId = jwt.getSubject();
            if (keycloakUserId == null) return false;

            RestTemplate rt = new RestTemplate();
            HttpHeaders headersToken = new HttpHeaders();
            headersToken.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            String tokenBody = "grant_type=password&client_id=admin-cli&username=admin&password=admin";

            ResponseEntity<Map<String, Object>> tokenResp = rt.exchange(
                "http://localhost:8180/realms/master/protocol/openid-connect/token",
                HttpMethod.POST,
                new HttpEntity<>(tokenBody, headersToken),
                new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {}
            );

            Map<String, Object> tokenBodyMap = tokenResp.getBody();
            if (tokenBodyMap != null && tokenBodyMap.get("access_token") != null) {
                String adminToken = (String) tokenBodyMap.get("access_token");
                HttpHeaders ah = new HttpHeaders();
                ah.setBearerAuth(adminToken);

                String fedUrl = "http://localhost:8180/admin/realms/referentiel-realm/users/"
                    + keycloakUserId + "/federated-identity";
                ResponseEntity<List<Map<String, Object>>> fedResp = rt.exchange(
                    fedUrl, HttpMethod.GET, new HttpEntity<>(ah),
                    new org.springframework.core.ParameterizedTypeReference<List<Map<String, Object>>>() {}
                );

                List<Map<String, Object>> identities = fedResp.getBody();
                if (identities != null) {
                    for (Map<String, Object> identity : identities) {
                        String idp = (String) identity.get("identityProvider");
                        if ("microsoft".equalsIgnoreCase(idp)) return true;
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("⚠️ [TOTP] Impossible de requêter Keycloak federated-identity : " + e.getMessage());
        }

        return false;
    }

    // ════════════════════════════════════════════════════════════════════════
    //  Endpoints existants conservés
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Retourne le profil de l'utilisateur connecté depuis la BDD PostgreSQL
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        return utilisateurRepository.findByEmailIgnoreCase(email)
            .map(u -> ResponseEntity.ok(Map.of(
                "id",     u.getId(),
                "email",  u.getEmail(),
                "nom",    u.getNom(),
                "prenom", u.getPrenom(),
                "role",   u.getRole().name()
            )))
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Statistiques pour le dashboard admin.
     */
    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        List<Utilisateur> tous = utilisateurRepository.findAll();

        long totalUsers = tous.size();
        long admins     = tous.stream().filter(u -> u.getRole() == RoleUser.ADMIN).count();
        long pmos       = tous.stream().filter(u -> u.getRole() == RoleUser.PMO).count();
        long chefs      = tous.stream().filter(u -> u.getRole() == RoleUser.CHEF_PROJET).count();
        long enAttente  = tous.stream().filter(u -> u.getRole() == RoleUser.EN_ATTENTE).count();
        long membres    = tous.stream().filter(u -> u.getRole() == RoleUser.MEMBRE).count();

        long sessionsActives = 0;
        try {
            RestTemplate rt = new RestTemplate();
            HttpHeaders h = new HttpHeaders();
            h.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            String tokenBody = "grant_type=password&client_id=admin-cli&username=admin&password=admin";
            ResponseEntity<Map<String, Object>> tokenResp = rt.exchange(
                "http://localhost:8180/realms/master/protocol/openid-connect/token",
                HttpMethod.POST, new HttpEntity<>(tokenBody, h),
                new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {}
            );
            Map<String, Object> tokenBodyMap = tokenResp.getBody();
            if (tokenBodyMap != null && tokenBodyMap.get("access_token") != null) {
                String adminToken = (String) tokenBodyMap.get("access_token");
                HttpHeaders ah = new HttpHeaders();
                ah.setBearerAuth(adminToken);
                ResponseEntity<Map<String, Object>> sessionStats = rt.exchange(
                    "http://localhost:8180/admin/realms/referentiel-realm/sessions/stats",
                    HttpMethod.GET, new HttpEntity<>(ah),
                    new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {}
                );
                Map<String, Object> statsBodyMap = sessionStats.getBody();
                if (statsBodyMap != null && statsBodyMap.get("activeSessions") != null) {
                    Object count = statsBodyMap.get("activeSessions");
                    if (count instanceof Integer)  sessionsActives = ((Integer) count).longValue();
                    else if (count instanceof Long) sessionsActives = (Long) count;
                    else if (count instanceof Number) sessionsActives = ((Number) count).longValue();
                }
            }
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of(
            "totalUsers",      totalUsers,
            "admins",          admins,
            "pmos",            pmos,
            "chefsDeProjet",   chefs,
            "enAttente",       enAttente,
            "membres",         membres,
            "sessionsActives", sessionsActives
        ));
    }

    /**
     * Crée un utilisateur depuis l'interface d'administration.
     */
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody RegisterRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body("L'email est requis.");
        }

        if (utilisateurRepository.findByEmailIgnoreCase(request.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Cet email est déjà utilisé dans la base de données.");
        }

        try {
            RestTemplate rt = new RestTemplate();
            HttpHeaders headersToken = new HttpHeaders();
            headersToken.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            String tokenBody = "grant_type=password&client_id=admin-cli&username=admin&password=admin";

            ResponseEntity<Map<String, Object>> tokenResp = rt.exchange(
                "http://localhost:8180/realms/master/protocol/openid-connect/token",
                HttpMethod.POST,
                new HttpEntity<>(tokenBody, headersToken),
                new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {}
            );

            Map<String, Object> tokenBodyMap = tokenResp.getBody();
            if (tokenBodyMap == null || tokenBodyMap.get("access_token") == null) {
                throw new RuntimeException("Impossible d'obtenir le token admin Keycloak");
            }
            String adminToken = (String) tokenBodyMap.get("access_token");

            HttpHeaders headersApi = new HttpHeaders();
            headersApi.setBearerAuth(adminToken);
            headersApi.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> keycloakUser = Map.of(
                "username", request.getEmail().toLowerCase(),
                "email", request.getEmail().toLowerCase(),
                "firstName", request.getPrenom(),
                "lastName", request.getNom(),
                "enabled", true,
                "emailVerified", true,
                "credentials", Collections.singletonList(Map.of(
                    "type", "password",
                    "value", request.getMotDePasse(),
                    "temporary", true
                ))
            );

            try {
                rt.postForEntity(
                    "http://localhost:8180/admin/realms/referentiel-realm/users",
                    new HttpEntity<>(keycloakUser, headersApi),
                    String.class
                );
            } catch (Exception e) {
                if (!e.getMessage().contains("409")) {
                    throw new RuntimeException("Erreur lors de la création dans Keycloak : " + e.getMessage());
                }
            }

            Utilisateur newUser = new Utilisateur();
            newUser.setNom(request.getNom());
            newUser.setPrenom(request.getPrenom());
            newUser.setEmail(request.getEmail().toLowerCase());
            newUser.setMotDePasse("keycloak-managed");
            newUser.setRole(RoleUser.EN_ATTENTE);

            utilisateurRepository.save(newUser);

            return ResponseEntity.ok("Utilisateur créé avec succès.");

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Erreur : " + e.getMessage());
        }
    }
}
