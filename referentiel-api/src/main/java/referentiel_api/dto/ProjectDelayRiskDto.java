package referentiel_api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectDelayRiskDto {
    private Double scoreRisque;
    private String niveauRisque;
    private List<String> facteursRisque;
    private List<String> recommandations;
}
