package referentiel_api.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "risques")
public class Risque {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String impact; // Faible, Moyen, Fort
    private String responsable;

    @ManyToOne
    @JoinColumn(name = "projet_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Projet projet;
}
