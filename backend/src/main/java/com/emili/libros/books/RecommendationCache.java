package com.emili.libros.books;

import com.emili.libros.books.dto.BookSearchResult;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Caché de los libros populares por género (topic). Los listados de Project
 * Gutenberg cambian lentamente, así que un TTL largo evita golpear la API externa
 * en cada visita al inicio.
 */
@Component
public class RecommendationCache {

    private static final long TTL_MS = 60 * 60 * 1000L;

    private final Map<String, Entry> entries = new ConcurrentHashMap<>();

    private static String key(String topic, String language) {
        String normalizedTopic = topic.trim().toLowerCase(Locale.ROOT);
        String normalizedLanguage = language == null ? "" : language.trim().toLowerCase(Locale.ROOT);
        return normalizedLanguage + "|" + normalizedTopic;
    }

    public List<BookSearchResult> get(String topic, String language) {
        String key = key(topic, language);
        Entry entry = entries.get(key);
        if (entry == null) {
            return null;
        }
        if (entry.expiresAt() < System.currentTimeMillis()) {
            entries.remove(key);
            return null;
        }
        return entry.value();
    }

    public void put(String topic, String language, List<BookSearchResult> value) {
        entries.put(key(topic, language), new Entry(System.currentTimeMillis() + TTL_MS, List.copyOf(value)));
    }

    public void clear() {
        entries.clear();
    }

    private record Entry(long expiresAt, List<BookSearchResult> value) {
    }
}
