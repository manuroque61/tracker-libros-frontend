package com.emili.libros.books;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Catálogo de géneros principales. El "slug" es el término que se envía a Gutendex
 * como parámetro {@code topic} y la "label" es el texto que ve el usuario.
 */
public final class Genres {

    public record Genre(String slug, String label) {
    }

    public static final List<Genre> ALL = List.of(
            new Genre("adventure", "Aventura"),
            new Genre("science fiction", "Ciencia ficción"),
            new Genre("mystery", "Misterio"),
            new Genre("romance", "Romance"),
            new Genre("fantasy", "Fantasía"));

    private Genres() {
    }

    public static List<Genre> pickRandom(int count) {
        List<Genre> shuffled = new ArrayList<>(ALL);
        Collections.shuffle(shuffled, ThreadLocalRandom.current());
        return List.copyOf(shuffled.subList(0, Math.min(count, shuffled.size())));
    }

    public static List<Genre> resolve(List<String> slugs) {
        if (slugs == null || slugs.isEmpty()) {
            return List.of();
        }
        List<Genre> resolved = new ArrayList<>();
        for (String slug : slugs) {
            if (slug == null || slug.isBlank()) {
                continue;
            }
            String normalized = slug.trim().toLowerCase(Locale.ROOT);
            for (Genre genre : ALL) {
                if (genre.slug().equals(normalized) && !resolved.contains(genre)) {
                    resolved.add(genre);
                }
            }
        }
        return resolved;
    }
}
