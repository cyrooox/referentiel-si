package referentiel_api.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import referentiel_api.entities.RoleUser;
import referentiel_api.entities.Utilisateur;
import referentiel_api.repositories.UtilisateurRepository;

import java.util.List;
import java.util.Map;
import java.util.Collections;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;
import referentiel_api.dto.RegisterRequest;


@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:5175"})
public class AuthController {

    @Autowired
    private UtilisateurRepository utilisateurRepository;

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
     * - Si l'utilisateur existe déjà en BDD (par email, insensible à la casse) → retourne ses données existantes
     * - Si c'est un nouveau compte → créé en EN_ATTENTE (sauf si son email correspond à l'admin connu)
     */
    @PostMapping("/sync")
    public ResponseEntity<?> syncUser(@AuthenticationPrincipal Jwt jwt) {
        // Keycloak inclut toujours preferred_username ; email peut être absent
        String email             = jwt.getClaimAsString("email");
        String preferredUsername = jwt.getClaimAsString("preferred_username");
        String nom               = jwt.getClaimAsString("family_name");
        String prenom            = jwt.getClaimAsString("given_name");

        // Identifiant de recherche : on privilégie l'email, sinon preferred_username
        String identifier = (email != null && !email.isBlank()) ? email : preferredUsername;

        if (identifier == null) {
            return ResponseEntity.badRequest().body("Token invalide : aucun identifiant trouvé");
        }

        // Recherche insensible à la casse par email OU preferred_username
        Utilisateur utilisateur = utilisateurRepository.findByEmailIgnoreCase(identifier)
            .or(() -> utilisateurRepository.findByEmailIgnoreCase(preferredUsername != null ? preferredUsername : ""))
            .orElseGet(() -> {
                Utilisateur newUser = new Utilisateur();
                newUser.setEmail(identifier.toLowerCase());
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
     * Statistiques pour le dashboard admin :
     * - Total utilisateurs & répartition par rôle (PostgreSQL)
     * - Nombre de sessions actives Keycloak (= utilisateurs en ligne)
     */
    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        List<Utilisateur> tous = utilisateurRepository.findAll();

        long totalUsers = tous.size();
        long admins     = tous.stream().filter(u -> u.getRole() == RoleUser.ADMIN).count();
        long pmos       = tous.stream().filter(u -> u.getRole() == RoleUser.PMO).count();
        long chefs      = tous.stream().filter(u -> u.getRole() == RoleUser.CHEF_PROJET).count();
        long enAttente  = tous.stream().filter(u -> u.getRole() == RoleUser.EN_ATTENTE).count();

        // Sessions actives Keycloak
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
                // Stats des sessions du realm
                ResponseEntity<Map<String, Object>> sessionStats = rt.exchange(
                    "http://localhost:8180/admin/realms/referentiel-realm/sessions/stats",
                    HttpMethod.GET, new HttpEntity<>(ah),
                    new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {}
                );
                Map<String, Object> statsBodyMap = sessionStats.getBody();
                if (statsBodyMap != null && statsBodyMap.get("activeSessions") != null) {
                    Object count = statsBodyMap.get("activeSessions");
                    if (count instanceof Integer) sessionsActives = ((Integer) count).longValue();
                    else if (count instanceof Long)    sessionsActives = (Long) count;
                    else if (count instanceof Number)  sessionsActives = ((Number) count).longValue();
                }
            }
        } catch (Exception ignored) {
            // Keycloak inaccessible → sessions = 0
        }

        return ResponseEntity.ok(Map.of(
            "totalUsers",      totalUsers,
            "admins",          admins,
            "pmos",            pmos,
            "chefsDeProjet",   chefs,
            "enAttente",       enAttente,
            "sessionsActives", sessionsActives
        ));
    }

    /**
     * Crée un utilisateur depuis l'interface d'administration.
     * Enregistre dans la BDD locale (PostgreSQL) ET dans Keycloak.
     */
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody RegisterRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body("L'email est requis.");
        }

        // 1. Vérification BDD locale
        if (utilisateurRepository.findByEmailIgnoreCase(request.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Cet email est déjà utilisé dans la base de données.");
        }

        try {
            // 2. Obtenir un token Admin Keycloak
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

            // 3. Créer l'utilisateur dans Keycloak
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
                    "temporary", false
                ))
            );

            try {
                rt.postForEntity(
                    "http://localhost:8180/admin/realms/referentiel-realm/users",
                    new HttpEntity<>(keycloakUser, headersApi),
                    String.class
                );
            } catch (Exception e) {
                // Ignore conflict (409) if user already exists in Keycloak
                if (!e.getMessage().contains("409")) {
                    throw new RuntimeException("Erreur lors de la création dans Keycloak : " + e.getMessage());
                }
            }

            // 4. Sauvegarder dans PostgreSQL
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
