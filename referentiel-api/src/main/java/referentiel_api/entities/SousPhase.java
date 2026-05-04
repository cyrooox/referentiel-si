package referentiel_api.entities;

import jakarta.persistence.*;
import lombok.*;
import java.util.Date;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "sous_phases")
public class SousPhase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nomPhase;
    private String statut;

    @Temporal(TemporalType.DATE)
    private Date dateDebut;

    @Temporal(TemporalType.DATE)
    private Date dateFin;

    private String urlPvReception;

    @ManyToOne
    @JoinColumn(name = "projet_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Projet projet;

    @OneToMany(mappedBy = "sousPhase", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Livrable> livrables;
}
