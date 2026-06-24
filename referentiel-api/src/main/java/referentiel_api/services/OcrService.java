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

    private final NlpService nlpService;
    private final TabulaService tabulaService;

    public OcrService(NlpService nlpService, TabulaService tabulaService) {
        this.nlpService = nlpService;
        this.tabulaService = tabulaService;
    }

    // ── Patterns de dates (formats français courants numériques et textuels) ──
    private static final Pattern DATE_PATTERN = Pattern.compile(
        "\\b(\\d{1,2})[/\\-\\.](\\d{1,2})[/\\-\\.](\\d{4})\\b|\\b(\\d{4})[/\\-\\.](\\d{1,2})[/\\-\\.](\\d{1,2})\\b|\\b(\\d{1,2}|1er)\\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\\s+(\\d{4})\\b",
        Pattern.CASE_INSENSITIVE
    );

    // ── Patterns de montants (ex: 1 500 000,00 MAD ou 1.5 MMDH) ──
    private static final Pattern MONTANT_PATTERN = Pattern.compile(
        "\\b([\\d\\s\\.]+(?:[,\\.][\\d]+)?)\\s*(?:MAD|DH|Dirhams?|MMDH|MDH|€|EUR|USD|Dollars?)\\b",
        Pattern.CASE_INSENSITIVE
    );

    // ── Patterns de référence marché ──
    private static final Pattern REF_PATTERN = Pattern.compile(
        "(?:Réf(?:érence)?|N°|Marché\\s+n°|Contrat\\s+n°)[\\s:]*([A-Z0-9][A-Z0-9\\-/\\.]{3,30})",
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
        result.setMethodeExtraction("PDFBOX_TABULA_NLP");

        // 1. Extraction des tableaux via Tabula
        java.util.List<referentiel_api.dto.LivrableOcrDto> livrables = tabulaService.extractTablesAsLivrables(file);
        result.setLivrablesExtraits(livrables);

        // 2. Extraction du texte brut via PDFBox
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String texte = stripper.getText(document);
            result.setTexteBrut(texte);
            result.setNbPagesTraitees(document.getNumberOfPages());
            parseTexte(texte, result);
        }

        return result;
    }

    private String extraireValeurChamp(String ligneCourante, String ligneSuivante, String patternStr) {
        Matcher m = Pattern.compile("(?i)(?:" + patternStr + ")\\s*[:\\-]?\\s*(.*)").matcher(ligneCourante);
        if (m.find()) {
            String val = m.group(1).trim();
            if (val.isEmpty() && ligneSuivante != null) {
                val = ligneSuivante.trim();
            }
            val = val.replaceAll("^[:\\-\\s]+", "").trim();
            if (!val.isEmpty()) {
                return val;
            }
        }
        return null;
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
            String nextLine = (i + 1 < lignes.length) ? lignes[i+1].trim() : null;

            // ── Nom du projet / Objet ──
            if (result.getNom() == null) {
                String val = extraireValeurChamp(l, nextLine, "nom\\s+(?:du\\s+)?projet|intitulé\\s+(?:du\\s+)?projet|intitulé|objet\\s+(?:du\\s+)?marché|objet\\s+(?:du\\s+)?projet|nom\\s+de\\s+l'opération|nom\\s+de\\s+l'operation|titre\\s+(?:du\\s+)?projet|intitulé\\s+de\\s+l'opération|intitule\\s+de\\s+l'operation");
                if (val != null && val.length() > 3) {
                    result.setNom(capitaliser(val));
                    result.setObjetMarche(capitaliser(val));
                }
            }

            // ── Description ──
            if (result.getDescription() == null) {
                String val = extraireValeurChamp(l, nextLine, "description|résumé|resume|contexte\\s+général|contexte\\s+general|contexte|objectifs|but\\s+du\\s+projet");
                if (val != null && val.length() > 5) {
                    result.setDescription(val);
                }
            }

            // ── Type de projet ──
            if (result.getType() == null) {
                String val = extraireValeurChamp(l, nextLine, "type\\s+(?:de\\s+)?projet|nature\\s+(?:du\\s+)?projet|type|nature|catégorie\\s+(?:du\\s+)?projet|categorie\\s+(?:du\\s+)?projet");
                if (val != null && val.length() > 2) {
                    result.setType(capitaliser(val));
                }
            }

            // ── Statut ──
            if (result.getStatut() == null) {
                String val = extraireValeurChamp(l, nextLine, "statut\\s+(?:du\\s+)?projet|statut|état|etat|situation\\s+(?:du\\s+)?projet");
                if (val != null && val.length() > 2) {
                    result.setStatut(capitaliser(val));
                }
            }

            // ── Chef de projet ──
            if (result.getNomChefDeProjet() == null) {
                String val = extraireValeurChamp(l, nextLine, "chef\\s+(?:de\\s+)?projet|responsable\\s+(?:du\\s+)?projet|chef\\s+de\\s+projet\\s+dsi|cdp|pilote\\s+(?:de\\s+)?projet|conducteur\\s+(?:de\\s+)?projet|chef\\s+de\\s+projet|interlocuteur\\s+dsi|responsable\\s+opérationnel");
                if (val != null && val.length() > 2 && !val.toLowerCase().contains("direction") && !val.toLowerCase().contains("phase")) {
                    result.setNomChefDeProjet(capitaliser(val));
                }
            }

            // ── Direction métier ──
            if (result.getDirectionMetier() == null) {
                String val = extraireValeurChamp(l, nextLine, "direction\\s+métier|direction\\s+metier|direction\\s+client|maître\\s+d'ouvrage|moa|entité\\s+demanderesse|entite\\s+demanderesse|direction\\s+bénéficiaire|direction\\s+beneficiaire|sponsor|entité|entite");
                if (val != null && val.length() > 2 && !val.toLowerCase().contains("phase")) {
                    result.setDirectionMetier(capitaliser(val));
                }
            }

            // ── Phase du projet ──
            if (result.getPhaseCourante() == null) {
                String val = extraireValeurChamp(l, nextLine, "phase\\s+(?:du\\s+)?projet|phase\\s+courante|phase|étape\\s+actuelle|etape\\s+actuelle|jalon");
                if (val != null && val.length() > 2) {
                    result.setPhaseCourante(capitaliser(val));
                }
            }

            // ── Prestataire / Titulaire ──
            if (result.getPrestataire() == null) {
                String val = extraireValeurChamp(l, nextLine, "prestataire\\(s\\)|prestataire|titulaire\\s+(?:du\\s+)?marché|titulaire\\s+(?:du\\s+)?marche|titulaire|fournisseur|société|societe|contractant|attributaire|cabinet");
                if (val != null && val.length() > 2 && !val.toLowerCase().contains("type") && !val.toLowerCase().contains("référence") && !val.toLowerCase().contains("reference") && !val.toLowerCase().contains("délai")) {
                    result.setPrestataire(capitaliser(val));
                }
            }

            // ── Référence marché ──
            if (result.getReferenceContrat() == null) {
                String val = extraireValeurChamp(l, nextLine, "référence\\s+(?:du\\s+)?marché|référence\\s+(?:du\\s+)?marche|référence\\s+marché|reference\\s+marche|n°\\s+(?:du\\s+)?marché|n°\\s+(?:du\\s+)?marche|n°\\s+marché|n°\\s+marche|marché\\s+n°|marche\\s+n°|référence\\s+contrat|reference\\s+contrat|n°\\s+contrat|numéro\\s+contrat|numero\\s+contrat|contrat\\s+n°|contrat\\s+n");
                if (val != null) {
                    result.setReferenceContrat(val);
                }
            }

            // ── Dates contextuelles ──
            if (result.getDateDebutPrevue() == null) {
                String val = extraireValeurChamp(l, nextLine, "date\\s+de\\s+début|date\\s+de\\s+debut|date\\s+début|date\\s+debut|démarrage|demarrage|date\\s+lancement");
                if (val != null) {
                    String dateIso = normaliserDate(val);
                    if (dateIso != null) result.setDateDebutPrevue(dateIso);
                }
            }
            if (result.getDateFinPrevue() == null) {
                String val = extraireValeurChamp(l, nextLine, "date\\s+de\\s+fin|date\\s+fin|échéance|echeance|fin\\s+prévue|fin\\s+prevue|deadline|date\\s+clôture|date\\s+cloture");
                if (val != null) {
                    String dateIso = normaliserDate(val);
                    if (dateIso != null) result.setDateFinPrevue(dateIso);
                }
            }
            if (result.getDateCreation() == null) {
                String val = extraireValeurChamp(l, nextLine, "date\\s+de\\s+création|date\\s+de\\s+creation|date\\s+création|date\\s+creation|signé\\s+le|signe\\s+le");
                if (val != null) {
                    String dateIso = normaliserDate(val);
                    if (dateIso != null) result.setDateCreation(dateIso);
                }
            }

            // ── Délai d'exécution ──
            if (result.getDelaiExecutionMois() == null) {
                String val = extraireValeurChamp(l, nextLine, "délai\\s+d'exécution|delai\\s+d'execution|délai\\s+d’exécution|délai|delai");
                if (val != null) {
                    Matcher m = Pattern.compile("(\\d+)\\s*(?:mois|MOIS)").matcher(val);
                    if (m.find()) {
                        result.setDelaiExecutionMois(Integer.parseInt(m.group(1)));
                    }
                }
            }

            // ── Montant ──
            if (result.getMontantContractuel() == null) {
                String val = extraireValeurChamp(l, nextLine, "montant\\s+contractuel|montant\\s+du\\s+marché|montant\\s+du\\s+marche|montant|budget|coût|cout");
                if (val != null) {
                    Matcher m = MONTANT_PATTERN.matcher(val);
                    if (m.find()) {
                        try {
                            String matchStr = m.group(0).toLowerCase();
                            String valStr = m.group(1).replaceAll("\\s", "").replace(",", ".").replace("..", ".");
                            if (valStr.endsWith(".")) valStr = valStr.substring(0, valStr.length() - 1);
                            double montant = Double.parseDouble(valStr);
                            if (matchStr.contains("mmdh")) {
                                montant = montant * 1_000_000_000.0;
                            } else if (matchStr.contains("mdh")) {
                                montant = montant * 1_000_000.0;
                            }
                            result.setMontantContractuel(montant);
                            result.setBudgetInitial(montant);
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
        }

        // Replis globaux si non trouvés par le parseur de lignes
        if (result.getReferenceContrat() == null) {
            Matcher refMatcher = REF_PATTERN.matcher(texte);
            if (refMatcher.find()) {
                result.setReferenceContrat(refMatcher.group(1).trim());
            }
        }

        if (result.getDelaiExecutionMois() == null) {
            Matcher delaiMatcher = DELAI_PATTERN.matcher(texte);
            if (delaiMatcher.find()) {
                try {
                    result.setDelaiExecutionMois(Integer.parseInt(delaiMatcher.group(1)));
                } catch (NumberFormatException ignored) {}
            }
        }

        if (result.getMontantContractuel() == null) {
            Matcher montantMatcher = MONTANT_PATTERN.matcher(texte);
            if (montantMatcher.find()) {
                try {
                    String matchStr = montantMatcher.group(0).toLowerCase();
                    String montantStr = montantMatcher.group(1)
                        .replaceAll("\\s", "")
                        .replace(",", ".")
                        .replace("..", ".");
                    if (montantStr.endsWith(".")) montantStr = montantStr.substring(0, montantStr.length() - 1);
                    double montant = Double.parseDouble(montantStr);
                    if (matchStr.contains("mmdh")) {
                        montant = montant * 1_000_000_000.0;
                    } else if (matchStr.contains("mdh")) {
                        montant = montant * 1_000_000.0;
                    }
                    result.setMontantContractuel(montant);
                    result.setBudgetInitial(montant);
                } catch (NumberFormatException ignored) {}
            }
        }

        // Repli dates génériques dans l'ordre
        if (result.getDateDebutPrevue() == null || result.getDateFinPrevue() == null) {
            Matcher dateMatcher = DATE_PATTERN.matcher(texte);
            int dateCount = 0;
            while (dateMatcher.find()) {
                String dateIso = normaliserDate(dateMatcher.group());
                if (dateIso != null) {
                    if (result.getDateDebutPrevue() == null && dateCount == 0) {
                        result.setDateDebutPrevue(dateIso);
                        dateCount++;
                    } else if (result.getDateFinPrevue() == null) {
                        result.setDateFinPrevue(dateIso);
                        break;
                    }
                }
            }
        }

        // --- 🤖 ENRICHISSEMENT PAR INTELLIGENCE ARTIFICIELLE (NLP) CONTEXTUEL ---
        
        // Extraction contextuelle pour le Chef de projet
        if (result.getNomChefDeProjet() == null) {
            String contexteChef = extraireContexte(texte, "chef de projet", 150);
            java.util.List<String> personnes = nlpService.extractPersons(contexteChef);
            if (!personnes.isEmpty()) {
                result.setNomChefDeProjet(capitaliser(personnes.get(0)));
            }
        }

        // Extraction contextuelle pour le Prestataire
        if (result.getPrestataire() == null) {
            String contextePres = extraireContexte(texte, "prestataire", 150);
            if (contextePres.equals(texte)) contextePres = extraireContexte(texte, "titulaire", 150);
            
            java.util.List<String> organisations = nlpService.extractOrganizations(contextePres);
            if (!organisations.isEmpty()) {
                result.setPrestataire(capitaliser(organisations.get(0)));
            }
        }
    }

    // ── Utilitaires ──

    private String extraireContexte(String texte, String motCle, int rayon) {
        int index = texte.toLowerCase().indexOf(motCle.toLowerCase());
        if (index == -1) return texte; // On retourne tout si on ne trouve pas le mot-clé
        
        int start = Math.max(0, index - rayon);
        int end = Math.min(texte.length(), index + motCle.length() + rayon);
        return texte.substring(start, end);
    }

    private String capitaliser(String texte) {
        if (texte == null || texte.isBlank()) return texte;
        String clean = texte.trim();
        return clean.substring(0, 1).toUpperCase() + clean.substring(1);
    }

    private String normaliserDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        String clean = dateStr.trim().toLowerCase().replaceAll("\\s+", " ");
        
        // Formats supportés numériques
        String[] formats = {"dd/MM/yyyy", "dd-MM-yyyy", "dd.MM.yyyy", "yyyy-MM-dd", "yyyy/MM/dd"};
        for (String fmt : formats) {
            try {
                LocalDate date = LocalDate.parse(clean, DateTimeFormatter.ofPattern(fmt));
                return date.format(DateTimeFormatter.ISO_LOCAL_DATE);
            } catch (DateTimeParseException ignored) {}
        }

        // Dates textuelles en français (ex: "15 juin 2026" ou "1er janvier 2025")
        Pattern pTextDate = Pattern.compile(
            "(\\d{1,2}|1er)\\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\\s+(\\d{4})"
        );
        Matcher mTextDate = pTextDate.matcher(clean);
        if (mTextDate.find()) {
            String dayStr = mTextDate.group(1);
            if (dayStr.equals("1er")) dayStr = "1";
            String monthStr = mTextDate.group(2);
            String yearStr = mTextDate.group(3);

            try {
                int day = Integer.parseInt(dayStr);
                int month = getMonthNumber(monthStr);
                int year = Integer.parseInt(yearStr);

                if (month > 0) {
                    return LocalDate.of(year, month, day).format(DateTimeFormatter.ISO_LOCAL_DATE);
                }
            } catch (Exception ignored) {}
        }

        // Format mois + année (ex: "juin 2026")
        Pattern pMonthYear = Pattern.compile(
            "\\b(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\\s+(\\d{4})\\b"
        );
        Matcher mMonthYear = pMonthYear.matcher(clean);
        if (mMonthYear.find()) {
            String monthStr = mMonthYear.group(1);
            String yearStr = mMonthYear.group(2);

            try {
                int month = getMonthNumber(monthStr);
                int year = Integer.parseInt(yearStr);

                if (month > 0) {
                    return LocalDate.of(year, month, 1).format(DateTimeFormatter.ISO_LOCAL_DATE);
                }
            } catch (Exception ignored) {}
        }

        return null;
    }

    private int getMonthNumber(String monthStr) {
        switch (monthStr.toLowerCase()) {
            case "janvier": return 1;
            case "février": case "fevrier": return 2;
            case "mars": return 3;
            case "avril": return 4;
            case "mai": return 5;
            case "juin": return 6;
            case "juillet": return 7;
            case "août": case "aout": return 8;
            case "septembre": return 9;
            case "octobre": return 10;
            case "novembre": return 11;
            case "décembre": case "decembre": return 12;
            default: return -1;
        }
    }
}
