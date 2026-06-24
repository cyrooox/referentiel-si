package referentiel_api.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import referentiel_api.entities.ValidationRequest;
import referentiel_api.repositories.ValidationRequestRepository;
import referentiel_api.repositories.ProjetRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.core.type.TypeReference;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/validation-requests")
@CrossOrigin(origins = "http://localhost:5173")
public class ValidationRequestController {

    @Autowired
    private ValidationRequestRepository validationRequestRepository;

    @Autowired
    private ProjetRepository projetRepository;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * Create a new validation request.
     * Body: { actionType, actionDescription, projectId, projectCode,
     *         requestedByUserId, requestedByUserName }
     */
    @PostMapping
    public ValidationRequest createRequest(@RequestBody ValidationRequest request) {
        request.setStatus("PENDING");
        request.setRequestedAt(LocalDateTime.now());
        request.setResolvedAt(null);
        return validationRequestRepository.save(request);
    }

    /**
     * Get all PENDING requests (PMO / Admin view).
     */
    @GetMapping("/pending")
    public List<ValidationRequest> getPending() {
        return validationRequestRepository.findByStatusOrderByRequestedAtDesc("PENDING");
    }

    /**
     * Get requests created by the current authenticated user.
     */
    @GetMapping("/mine")
    public List<ValidationRequest> getMyRequests(Authentication authentication) {
        String userId = authentication.getName();
        return validationRequestRepository.findByRequestedByUserIdOrderByRequestedAtDesc(userId);
    }

    /**
     * Get all requests for a specific project.
     */
    @GetMapping("/project/{projectId}")
    public List<ValidationRequest> getByProject(@PathVariable Long projectId) {
        return validationRequestRepository.findByProjectIdOrderByRequestedAtDesc(projectId);
    }

    /**
     * Approve a validation request.
     * Body: { validatedByUserId, validatedByUserName }
     */
    @PutMapping("/{id}/approve")
    public ResponseEntity<ValidationRequest> approveRequest(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return validationRequestRepository.findById(id).map(req -> {
            req.setStatus("APPROVED");
            req.setValidatedByUserId(body.get("validatedByUserId"));
            req.setValidatedByUserName(body.get("validatedByUserName"));
            req.setResolvedAt(LocalDateTime.now());

            // Apply the proposed changes to the project
            if (req.getProjectId() != null && req.getProposedChanges() != null && !req.getProposedChanges().isBlank()) {
                projetRepository.findById(req.getProjectId()).ifPresent(projet -> {
                    try {
                        JsonNode rootNode = objectMapper.readTree(req.getProposedChanges());
                        boolean updated = false;

                        if ("MODIFICATION_BUDGET".equals(req.getActionType())) {
                            if (rootNode.has("budgetInitial")) {
                                projet.setBudgetInitial(rootNode.get("budgetInitial").asDouble());
                                updated = true;
                            }
                            if (rootNode.has("dateFinPrevue")) {
                                String dateStr = rootNode.get("dateFinPrevue").asText();
                                if (dateStr != null && !"null".equals(dateStr) && !dateStr.isBlank()) {
                                    projet.setDateFinPrevue(java.sql.Date.valueOf(dateStr));
                                    updated = true;
                                }
                            }
                        } else if ("VALIDATION_PHASE".equals(req.getActionType())) {
                            if (rootNode.has("sousPhases")) {
                                List<referentiel_api.entities.SousPhase> newPhases = objectMapper.readValue(
                                    rootNode.get("sousPhases").traverse(),
                                    new TypeReference<List<referentiel_api.entities.SousPhase>>() {}
                                );
                                if (newPhases != null) {
                                    projet.getSousPhases().clear();
                                    for (referentiel_api.entities.SousPhase sp : newPhases) {
                                        sp.setProjet(projet);
                                        projet.getSousPhases().add(sp);
                                    }
                                    updated = true;
                                }
                            }
                        } else if ("MODIFICATION_TACHES".equals(req.getActionType())) {
                            if (rootNode.has("todoList")) {
                                projet.setTodoList(rootNode.get("todoList").asText());
                                updated = true;
                            }
                        } else if ("CLOTURE_PROJET".equals(req.getActionType())) {
                            projet.setStatut("Terminé");
                            projet.setDateReelleFin(new java.util.Date());
                            updated = true;
                        }

                        if (updated) {
                            projetRepository.save(projet);
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                });
            }

            return ResponseEntity.ok(validationRequestRepository.save(req));
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Reject a validation request.
     * Body: { validatedByUserId, validatedByUserName, rejectionReason }
     */
    @PutMapping("/{id}/reject")
    public ResponseEntity<ValidationRequest> rejectRequest(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return validationRequestRepository.findById(id).map(req -> {
            req.setStatus("REJECTED");
            req.setValidatedByUserId(body.get("validatedByUserId"));
            req.setValidatedByUserName(body.get("validatedByUserName"));
            req.setRejectionReason(body.get("rejectionReason"));
            req.setResolvedAt(LocalDateTime.now());
            return ResponseEntity.ok(validationRequestRepository.save(req));
        }).orElse(ResponseEntity.notFound().build());
    }
}
