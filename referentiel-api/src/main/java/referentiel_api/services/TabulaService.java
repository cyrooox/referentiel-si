package referentiel_api.services;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import referentiel_api.dto.LivrableOcrDto;
import technology.tabula.ObjectExtractor;
import technology.tabula.Page;
import technology.tabula.RectangularTextContainer;
import technology.tabula.Table;
import technology.tabula.extractors.BasicExtractionAlgorithm;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class TabulaService {

    public List<LivrableOcrDto> extractTablesAsLivrables(MultipartFile file) {
        List<LivrableOcrDto> livrables = new ArrayList<>();

        try (InputStream in = file.getInputStream();
                PDDocument document = Loader.loadPDF(in.readAllBytes())) {

            ObjectExtractor oe = new ObjectExtractor(document);
            BasicExtractionAlgorithm sea = new BasicExtractionAlgorithm();

            for (int p = 1; p <= document.getNumberOfPages(); p++) {
                Page page = oe.extract(p);
                List<Table> tables = sea.extract(page);

                for (Table table : tables) {
                    @SuppressWarnings("rawtypes")
                    List<List<RectangularTextContainer>> rows = table.getRows();
                    
                    int nameColIdx = -1;
                    int descColIdx = -1;
                    int dateColIdx = -1;
                    int headerRowIdx = -1;

                    // 1. Détection de la ligne d'en-tête (parmi les 3 premières lignes)
                    int scanLimit = Math.min(3, rows.size());
                    for (int i = 0; i < scanLimit; i++) {
                        List<RectangularTextContainer> row = rows.get(i);
                        boolean isHeader = false;
                        for (int j = 0; j < row.size(); j++) {
                            String text = row.get(j).getText().toLowerCase();
                            if (text.contains("livrable") || text.contains("désignation") || text.contains("designation") ||
                                text.contains("description") || text.contains("échéance") || text.contains("echeance") ||
                                text.contains("date") || text.contains("jalon") || text.contains("libellé") || text.contains("libelle")) {
                                isHeader = true;
                            }
                        }
                        if (isHeader) {
                            headerRowIdx = i;
                            for (int j = 0; j < row.size(); j++) {
                                String text = row.get(j).getText().toLowerCase();
                                if (text.contains("livrable") || text.contains("désignation") || text.contains("designation") || 
                                    text.contains("nom") || text.contains("titre") || text.contains("libellé") || text.contains("libelle") || text.contains("intitulé") || text.contains("intitule")) {
                                    if (nameColIdx == -1) nameColIdx = j;
                                } else if (text.contains("description") || text.contains("détail") || text.contains("detail") || text.contains("objet") || text.contains("contenu")) {
                                    if (descColIdx == -1) descColIdx = j;
                                } else if (text.contains("date") || text.contains("échéance") || text.contains("echeance") || text.contains("délai") || text.contains("delai") || text.contains("fin") || text.contains("planning") || text.contains("livraison")) {
                                    if (dateColIdx == -1) dateColIdx = j;
                                }
                            }
                            break; // En-tête trouvée
                        }
                    }

                    // Si pas d'en-tête trouvée, ou si l'index du nom n'a pas été détecté, on utilise la logique par défaut
                    boolean useDynamic = (nameColIdx != -1);

                    for (int i = 0; i < rows.size(); i++) {
                        // On saute la ligne d'en-tête
                        if (i == headerRowIdx) continue;

                        List<RectangularTextContainer> row = rows.get(i);
                        if (row.size() < 2) continue;

                        if (useDynamic) {
                            String nomLivrable = row.get(nameColIdx).getText().replaceAll("\\r?\\n", " ").trim();
                            
                            // Ignorer les lignes vides ou en-têtes résiduelles
                            if (nomLivrable.isEmpty() || nomLivrable.length() <= 2 || 
                                nomLivrable.toLowerCase().contains("livrable") || 
                                nomLivrable.toLowerCase().contains("phase")) {
                                continue;
                            }

                            String description = "";
                            if (descColIdx != -1 && descColIdx < row.size()) {
                                description = row.get(descColIdx).getText().replaceAll("\\r?\\n", " ").trim();
                            }

                            String datePrevue = null;
                            if (dateColIdx != -1 && dateColIdx < row.size()) {
                                String dateText = row.get(dateColIdx).getText().replaceAll("\\r?\\n", " ").trim();
                                datePrevue = extractDate(dateText);
                                if (descColIdx == -1 && !dateText.isEmpty() && datePrevue == null) {
                                    description = dateText;
                                }
                            }

                            // Si description n'a pas été affectée, on concatène les colonnes restantes (non mappées)
                            if (description.isEmpty()) {
                                StringBuilder sbDesc = new StringBuilder();
                                for (int j = 0; j < row.size(); j++) {
                                    if (j != nameColIdx && j != dateColIdx) {
                                        sbDesc.append(row.get(j).getText().replaceAll("\\r?\\n", " ").trim()).append(" ");
                                    }
                                }
                                description = sbDesc.toString().trim();
                            }

                            LivrableOcrDto dto = new LivrableOcrDto();
                            dto.setNomLivrable(nomLivrable);
                            dto.setDescription(description);
                            dto.setDatePrevue(datePrevue);
                            livrables.add(dto);

                        } else {
                            // Logique de repli par défaut (statique)
                            String col1 = row.get(0).getText().replaceAll("\\r?\\n", " ").trim();
                            String col2 = row.get(1).getText().replaceAll("\\r?\\n", " ").trim();
                            String col3 = row.size() >= 3 ? row.get(2).getText().replaceAll("\\r?\\n", " ").trim() : "";
                            String col4 = row.size() >= 4 ? row.get(3).getText().replaceAll("\\r?\\n", " ").trim() : "";

                            if (!col1.isEmpty() && col1.length() > 3 &&
                                    !col1.toLowerCase().contains("livrable") &&
                                    !col1.toLowerCase().contains("phase")) {

                                String datePrevue = null;
                                String description = col2;

                                String dateCol2 = extractDate(col2);
                                String dateCol3 = extractDate(col3);
                                String dateCol4 = extractDate(col4);

                                if (dateCol2 != null) {
                                    datePrevue = dateCol2;
                                    description = "";
                                } else if (dateCol3 != null) {
                                    datePrevue = dateCol3;
                                    description = col2;
                                } else if (dateCol4 != null) {
                                    datePrevue = dateCol4;
                                    description = col2 + " " + col3;
                                } else if (!col3.isEmpty()) {
                                    description = col2 + " " + col3;
                                }

                                LivrableOcrDto dto = new LivrableOcrDto();
                                dto.setNomLivrable(col1);
                                dto.setDescription(description.trim());
                                dto.setDatePrevue(datePrevue);
                                livrables.add(dto);
                            }
                        }
                    }
                }
            }
            oe.close();
        } catch (Exception e) {
            System.err.println("Erreur Tabula lors de l'extraction des tableaux : " + e.getMessage());
            e.printStackTrace();
        }

        return livrables;
    }

    private String extractDate(String text) {
        if (text == null || text.isEmpty()) return null;
        Matcher m = Pattern.compile(
            "\\b(\\d{1,2})[/\\-\\.](\\d{1,2})[/\\-\\.](\\d{4})\\b|\\b(\\d{4})[/\\-\\.](\\d{1,2})[/\\-\\.](\\d{1,2})\\b"
        ).matcher(text);
        if (m.find()) {
            return normaliserDate(m.group());
        }
        return null;
    }

    private String normaliserDate(String dateStr) {
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
