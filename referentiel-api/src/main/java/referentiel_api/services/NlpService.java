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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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
        List<String> persons = extractPersonsFrench(text);
        if (tokenizer != null && personModel != null && text != null && !text.isBlank()) {
            try {
                String[] tokens = tokenizer.tokenize(text);
                NameFinderME personFinder = new NameFinderME(personModel);
                Span[] spans = personFinder.find(tokens);

                for (Span s : spans) {
                    StringBuilder sb = new StringBuilder();
                    for (int i = s.getStart(); i < s.getEnd(); i++) {
                        sb.append(tokens[i]).append(" ");
                    }
                    String name = sb.toString().trim();
                    if (name.length() > 2 && !persons.contains(name)) {
                        persons.add(name);
                    }
                }
                personFinder.clearAdaptiveData();
            } catch (Exception ignored) {}
        }
        return persons;
    }

    /**
     * Extrait les noms d'organisations/entreprises du texte.
     */
    public List<String> extractOrganizations(String text) {
        List<String> orgs = extractOrganizationsFrench(text);
        if (tokenizer != null && orgModel != null && text != null && !text.isBlank()) {
            try {
                String[] tokens = tokenizer.tokenize(text);
                NameFinderME orgFinder = new NameFinderME(orgModel);
                Span[] spans = orgFinder.find(tokens);

                for (Span s : spans) {
                    StringBuilder sb = new StringBuilder();
                    for (int i = s.getStart(); i < s.getEnd(); i++) {
                        sb.append(tokens[i]).append(" ");
                    }
                    String org = sb.toString().trim();
                    if (org.length() > 2 && !orgs.contains(org)) {
                        orgs.add(org);
                    }
                }
                orgFinder.clearAdaptiveData();
            } catch (Exception ignored) {}
        }
        return orgs;
    }

    private List<String> extractPersonsFrench(String text) {
        List<String> persons = new ArrayList<>();
        if (text == null || text.isBlank()) return persons;

        java.util.Set<String> excludeWords = new java.util.HashSet<>(java.util.Arrays.asList(
            "projet", "chef", "dsi", "metiere", "metier", "direction", "suivi", "fiche", "date", 
            "fin", "debut", "prevue", "reelle", "montant", "budget", "initial", "consomme", 
            "prestataire", "titulaire", "marché", "marche", "contrat", "reference", "ref", "delai", 
            "execution", "mois", "phase", "courante", "livrable", "livrables", "statut", "objet", 
            "contexte", "description", "taux", "avancement", "etat", "sante", "risque", "risques", 
            "action", "actions", "commentaire", "commentaires", "comite", "copil", "reunion", 
            "note", "notes", "dsi", "pmo", "moa", "moe", "sarl", "sas", "eurl", "gie", "sa", 
            "group", "groupe", "cabinet", "societe", "société", "rapport", "rapports", "audit", 
            "securite", "sécurité", "conformité", "conformite", "homologation", "dsi", "pmo",
            "le", "la", "les", "du", "de", "des", "en", "un", "une", "pour", "par", "dans", "sur",
            "au", "aux", "et", "ou", "ce", "cet", "cette", "ces", "mon", "ton", "son", "notre", "votre",
            "leur", "leurs", "nous", "vous", "ils", "elles", "est", "sont", "ont", "a", "avec", "sans",
            "pour", "dont", "qui", "que", "quoi", "titre", "responsable", "pilote", "dsi/pmo",
            "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
            "janvier", "fevrier", "février", "mars", "avril", "mai", "juin", "juillet", "aout", "août",
            "septembre", "octobre", "novembre", "décembre", "decembre", "fiche", "suivi", "projet"
        ));

        // Pattern pour détecter des noms propres précédés d'un marqueur
        Pattern pPrefix = Pattern.compile(
            "\\b(?:M\\.|Mme|Mr|Monsieur|Madame|Dr|par|de|CDP|CdP)\\s+([A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ\\-]+(?:\\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ\\-]+)+)\\b"
        );
        Matcher mPrefix = pPrefix.matcher(text);
        while (mPrefix.find()) {
            String name = mPrefix.group(1).trim();
            if (isValidName(name, excludeWords)) {
                persons.add(name);
            }
        }

        // Pattern général : séquences de 2 ou 3 mots capitalisés
        Pattern pGeneral = Pattern.compile(
            "\\b([A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ\\-]+(?:\\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ\\-]+){1,2})\\b"
        );
        Matcher mGeneral = pGeneral.matcher(text);
        while (mGeneral.find()) {
            String name = mGeneral.group(1).trim();
            if (isValidName(name, excludeWords) && !persons.contains(name)) {
                persons.add(name);
            }
        }

        return persons;
    }

    private boolean isValidName(String name, java.util.Set<String> excludeWords) {
        String[] parts = name.split("\\s+");
        if (parts.length < 2) return false;
        for (String part : parts) {
            if (part.length() <= 1) return false;
            if (excludeWords.contains(part.toLowerCase())) return false;
        }
        return true;
    }

    private List<String> extractOrganizationsFrench(String text) {
        List<String> orgs = new ArrayList<>();
        if (text == null || text.isBlank()) return orgs;

        // Détection avec abréviation d'entreprise
        Pattern pSuffix = Pattern.compile(
            "\\b([A-ZÀ-ÖØ-Ý0-9][a-zA-Zà-öø-ÿ0-9\\-\\s\\.\\&]{2,40})\\s+(?:SARL|SA|SAS|EURL|GIE|S\\.A\\.|S\\.A\\.S\\.|S\\.A\\.R\\.L\\.)\\b"
        );
        Matcher mSuffix = pSuffix.matcher(text);
        while (mSuffix.find()) {
            String org = mSuffix.group(1).trim();
            if (org.length() > 2 && !orgs.contains(org)) {
                orgs.add(org);
            }
        }

        // Détection avec préfixe
        Pattern pPrefix = Pattern.compile(
            "\\b(?:société|societe|groupe|group|cabinet|entreprise|établissement|etablissement|attributaire|prestataire)\\s+([A-ZÀ-ÖØ-Ý0-9][a-zA-Zà-öø-ÿ0-9\\-\\s\\.\\&]{2,40})\\b",
            Pattern.CASE_INSENSITIVE
        );
        Matcher mPrefix = pPrefix.matcher(text);
        while (mPrefix.find()) {
            String org = mPrefix.group(1).trim();
            String cleanOrg = cleanOrgName(org);
            if (cleanOrg.length() > 2 && !orgs.contains(cleanOrg)) {
                orgs.add(cleanOrg);
            }
        }

        // Cas particulier de mots en majuscules dans le contexte
        Pattern pUpper = Pattern.compile(
            "\\b([A-Z][A-Z0-9\\-\\s\\.\\&]{3,30})\\b"
        );
        Matcher mUpper = pUpper.matcher(text);
        while (mUpper.find()) {
            String org = mUpper.group(1).trim();
            if (!org.equals("PRESTATAIRE") && !org.equals("TITULAIRE") && !org.equals("MARCHE") && !org.equals("CONTRAT") && org.length() > 2) {
                if (!orgs.contains(org)) orgs.add(org);
            }
        }

        return orgs;
    }

    private String cleanOrgName(String org) {
        String[] stopWords = {"est", "a", "pour", "dans", "sur", "au", "du", "en", "un", "une", "le", "la", "les", "de", "d'", "attribué", "attribue", "conforme", "selon"};
        String temp = org;
        for (String sw : stopWords) {
            int idx = (" " + temp + " ").toLowerCase().indexOf(" " + sw + " ");
            if (idx != -1) {
                temp = temp.substring(0, idx).trim();
            }
        }
        temp = temp.replaceAll("[,\\.\\:\\;]+$", "").trim();
        return temp;
    }
}
