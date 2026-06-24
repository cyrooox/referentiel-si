package referentiel_api.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import referentiel_api.entities.ProjectTag;
import referentiel_api.services.TagService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tags")
@CrossOrigin(origins = "http://localhost:5173")
public class TagController {

    @Autowired
    private TagService tagService;

    @GetMapping
    public List<ProjectTag> getAllTags() {
        return tagService.getAllTags();
    }

    @GetMapping("/search")
    public List<ProjectTag> searchTags(@RequestParam("q") String query) {
        return tagService.searchTags(query);
    }

    @PostMapping
    public ProjectTag createTag(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String color = body.getOrDefault("color", "#6366f1");
        return tagService.createTag(name, color);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTag(@PathVariable Long id) {
        tagService.deleteTag(id);
        return ResponseEntity.noContent().build();
    }
}
