package referentiel_api.entities;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "prestataires")
public class Prestataire {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;
    private String contact;

    @OneToMany(mappedBy = "prestataire", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Contrat> contrats;
}
