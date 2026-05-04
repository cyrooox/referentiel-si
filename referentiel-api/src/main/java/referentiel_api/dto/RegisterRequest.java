package referentiel_api.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String nom;
    private String prenom;
    private String email;
    private String motDePasse;
    private String role; // Option "ADMIN", "CHEF_PROJET", "PMO"
}
