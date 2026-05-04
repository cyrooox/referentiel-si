package referentiel_api.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "contrats")
public class Contrat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String reference;
    
    @Column(columnDefinition = "TEXT")
    private String objet;
    
    private String typeMarche;
    private Integer delaiExecutionMois;
    private Double montantContractuel;
    private String urlDocument;

    @ManyToOne
    @JoinColumn(name = "projet_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Projet projet;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prestataire_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Prestataire prestataire;
}
