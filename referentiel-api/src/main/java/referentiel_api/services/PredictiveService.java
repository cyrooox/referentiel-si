package referentiel_api.services;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import referentiel_api.dto.PrestatairePerformanceDto;
import referentiel_api.dto.ProjectDelayRiskDto;
import referentiel_api.entities.*;
import referentiel_api.repositories.PrestataireRepository;
import referentiel_api.repositories.ProjetRepository;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Optional;

@Service
public class PredictiveService {

    private final ProjetRepository projetRepository;
    private final PrestataireRepository prestataireRepository;

    public PredictiveService(ProjetRepository projetRepository, PrestataireRepository prestataireRepository) {
        this.projetRepository = projetRepository;
        this.prestataireRepository = prestataireRepository;
    }

    /**
     * Calcule le risque de retard pour un projet donné.
     */
    @Transactional(readOnly = true)
    public Optional<ProjectDelayRiskDto> calculateProjectDelayRisk(Long projectId) {
        Optional<Projet> optProjet = projetRepository.findById(projectId);
        if (optProjet.isEmpty()) {
            return Optional.empty();
        }
        Projet projet = optProjet.get();

        double score = 0.0;
        List<String> facteurs = new ArrayList<>();
        List<String> recommandations = new ArrayList<>();

        // ── FACTEUR 1 : Gravité des Risques Identifiés ──
        if (projet.getRisques() != null && !projet.getRisques().isEmpty()) {
            int highRisks = 0;
            int mediumRisks = 0;
            for (Risque r : projet.getRisques()) {
                if ("Fort".equalsIgnoreCase(r.getImpact())) {
                    highRisks++;
                } else if ("Moyen".equalsIgnoreCase(r.getImpact())) {
                    mediumRisks++;
                }
            }

            if (highRisks > 0) {
                double penalty = Math.min(30.0, highRisks * 15.0);
                score += penalty;
                facteurs.add(highRisks + " risque(s) de criticité 'Fort' identifié(s) (+ " + Math.round(penalty) + "%)");
                recommandations.add("Mettre en œuvre immédiatement des plans de traitement pour les risques critiques.");
            }
            if (mediumRisks > 0) {
                double penalty = Math.min(15.0, mediumRisks * 5.0);
                score += penalty;
                facteurs.add(mediumRisks + " risque(s) de criticité 'Moyen' identifié(s) (+ " + Math.round(penalty) + "%)");
                recommandations.add("Assurer un suivi régulier des risques de niveau moyen.");
            }
        }

        // ── FACTEUR 2 : Retard dans le planning (Temps écoulé vs Avancement) ──
        if (projet.getDateDebutPrevue() != null && projet.getDateFinPrevue() != null) {
            Date now = new Date();
            Date start = projet.getDateDebutPrevue();
            Date end = projet.getDateFinPrevue();

            if (now.after(start) && !"Terminé".equalsIgnoreCase(projet.getStatut())) {
                long totalDuration = end.getTime() - start.getTime();
                long elapsed = now.getTime() - start.getTime();

                if (totalDuration > 0 && elapsed > 0) {
                    double percentTimeElapsed = (elapsed * 100.0) / totalDuration;
                    int avancement = projet.getTauxAvancement() != null ? projet.getTauxAvancement() : 0;

                    if (now.after(end)) {
                        score += 40.0;
                        facteurs.add("Date de fin prévue dépassée depuis le " + formatDate(end) + " (+40%)");
                        recommandations.add("Le projet est hors délai. Négocier un avenant de délai ou mobiliser une task-force de livraison.");
                    } else if (percentTimeElapsed > avancement) {
                        double gap = percentTimeElapsed - avancement;
                        if (gap > 15.0) {
                            double penalty = Math.min(30.0, gap * 0.8);
                            score += penalty;
                            facteurs.add(String.format("Le temps écoulé (%.0f%%) dépasse significativement l'avancement (%d%%) (+%.0f%%)", percentTimeElapsed, avancement, penalty));
                            recommandations.add("Réallouer des ressources ou optimiser le planning des phases restantes pour combler l'écart d'avancement.");
                        }
                    }
                }
            }
        } else {
            facteurs.add("Dates prévues (début/fin) non renseignées (Impossibilité d'évaluer le retard sur planning)");
            recommandations.add("Renseigner les dates de début et fin prévues pour activer le calcul de retard de planification.");
        }

        // ── FACTEUR 3 : Fiabilité du Prestataire lié ──
        if (projet.getContrats() != null && !projet.getContrats().isEmpty()) {
            for (Contrat c : projet.getContrats()) {
                if (c.getPrestataire() != null) {
                    Prestataire prestataire = c.getPrestataire();
                    PrestatairePerformanceDto perf = evaluatePrestataire(prestataire);

                    if (perf.getProjetsAssociesCount() > 0 && perf.getRetardMoyenJours() > 5.0) {
                        double penalty = Math.min(20.0, perf.getRetardMoyenJours() * 0.5);
                        score += penalty;
                        facteurs.add(String.format("Prestataire '%s' historique de retard moyen de %.1f jours (+%.0f%%)", prestataire.getNom(), perf.getRetardMoyenJours(), penalty));
                        recommandations.add("Mettre en place un plan de suivi rapproché (COPIL hebdomadaire) avec le prestataire " + prestataire.getNom() + ".");
                    }
                }
            }
        }

        // Limitation du score entre 0% et 100%
        score = Math.min(100.0, Math.max(0.0, score));

        String niveau = "Faible";
        if (score > 70.0) {
            niveau = "Élevé";
        } else if (score > 40.0) {
            niveau = "Modéré";
        }

        // Vérification de la cohérence avec l'état de santé saisi
        String etatSante = projet.getEtatSante();
        if ("Élevé".equals(niveau) && !"Rouge".equalsIgnoreCase(etatSante)) {
            recommandations.add("Alerte : Le score de risque suggère de passer la météo du projet à 'Rouge'.");
        } else if ("Modéré".equals(niveau) && "Vert".equalsIgnoreCase(etatSante)) {
            recommandations.add("Conseil : Passer l'état de santé du projet à 'Orange' (Surveillance).");
        }

        if (recommandations.isEmpty()) {
            recommandations.add("Le projet se déroule conformément aux prévisions. Maintenir le rythme actuel.");
        }

        return Optional.of(ProjectDelayRiskDto.builder()
                .scoreRisque(Math.round(score * 10.0) / 10.0) // 1 chiffre après la virgule
                .niveauRisque(niveau)
                .facteursRisque(facteurs)
                .recommandations(recommandations)
                .build());
    }

    /**
     * Calcule les indicateurs de performance pour un prestataire donné.
     */
    @Transactional(readOnly = true)
    public Optional<PrestatairePerformanceDto> calculatePrestatairePerformance(Long prestataireId) {
        return prestataireRepository.findById(prestataireId)
                .map(this::evaluatePrestataire);
    }

    /**
     * Calcule les indicateurs de performance pour un prestataire donné par son nom.
     */
    @Transactional(readOnly = true)
    public Optional<PrestatairePerformanceDto> calculatePrestatairePerformanceByNom(String nom) {
        if (nom == null || nom.isBlank()) {
            return Optional.empty();
        }
        return prestataireRepository.findByNom(nom.trim())
                .map(this::evaluatePrestataire)
                .or(() -> Optional.of(PrestatairePerformanceDto.builder()
                        .nomPrestataire(nom)
                        .scoreGlobal(100.0)
                        .scoreRespectDelais(100.0)
                        .scoreRespectBudget(100.0)
                        .scoreQualiteLivrables(100.0)
                        .projetsAssociesCount(0)
                        .retardMoyenJours(0.0)
                        .glissementBudgetMoyen(0.0)
                        .build()));
    }

    private PrestatairePerformanceDto evaluatePrestataire(Prestataire prestataire) {
        List<Contrat> contrats = prestataire.getContrats();
        if (contrats == null || contrats.isEmpty()) {
            return PrestatairePerformanceDto.builder()
                    .nomPrestataire(prestataire.getNom())
                    .scoreGlobal(100.0)
                    .scoreRespectDelais(100.0)
                    .scoreRespectBudget(100.0)
                    .scoreQualiteLivrables(100.0)
                    .projetsAssociesCount(0)
                    .retardMoyenJours(0.0)
                    .glissementBudgetMoyen(0.0)
                    .build();
        }

        int completedProjectsCount = 0;
        int activeProjectsCount = 0;
        double sumRespectDelais = 0.0;
        double sumRespectBudget = 0.0;
        double totalDelaysDays = 0.0;
        double totalOverrunPct = 0.0;

        // Suivi des livrables
        int totalLivrables = 0;
        int validatedLivrables = 0;

        for (Contrat c : contrats) {
            Projet p = c.getProjet();
            if (p == null) continue;

            activeProjectsCount++;

            // Analyse des livrables pour la qualité
            if (p.getSousPhases() != null) {
                for (SousPhase sp : p.getSousPhases()) {
                    if (sp.getLivrables() != null) {
                        for (Livrable l : sp.getLivrables()) {
                            totalLivrables++;
                            if (Boolean.TRUE.equals(l.getEstValide())) {
                                validatedLivrables++;
                            }
                        }
                    }
                }
            }

            // Un projet est considéré comme terminé s'il a une date de fin réelle ou s'il est au statut Terminé
            boolean isCompleted = p.getDateReelleFin() != null || "Terminé".equalsIgnoreCase(p.getStatut());

            if (isCompleted) {
                completedProjectsCount++;

                // 1. Calcul du respect des délais
                Date prevue = p.getDateFinPrevue();
                Date reelle = p.getDateReelleFin() != null ? p.getDateReelleFin() : new Date();

                if (prevue != null) {
                    long delayMs = reelle.getTime() - prevue.getTime();
                    double delayDays = Math.max(0.0, delayMs / (1000.0 * 60.0 * 60.0 * 24.0));
                    totalDelaysDays += delayDays;

                    double delayScore = 100.0;
                    if (delayDays > 0.0) {
                        delayScore = Math.max(0.0, 100.0 - (delayDays * 1.5));
                    }
                    sumRespectDelais += delayScore;
                } else {
                    sumRespectDelais += 100.0; // Pas de date de fin définie = considéré à l'heure par défaut
                }

                // 2. Calcul du respect du budget
                Double initial = p.getBudgetInitial() != null ? p.getBudgetInitial() : c.getMontantContractuel();
                Double consomme = p.getBudgetConsomme() != null ? p.getBudgetConsomme() : 0.0;

                if (initial != null && initial > 0.0) {
                    double overrun = consomme - initial;
                    double overrunPct = Math.max(0.0, (overrun / initial) * 100.0);
                    totalOverrunPct += overrunPct;

                    double budgetScore = 100.0;
                    if (overrunPct > 0.0) {
                        budgetScore = Math.max(0.0, 100.0 - (overrunPct * 2.0));
                    }
                    sumRespectBudget += budgetScore;
                } else {
                    sumRespectBudget += 100.0;
                }
            }
        }

        // Scores finaux par critère
        double respectDelais = completedProjectsCount > 0 ? (sumRespectDelais / completedProjectsCount) : 100.0;
        double respectBudget = completedProjectsCount > 0 ? (sumRespectBudget / completedProjectsCount) : 100.0;
        double qualiteLivrables = totalLivrables > 0 ? ((double) validatedLivrables * 100.0 / totalLivrables) : 100.0;

        // Arrondi des indicateurs
        respectDelais = Math.round(respectDelais * 10.0) / 10.0;
        respectBudget = Math.round(respectBudget * 10.0) / 10.0;
        qualiteLivrables = Math.round(qualiteLivrables * 10.0) / 10.0;

        double scoreGlobal = (respectDelais * 0.4) + (respectBudget * 0.3) + (qualiteLivrables * 0.3);
        scoreGlobal = Math.round(scoreGlobal * 10.0) / 10.0;

        double retardMoyen = completedProjectsCount > 0 ? (totalDelaysDays / completedProjectsCount) : 0.0;
        double glissementBudget = completedProjectsCount > 0 ? (totalOverrunPct / completedProjectsCount) : 0.0;

        return PrestatairePerformanceDto.builder()
                .nomPrestataire(prestataire.getNom())
                .scoreGlobal(scoreGlobal)
                .scoreRespectDelais(respectDelais)
                .scoreRespectBudget(respectBudget)
                .scoreQualiteLivrables(qualiteLivrables)
                .projetsAssociesCount(activeProjectsCount)
                .retardMoyenJours(Math.round(retardMoyen * 10.0) / 10.0)
                .glissementBudgetMoyen(Math.round(glissementBudget * 10.0) / 10.0)
                .build();
    }

    private String formatDate(Date date) {
        if (date == null) return "N/A";
        return new java.text.SimpleDateFormat("dd/MM/yyyy").format(date);
    }
}
