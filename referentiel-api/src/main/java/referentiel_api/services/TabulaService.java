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
import java.util.ArrayList;
import java.util.List;

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
                    for (List<RectangularTextContainer> row : rows) {
                        if (row.size() >= 2) {
                            String col1 = row.get(0).getText().replaceAll("\\r?\\n", " ").trim();
                            String col2 = row.get(1).getText().replaceAll("\\r?\\n", " ").trim();

                            // Heuristique simple: on ignore les lignes vides ou les en-têtes évidentes
                            if (!col1.isEmpty() && col1.length() > 3 &&
                                    !col1.toLowerCase().contains("livrable") &&
                                    !col1.toLowerCase().contains("phase")) {

                                LivrableOcrDto dto = new LivrableOcrDto(col1, col2);
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
}
