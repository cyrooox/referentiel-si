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
@Table(name = "projets")
public class Projet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String code;

    @Column(nullable = false)
    private String nom;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String type;
    private String statut;
    private String directionMetier;
    private String phaseCourante;

    @Temporal(TemporalType.DATE)
    private Date dateCreation;

    @Temporal(TemporalType.DATE)
    private Date dateDebutPrevue;

    @Temporal(TemporalType.DATE)
    private Date dateFinPrevue;

    @Temporal(TemporalType.DATE)
    private Date dateReelleFin;

    private Double budgetInitial;
    private Double budgetConsomme;

    private Integer tauxAvancement;
    private String etatSante;

    @Column(columnDefinition = "TEXT")
    private String commentairesSuivi;

    @ManyToOne
    @JoinColumn(name = "utilisateur_id")
    private Utilisateur chefDeProjet;

    private String nomChefDeProjet; // Champ texte libre

    @OneToMany(mappedBy = "projet", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<SousPhase> sousPhases;

    @OneToMany(mappedBy = "projet", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<Contrat> contrats;

    @OneToMany(mappedBy = "projet", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<EcheancePaiement> echeancesPaiement;

    @OneToMany(mappedBy = "projet", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<Risque> risques;

    @OneToMany(mappedBy = "projet", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<Action> actions;

    @OneToMany(mappedBy = "projet", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<DocumentLie> documentsLies;

    @OneToMany(mappedBy = "projet", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<Copil> copilInstances;
}
