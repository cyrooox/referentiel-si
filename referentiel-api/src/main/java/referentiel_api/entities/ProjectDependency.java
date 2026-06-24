package referentiel_api.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "project_dependencies")
public class ProjectDependency {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_project_id")
    private Projet sourceProject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_project_id")
    private Projet targetProject;

    private String dependencyType; // FIN_DEBUT, FIN_FIN, DEBUT_DEBUT

    @Column(columnDefinition = "TEXT")
    private String description;
}
