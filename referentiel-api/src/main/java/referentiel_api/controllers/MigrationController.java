package referentiel_api.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import referentiel_api.entities.Utilisateur;
import referentiel_api.repositories.UtilisateurRepository;

import java.util.*;

/**
 * Endpoint temporaire de migration : crée les utilisateurs PostgreSQL dans Keycloak.
 * À SUPPRIMER après la migration !
 * Appel : POST http://localhost:8080/api/migration/keycloak
 */
@RestController
@RequestMapping("/api/migration")
@CrossOrigin(origins = "http://localhost:5173")
public class MigrationController {

    @Autowired
    private UtilisateurRepository utilisateurRepository;

    private final RestTemplate restTemplate = new RestTemplate();

    private static final String KEYCLOAK_URL    = "http://localhost:8180";
    private static final String REALM           = "referentiel-realm";
    private static final String CLIENT_ID       = "admin-cli";
    private static final String ADMIN_USER      = "admin";
    private static final String ADMIN_PASSWORD  = "admin";
    private static final String DEFAULT_PASSWORD = "Referentiel123!"; // Mdp temporaire

    /**
     * Normalise tous les emails de la BDD en minuscules pour correspondre à Keycloak.
     */
    @PostMapping("/normalize-emails")
    public ResponseEntity<?> normalizeEmails() {
        List<Utilisateur> utilisateurs = utilisateurRepository.findAll();
        List<String> updated = new ArrayList<>();
        for (Utilisateur u : utilisateurs) {
            String lower = u.getEmail().toLowerCase();
            if (!lower.equals(u.getEmail())) {
                u.setEmail(lower);
                utilisateurRepository.save(u);
                updated.add(lower);
            }
        }
        return ResponseEntity.ok(Map.of(
            "normalises", updated,
            "message", updated.isEmpty() ? "Tous les emails étaient déjà en minuscules." : "Emails normalisés avec succès."
        ));
    }

    @PostMapping("/keycloak")
    public ResponseEntity<?> migrateUsersToKeycloak() {
        List<Utilisateur> utilisateurs = utilisateurRepository.findAll();
        List<Map<String, Object>> results = new ArrayList<>();

        // 1. Obtenir le token admin Keycloak
        String adminToken;
        try {
            adminToken = getAdminToken();
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Impossible d'obtenir le token admin Keycloak: " + e.getMessage());
        }

        // 2. Créer chaque utilisateur dans Keycloak
        for (Utilisateur u : utilisateurs) {
            Map<String, Object> result = new HashMap<>();
            result.put("id", u.getId());
            result.put("email", u.getEmail());

            try {
                createKeycloakUser(adminToken, u);
                result.put("status", "✅ Créé");
            } catch (Exception e) {
                String msg = e.getMessage();
                if (msg != null && msg.contains("409")) {
                    result.put("status", "⚠️ Déjà existant dans Keycloak");
                } else {
                    result.put("status", "❌ Erreur: " + msg);
                }
            }
            results.add(result);
        }

        return ResponseEntity.ok(Map.of(
            "total", utilisateurs.size(),
            "resultats", results,
            "motDePasseTemporaire", DEFAULT_PASSWORD,
            "message", "Migration terminée. Les utilisateurs doivent changer leur mot de passe à la première connexion."
        ));
    }

    private String getAdminToken() {
        String tokenUrl = KEYCLOAK_URL + "/realms/master/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        String body = "grant_type=password"
                + "&client_id=" + CLIENT_ID
                + "&username=" + ADMIN_USER
                + "&password=" + ADMIN_PASSWORD;

        HttpEntity<String> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
            tokenUrl, HttpMethod.POST, request, new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {});

        Map<String, Object> responseBody = response.getBody();
        if (responseBody == null) throw new RuntimeException("Réponse vide de Keycloak");
        return (String) responseBody.get("access_token");
    }

    private void createKeycloakUser(String adminToken, Utilisateur u) {
        String usersUrl = KEYCLOAK_URL + "/admin/realms/" + REALM + "/users";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(adminToken);

        // Mapper le rôle BDD → rôle Keycloak
        String keycloakRole = switch (u.getRole()) {
            case ADMIN       -> "ROLE_ADMIN";
            case PMO         -> "ROLE_PMO";
            case CHEF_PROJET -> "ROLE_CHEF_PROJET";
            default          -> null; // EN_ATTENTE : pas de rôle spécial
        };

        Map<String, Object> userPayload = new HashMap<>();
        userPayload.put("username", u.getEmail());
        userPayload.put("email", u.getEmail());
        userPayload.put("firstName", u.getPrenom() != null ? u.getPrenom() : "");
        userPayload.put("lastName", u.getNom() != null ? u.getNom() : "");
        userPayload.put("enabled", true);
        userPayload.put("emailVerified", true);

        // Mot de passe temporaire
        Map<String, Object> credential = new HashMap<>();
        credential.put("type", "password");
        credential.put("value", DEFAULT_PASSWORD);
        credential.put("temporary", true); // Force le changement à la première connexion
        userPayload.put("credentials", List.of(credential));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(userPayload, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(usersUrl, request, String.class);

        // Récupérer l'ID du user créé pour lui assigner le rôle
        if (keycloakRole != null && response.getStatusCode() == HttpStatus.CREATED) {
            java.net.URI location = response.getHeaders().getLocation();
            if (location != null) {
                String loc = location.toString();
                String userId = loc.substring(loc.lastIndexOf('/') + 1);
                assignRole(adminToken, userId, keycloakRole);
            }
        }
    }

    private void assignRole(String adminToken, String userId, String roleName) {
        // Récupérer l'objet rôle depuis Keycloak
        String rolesUrl = KEYCLOAK_URL + "/admin/realms/" + REALM + "/roles/" + roleName;
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);

        ResponseEntity<Map<String, Object>> roleResponse = restTemplate.exchange(
            rolesUrl, HttpMethod.GET, new HttpEntity<>(headers),
            new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {}
        );

        if (!roleResponse.getStatusCode().is2xxSuccessful()) return;

        Map<String, Object> roleBody = roleResponse.getBody();
        if (roleBody == null) return;

        // Assigner le rôle à l'utilisateur
        String assignUrl = KEYCLOAK_URL + "/admin/realms/" + REALM + "/users/" + userId + "/role-mappings/realm";
        headers.setContentType(MediaType.APPLICATION_JSON);
        restTemplate.postForEntity(assignUrl, new HttpEntity<>(List.of(roleBody), headers), String.class);
    }
}
