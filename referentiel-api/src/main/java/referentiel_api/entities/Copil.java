package referentiel_api.entities;

import jakarta.persistence.*;
import lombok.*;
import java.util.Date;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "copils")
public class Copil {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String numero;

    @Temporal(TemporalType.DATE)
    private Date dateCopil;

    private String urlSupport;
    private String urlCompteRendu;

    @ManyToOne
    @JoinColumn(name = "projet_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Projet projet;
}
