package referentiel_api.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "livrables")
public class Livrable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;
    private String urlFichierJoint;
    private Boolean estLivre;
    private Boolean estValide;

    @ManyToOne
    @JoinColumn(name = "sous_phase_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private SousPhase sousPhase;
}
