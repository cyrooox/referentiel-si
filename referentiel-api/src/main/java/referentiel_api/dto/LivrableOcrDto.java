package referentiel_api.dto;

public class LivrableOcrDto {
    private String nomLivrable;
    private String description;
    private String datePrevue;

    public LivrableOcrDto() {}

    public LivrableOcrDto(String nomLivrable, String description) {
        this.nomLivrable = nomLivrable;
        this.description = description;
    }

    public String getNomLivrable() {
        return nomLivrable;
    }

    public void setNomLivrable(String nomLivrable) {
        this.nomLivrable = nomLivrable;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getDatePrevue() {
        return datePrevue;
    }

    public void setDatePrevue(String datePrevue) {
        this.datePrevue = datePrevue;
    }
}
