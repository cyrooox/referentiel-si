package referentiel_api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrestatairePerformanceDto {
    private String nomPrestataire;
    private Double scoreGlobal;
    private Double scoreRespectDelais;
    private Double scoreRespectBudget;
    private Double scoreQualiteLivrables;
    private Integer projetsAssociesCount;
    private Double retardMoyenJours;
    private Double glissementBudgetMoyen;
}
