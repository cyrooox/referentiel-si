package referentiel_api.entities;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "utilisateurs")
public class Utilisateur {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;
    private String prenom;
    
    @Column(unique = true, nullable = false)
    private String email;
    
    @Column(nullable = false)
    private String motDePasse;

    // ── TOTP 2FA (Microsoft Authenticator / RFC 6238) ──────────────────────
    @Column(name = "totp_secret")
    private String totpSecret;

    @Column(name = "totp_enabled", nullable = false)
    private boolean totpEnabled = false;
    // ────────────────────────────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    private RoleUser role;

    @JsonIgnore
    @ManyToMany(mappedBy = "chefDeProjet", fetch = FetchType.LAZY)
    private List<Projet> projetsGeres;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "utilisateur_referentiels",
        joinColumns = @JoinColumn(name = "utilisateur_id"),
        inverseJoinColumns = @JoinColumn(name = "referentiel_id")
    )
    private List<ListeReference> referentiels;

}
