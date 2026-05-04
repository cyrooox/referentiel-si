package referentiel_api.services;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import referentiel_api.dto.OcrResultDto;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service OCR : extrait le texte d'un PDF puis parse les informations projet.
 * Utilise Apache PDFBox pour les PDFs avec texte natif.
 */
@Service
public class OcrService {

    // ── Patterns de dates (formats français courants) ──
    private static final Pattern DATE_PATTERN = Pattern.compile(
        "\\b(\\d{1,2})[/\\-\\.](\\d{1,2})[/\\-\\.](\\d{4})\\b|\\b(\\d{4})[/\\-\\.](\\d{1,2})[/\\-\\.](\\d{1,2})\\b"
    );

    // ── Patterns de montants (ex: 1 500 000,00 MAD ou 1500000 DH) ──
    private static final Pattern MONTANT_PATTERN = Pattern.compile(
        "([\\d\\s\\.]+(?:[,\\.][\\d]{2})?)\\s*(?:MAD|DH|Dirhams?|MMDH)",
        Pattern.CASE_INSENSITIVE
    );

    // ── Patterns de référence marché ──
    private static final Pattern REF_PATTERN = Pattern.compile(
        "(?:Réf(?:érence)?|N°|Marché\\s+n°)[\\s:]*([A-Z0-9][A-Z0-9\\-/\\.]{3,30})",
        Pattern.CASE_INSENSITIVE
    );

    // ── Patterns de délai ──
    private static final Pattern DELAI_PATTERN = Pattern.compile(
        "(\\d+)\\s*(?:mois|MOIS)",
        Pattern.CASE_INSENSITIVE
    );

    /**
     * Point d'entrée principal : extrait et parse un document uploadé.
     */
    public OcrResultDto extractFromDocument(MultipartFile file) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String fileName = originalFilename != null ? originalFilename.toLowerCase() : "";

        if (fileName.endsWith(".pdf")) {
            return extractFromPdf(file);
        } else {
            OcrResultDto result = new OcrResultDto();
            result.setMethodeExtraction("FORMAT_NON_SUPPORTE");
            result.setTexteBrut("Format non supporté. Utilisez un fichier PDF.");
            return result;
        }
    }

    /**
     * Extraction depuis un PDF avec texte natif (PDFBox).
     */
    private OcrResultDto extractFromPdf(MultipartFile file) throws IOException {
        OcrResultDto result = new OcrResultDto();
        result.setMethodeExtraction("PDFBOX");

        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String texte = stripper.getText(document);
            result.setTexteBrut(texte);
            result.setNbPagesTraitees(document.getNumberOfPages());
            parseTexte(texte, result);
        }

        return result;
    }

    /**
     * Parse le texte brut extrait et remplit le DTO avec les informations trouvées.
     */
    private void parseTexte(String texte, OcrResultDto result) {
        if (texte == null || texte.isBlank()) return;

        String[] lignes = texte.split("\\r?\\n");

        for (int i = 0; i < lignes.length; i++) {
            String l = lignes[i].trim();
            if (l.isEmpty()) continue;
            String lLower = l.toLowerCase();

            // ── Nom du projet / Objet ──
            if (result.getNom() == null && (lLower.startsWith("nom du projet") || lLower.startsWith("objet") || lLower.startsWith("intitulé"))) {
                String val = l.replaceAll("(?i)^(nom du projet|objet|intitulé)\\s*(du marché|de l'accord|du contrat)?\\s*[:\\-]?\\s*", "").trim();
                if (val.isEmpty() && i + 1 < lignes.length) val = lignes[i+1].trim();
                if (val.length() > 3) {
                    result.setNom(capitaliser(val));
                    result.setObjetMarche(capitaliser(val));
                }
            }

            // ── Description ──
            if (result.getDescription() == null && (lLower.startsWith("description") || lLower.startsWith("résumé") || lLower.startsWith("contexte"))) {
                String val = l.replaceAll("(?i)^(description|résumé|contexte)\\s*[:\\-]?\\s*", "").trim();
                if (val.isEmpty() && i + 1 < lignes.length) val = lignes[i+1].trim();
                if (val.length() > 5) result.setDescription(val);
            }

            // ── Type de projet ──
            if (result.getType() == null && lLower.contains("type de projet")) {
                Matcher m = Pattern.compile("(?i)type de projet\\s*[:\\-]?\\s*(.*?)(?:Statut|$)").matcher(l);
                if (m.find()) {
                    String val = m.group(1).trim();
                    if (val.isEmpty() && i + 1 < lignes.length) val = lignes[i+1].trim();
                    if (val.length() > 2) result.setType(capitaliser(val));
                }
            }

            // ── Statut ──
            if (result.getStatut() == null && lLower.contains("statut")) {
                Matcher m = Pattern.compile("(?i)statut\\s*[:\\-]?\\s*(.*?)(?:Direction|Chef|Phase|$)").matcher(l);
                if (m.find()) {
                    String val = m.group(1).trim();
                    if (val.isEmpty() && i + 1 < lignes.length) val = lignes[i+1].trim();
                    if (val.length() > 2) result.setStatut(capitaliser(val));
                }
            }

            // ── Chef de projet ──
            if (result.getNomChefDeProjet() == null && lLower.contains("chef de projet")) {
                Matcher m = Pattern.compile("(?i)chef de projet\\s*[:\\-]?\\s*(.*?)(?:Direction|Phase|$)").matcher(l);
                if (m.find()) {
                    String val = m.group(1).trim();
                    if (val.isEmpty() && i + 1 < lignes.length) val = lignes[i+1].trim();
                    if (val.length() > 2) result.setNomChefDeProjet(capitaliser(val));
                }
            }

            // ── Direction métier ──
            if (result.getDirectionMetier() == null && (lLower.contains("direction metier") || lLower.contains("direction métier") || lLower.contains("maître d'ouvrage"))) {
                Matcher m = Pattern.compile("(?i)(?:direction m[eé]tier|maître d'ouvrage)\\s*[:\\-]?\\s*(.*?)(?:Phase|$)").matcher(l);
                if (m.find()) {
                    String val = m.group(1).trim();
                    if (val.isEmpty() && i + 1 < lignes.length) val = lignes[i+1].trim();
                    if (val.length() > 2) result.setDirectionMetier(capitaliser(val));
                }
            }

            // ── Phase du projet ──
            if (result.getPhaseCourante() == null && lLower.contains("phase du projet")) {
                Matcher m = Pattern.compile("(?i)phase du projet\\s*[:\\-]?\\s*(.+)").matcher(l);
                if (m.find()) {
                    String val = m.group(1).trim();
                    if (val.isEmpty() && i + 1 < lignes.length) val = lignes[i+1].trim();
                    if (val.length() > 2) result.setPhaseCourante(capitaliser(val));
                }
            }

            // ── Prestataire / Titulaire ──
            if (result.getPrestataire() == null && (lLower.contains("prestataire") || lLower.contains("titulaire") || lLower.contains("fournisseur"))) {
                Matcher m = Pattern.compile("(?i)(?:prestataire\\(s\\)|prestataire|titulaire|fournisseur)\\s*[:\\-]?\\s*(.*?)(?:Type|R[eé]f[eé]rence|D[eé]lai|$)").matcher(l);
                if (m.find()) {
                    String val = m.group(1).trim();
                    if (val.isEmpty() && i + 1 < lignes.length) val = lignes[i+1].trim();
                    if (val.length() > 2) result.setPrestataire(capitaliser(val));
                }
            }

            // ── Référence marché ──
            if (result.getReferenceContrat() == null && lLower.contains("reference marche")) {
                Matcher m = Pattern.compile("(?i)reference marche\\s*[:\\-]?\\s*([A-Z0-9\\-]+)").matcher(l);
                if (m.find()) {
                    result.setReferenceContrat(m.group(1).trim());
                }
            }
        }

        // ── Référence du marché ──
        Matcher refMatcher = REF_PATTERN.matcher(texte);
        if (refMatcher.find() && result.getReferenceContrat() == null) {
            result.setReferenceContrat(refMatcher.group(1).trim());
        }

        // ── Délai d'exécution ──
        Matcher delaiMatcher = DELAI_PATTERN.matcher(texte);
        if (delaiMatcher.find() && result.getDelaiExecutionMois() == null) {
            try {
                result.setDelaiExecutionMois(Integer.parseInt(delaiMatcher.group(1)));
            } catch (NumberFormatException ignored) {}
        }

        // ── Montant ──
        Matcher montantMatcher = MONTANT_PATTERN.matcher(texte);
        if (montantMatcher.find() && result.getMontantContractuel() == null) {
            try {
                String montantStr = montantMatcher.group(1)
                    .replaceAll("\\s", "")
                    .replace(",", ".")
                    .replace("..", ".");
                double montant = Double.parseDouble(montantStr);
                result.setMontantContractuel(montant);
                result.setBudgetInitial(montant);
            } catch (NumberFormatException ignored) {}
        }

        // ── Dates (début / fin) ──
        Matcher dateMatcher = DATE_PATTERN.matcher(texte);
        int dateCount = 0;
        while (dateMatcher.find() && dateCount < 2) {
            String dateIso = normaliserDate(dateMatcher.group());
            if (dateIso != null) {
                if (dateCount == 0) result.setDateDebutPrevue(dateIso);
                else result.setDateFinPrevue(dateIso);
                dateCount++;
            }
        }
    }

    // ── Utilitaires ──

    private String capitaliser(String texte) {
        if (texte == null || texte.isBlank()) return texte;
        String clean = texte.trim();
        return clean.substring(0, 1).toUpperCase() + clean.substring(1);
    }

    private String normaliserDate(String dateStr) {
        // Formats supportés : dd/MM/yyyy, dd-MM-yyyy, yyyy-MM-dd
        String[] formats = {"dd/MM/yyyy", "dd-MM-yyyy", "dd.MM.yyyy", "yyyy-MM-dd", "yyyy/MM/dd"};
        for (String fmt : formats) {
            try {
                LocalDate date = LocalDate.parse(dateStr, DateTimeFormatter.ofPattern(fmt));
                return date.format(DateTimeFormatter.ISO_LOCAL_DATE);
            } catch (DateTimeParseException ignored) {}
        }
        return null;
    }
}
