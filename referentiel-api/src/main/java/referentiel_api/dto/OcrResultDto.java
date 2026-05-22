package referentiel_api.dto;

import lombok.Data;
import java.util.List;
import java.util.ArrayList;

/**
 * DTO retourné par l'OCR après extraction des informations d'un document.
 * Chaque champ correspond à un champ du formulaire NewProjectWizard.
 * Un champ null signifie qu'il n'a pas été détecté dans le document.
 */
@Data
public class OcrResultDto {

    // ── Section 1 : Informations générales ──
    private String nom;
    private String description;
    private String type;
    private String directionMetier;
    private String statut;
    private String phaseCourante;
    private String nomChefDeProjet;

    // ── Section 2 : Planning ──
    private String dateDebutPrevue;   // format yyyy-MM-dd
    private String dateFinPrevue;     // format yyyy-MM-dd
    private String dateCreation;

    // ── Section 3 : Contrats & Prestataires ──
    private String referenceContrat;
    private String objetMarche;
    private String prestataire;
    private String typeMarche;
    private Double montantContractuel;
    private Integer delaiExecutionMois;

    // Nouveau champ pour les tableaux Tabula
    private List<LivrableOcrDto> livrablesExtraits = new ArrayList<>();

    // ── Section 5 : Budget & Finances ──
    private Double budgetInitial;

    // ── Métadonnées de l'extraction ──
    private String texteBrut;         // Texte complet extrait (pour debug)
    private String methodeExtraction; // "PDFBOX" ou "SCAN_NON_SUPPORTE"
    private int nbPagesTraitees;
}
