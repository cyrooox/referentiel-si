package referentiel_api.entities;

import jakarta.persistence.*;
import lombok.*;
import java.util.Date;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "echeances_paiement")
public class EcheancePaiement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Double montant;

    @Temporal(TemporalType.DATE)
    private Date dateEcheance;

    private Boolean estPaye;

    @ManyToOne
    @JoinColumn(name = "projet_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Projet projet;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sous_phase_id", nullable = true)
    private SousPhase sousPhase;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "livrable_id", nullable = true)
    private Livrable livrable;
}
