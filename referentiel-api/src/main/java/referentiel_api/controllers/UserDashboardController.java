package referentiel_api.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import referentiel_api.entities.UserDashboardConfig;
import referentiel_api.repositories.UserDashboardConfigRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "http://localhost:5173")
public class UserDashboardController {

    @Autowired
    private UserDashboardConfigRepository dashboardConfigRepository;

    /**
     * Get dashboard config for the current authenticated user.
     * Creates an empty config if none exists yet.
     */
    @GetMapping("/config")
    public UserDashboardConfig getConfig(Authentication authentication) {
        String userId = authentication.getName();
        return dashboardConfigRepository.findById(userId).orElseGet(() -> {
            UserDashboardConfig config = UserDashboardConfig.builder()
                    .keycloakUserId(userId)
                    .pinnedProjectIds(new ArrayList<>())
                    .build();
            return dashboardConfigRepository.save(config);
        });
    }

    /**
     * Save / replace the full dashboard config for the current user.
     * Body: { pinnedProjectIds: [...], widgetConfig: "..." }
     */
    @PutMapping("/config")
    public UserDashboardConfig saveConfig(Authentication authentication,
                                          @RequestBody Map<String, Object> body) {
        String userId = authentication.getName();

        UserDashboardConfig config = dashboardConfigRepository.findById(userId)
                .orElse(UserDashboardConfig.builder()
                        .keycloakUserId(userId)
                        .pinnedProjectIds(new ArrayList<>())
                        .build());

        if (body.containsKey("pinnedProjectIds")) {
            @SuppressWarnings("unchecked")
            List<Object> rawIds = (List<Object>) body.get("pinnedProjectIds");
            List<Long> ids = new ArrayList<>();
            for (Object o : rawIds) {
                if (o instanceof Number) {
                    ids.add(((Number) o).longValue());
                } else {
                    ids.add(Long.parseLong(o.toString()));
                }
            }
            config.setPinnedProjectIds(ids);
        }

        if (body.containsKey("widgetConfig")) {
            config.setWidgetConfig((String) body.get("widgetConfig"));
        }

        return dashboardConfigRepository.save(config);
    }

    /**
     * Pin a project for the current user.
     */
    @PostMapping("/pin/{projectId}")
    public UserDashboardConfig pinProject(Authentication authentication,
                                          @PathVariable Long projectId) {
        String userId = authentication.getName();
        UserDashboardConfig config = dashboardConfigRepository.findById(userId)
                .orElse(UserDashboardConfig.builder()
                        .keycloakUserId(userId)
                        .pinnedProjectIds(new ArrayList<>())
                        .build());

        if (!config.getPinnedProjectIds().contains(projectId)) {
            config.getPinnedProjectIds().add(projectId);
        }
        return dashboardConfigRepository.save(config);
    }

    /**
     * Unpin a project for the current user.
     */
    @DeleteMapping("/pin/{projectId}")
    public ResponseEntity<UserDashboardConfig> unpinProject(Authentication authentication,
                                                             @PathVariable Long projectId) {
        String userId = authentication.getName();
        return dashboardConfigRepository.findById(userId).map(config -> {
            config.getPinnedProjectIds().remove(projectId);
            return ResponseEntity.ok(dashboardConfigRepository.save(config));
        }).orElse(ResponseEntity.notFound().build());
    }
}
