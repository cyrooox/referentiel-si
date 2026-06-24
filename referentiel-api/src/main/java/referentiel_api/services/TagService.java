package referentiel_api.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import referentiel_api.entities.ProjectTag;
import referentiel_api.repositories.TagRepository;

import java.util.List;

@Service
public class TagService {

    @Autowired
    private TagRepository tagRepository;

    /**
     * Return all existing tags.
     */
    public List<ProjectTag> getAllTags() {
        return tagRepository.findAll();
    }

    /**
     * Search tags by name (case-insensitive, contains).
     */
    public List<ProjectTag> searchTags(String query) {
        return tagRepository.findByNameContainingIgnoreCase(query);
    }

    /**
     * Find an existing tag by name or create a new one.
     */
    public ProjectTag createTag(String name, String color) {
        return tagRepository.findByName(name).orElseGet(() -> {
            ProjectTag tag = ProjectTag.builder()
                    .name(name)
                    .color(color)
                    .build();
            return tagRepository.save(tag);
        });
    }

    /**
     * Delete a tag by id.
     */
    public void deleteTag(Long id) {
        tagRepository.deleteById(id);
    }
}
