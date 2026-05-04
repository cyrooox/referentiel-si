package referentiel_api.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "actions")
public class Action {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String statut; // En cours, Effectuée, Annulée

    @ManyToOne
    @JoinColumn(name = "projet_id")
    private Projet projet;
}
