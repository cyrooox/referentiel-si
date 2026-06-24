package referentiel_api.services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import referentiel_api.entities.Notification;
import referentiel_api.entities.Projet;
import referentiel_api.entities.Utilisateur;
import referentiel_api.repositories.NotificationRepository;
import referentiel_api.repositories.ProjetRepository;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

@Service
public class NotificationSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(NotificationSchedulerService.class);

    @Autowired
    private ProjetRepository projetRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private NotificationService notificationService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        log.info("🚀 Application ready. Triggering initial notifications check...");
        checkAndGenerateNotifications();
    }

    @Scheduled(fixedDelay = 60000) // Run every 60 seconds
    public void runScheduledCheck() {
        log.info("⏰ Running scheduled notifications check...");
        checkAndGenerateNotifications();
    }

    public synchronized void checkAndGenerateNotifications() {
        try {
            List<Projet> projets = projetRepository.findAll();
            for (Projet p : projets) {
                checkBudgetOverrun(p);
                checkUpcomingTaskDeadlines(p);
            }
        } catch (Exception e) {
            log.error("Error during notifications check: ", e);
        }
    }

    public void checkSingleProject(Projet p) {
        if (p == null) return;
        try {
            checkBudgetOverrun(p);
            checkUpcomingTaskDeadlines(p);
        } catch (Exception e) {
            log.error("Error during single project check for project " + p.getCode() + ": ", e);
        }
    }

    private void checkBudgetOverrun(Projet p) {
        if (p.getBudgetInitial() != null && p.getBudgetConsomme() != null) {
            if (p.getBudgetConsomme() > p.getBudgetInitial()) {
                List<Utilisateur> chefs = p.getChefDeProjet();
                if (chefs != null) {
                    for (Utilisateur chef : chefs) {
                        if (chef.getEmail() != null && !chef.getEmail().isBlank()) {
                            String email = chef.getEmail().toLowerCase();
                            String title = "Dépassement de budget - " + p.getCode();
                            String message = String.format(
                                "Le budget consommé (%,.2f MAD) du projet \"%s\" a dépassé son budget initial (%,.2f MAD).",
                                p.getBudgetConsomme(), p.getNom(), p.getBudgetInitial()
                            );
                            
                            // Check if duplicate notification already exists for this email, project and type
                            boolean exists = notificationRepository.existsByRecipientUserIdAndProjectIdAndType(email, p.getId(), "BUDGET_DEPASSE");
                            if (!exists) {
                                log.info("Creating BUDGET_DEPASSE notification for chef: {} on project: {}", email, p.getCode());
                                notificationService.createNotification(email, "BUDGET_DEPASSE", title, message, p.getId(), p.getCode());
                            }
                        }
                    }
                }
            }
        }
    }

    private void checkUpcomingTaskDeadlines(Projet p) {
        String todoListJson = p.getTodoList();
        if (todoListJson == null || todoListJson.isBlank()) {
            return;
        }

        try {
            List<Map<String, Object>> tasks = objectMapper.readValue(todoListJson, new TypeReference<List<Map<String, Object>>>() {});
            LocalDate today = LocalDate.now();

            for (Map<String, Object> task : tasks) {
                String status = (String) task.get("status");
                if ("Terminé".equalsIgnoreCase(status)) {
                    continue;
                }

                String taskId = (String) task.get("id");
                String taskName = (String) task.get("name");
                String dueDateStr = (String) task.get("dueDate");
                if (dueDateStr == null || dueDateStr.isBlank()) {
                    dueDateStr = (String) task.get("dueDateRangeEnd");
                }

                if (dueDateStr != null && !dueDateStr.isBlank()) {
                    try {
                        LocalDate dueDate = LocalDate.parse(dueDateStr, DateTimeFormatter.ISO_LOCAL_DATE);
                        long daysBetween = ChronoUnit.DAYS.between(today, dueDate);

                        // If task is overdue or due within 3 days
                        if (daysBetween <= 3) {
                            List<Utilisateur> chefs = p.getChefDeProjet();
                            if (chefs != null) {
                                for (Utilisateur chef : chefs) {
                                    if (chef.getEmail() != null && !chef.getEmail().isBlank()) {
                                        String email = chef.getEmail().toLowerCase();
                                        String title = "Échéance proche - " + taskName;
                                        String message = String.format(
                                            "La tâche \"%s\" du projet \"%s\" (%s) arrive à échéance le %s.",
                                            taskName, p.getNom(), p.getCode(), dueDateStr
                                        );

                                        // Check if notification already exists for this chef, project, and task
                                        String messagePart = "La tâche \"" + taskName + "\"";
                                        boolean exists = notificationRepository.existsByRecipientUserIdAndProjectIdAndTypeAndMessageContaining(
                                            email, p.getId(), "ECHEANCE", messagePart
                                        );
                                        
                                        if (!exists) {
                                            log.info("Creating ECHEANCE notification for chef: {} on task: {}", email, taskName);
                                            notificationService.createNotification(email, "ECHEANCE", title, message, p.getId(), p.getCode());
                                        }
                                    }
                                }
                            }
                        }
                    } catch (Exception parseException) {
                        log.warn("Could not parse task dueDate: {} for project: {}", dueDateStr, p.getCode());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Could not parse todoList JSON for project: {}", p.getCode(), e);
        }
    }
}
