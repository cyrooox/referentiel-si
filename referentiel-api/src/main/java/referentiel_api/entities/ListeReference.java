package referentiel_api.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "listes_references")
public class ListeReference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String categorie; // Ex: TYPE_PROJET, DIRECTION_METIER, STATUT

    @Column(nullable = false)
    private String code; // Ex: ERP, DEV_SPEC, SECU

    @Column(nullable = false)
    private String libelle; // Ex: "Développement Spécifique"

    @Column(columnDefinition = "TEXT")
    private String description;
}
