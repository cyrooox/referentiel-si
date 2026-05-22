package referentiel_api.services;

import jakarta.annotation.PostConstruct;
import opennlp.tools.namefind.NameFinderME;
import opennlp.tools.namefind.TokenNameFinderModel;
import opennlp.tools.tokenize.TokenizerME;
import opennlp.tools.tokenize.TokenizerModel;
import opennlp.tools.util.Span;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Service
public class NlpService {

    private TokenizerME tokenizer;
    private TokenNameFinderModel personModel;
    private TokenNameFinderModel orgModel;

    @PostConstruct
    public void init() {
        try {
            // Chargement du modèle Tokenizer
            try (InputStream tokenModelIn = getClass().getResourceAsStream("/models/en-token.bin")) {
                if (tokenModelIn != null) {
                    TokenizerModel tModel = new TokenizerModel(tokenModelIn);
                    tokenizer = new TokenizerME(tModel);
                } else {
                    System.err.println("Modèle en-token.bin non trouvé.");
                }
            }

            // Chargement du modèle de Personnes
            try (InputStream personModelIn = getClass().getResourceAsStream("/models/en-ner-person.bin")) {
                if (personModelIn != null) {
                    personModel = new TokenNameFinderModel(personModelIn);
                } else {
                    System.err.println("Modèle en-ner-person.bin non trouvé.");
                }
            }

            // Chargement du modèle d'Organisations
            try (InputStream orgModelIn = getClass().getResourceAsStream("/models/en-ner-organization.bin")) {
                if (orgModelIn != null) {
                    orgModel = new TokenNameFinderModel(orgModelIn);
                } else {
                    System.err.println("Modèle en-ner-organization.bin non trouvé.");
                }
            }
        } catch (Exception e) {
            System.err.println("Erreur lors de l'initialisation des modèles NLP : " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Extrait les noms de personnes du texte.
     */
    public List<String> extractPersons(String text) {
        List<String> persons = new ArrayList<>();
        if (tokenizer == null || personModel == null || text == null || text.isBlank()) return persons;

        String[] tokens = tokenizer.tokenize(text);
        NameFinderME personFinder = new NameFinderME(personModel);
        Span[] spans = personFinder.find(tokens);

        for (Span s : spans) {
            StringBuilder sb = new StringBuilder();
            for (int i = s.getStart(); i < s.getEnd(); i++) {
                sb.append(tokens[i]).append(" ");
            }
            persons.add(sb.toString().trim());
        }
        personFinder.clearAdaptiveData();
        return persons;
    }

    /**
     * Extrait les noms d'organisations/entreprises du texte.
     */
    public List<String> extractOrganizations(String text) {
        List<String> orgs = new ArrayList<>();
        if (tokenizer == null || orgModel == null || text == null || text.isBlank()) return orgs;

        String[] tokens = tokenizer.tokenize(text);
        NameFinderME orgFinder = new NameFinderME(orgModel);
        Span[] spans = orgFinder.find(tokens);

        for (Span s : spans) {
            StringBuilder sb = new StringBuilder();
            for (int i = s.getStart(); i < s.getEnd(); i++) {
                sb.append(tokens[i]).append(" ");
            }
            orgs.add(sb.toString().trim());
        }
        orgFinder.clearAdaptiveData();
        return orgs;
    }
}
