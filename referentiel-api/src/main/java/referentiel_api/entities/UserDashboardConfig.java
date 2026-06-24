package referentiel_api.entities;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "user_dashboard_configs")
public class UserDashboardConfig {

    @Id
    private String keycloakUserId;

    @ElementCollection
    @CollectionTable(name = "user_pinned_projects", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "project_id")
    @Builder.Default
    private List<Long> pinnedProjectIds = new ArrayList<>();

    @Column(columnDefinition = "TEXT")
    private String widgetConfig; // JSON string
}
