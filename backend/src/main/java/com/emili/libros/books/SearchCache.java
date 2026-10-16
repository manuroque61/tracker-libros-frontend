package com.emili.libros.books;

import com.emili.libros.books.dto.BookSearchResult;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SearchCache {

    private static final long TTL_MS = 10 * 60 * 1000L;
    private static final int MAX_ENTRIES = 200;

    private final Map<String, Entry> entries = new ConcurrentHashMap<>();

    public static String key(String query, int page) {
        return key(query, null, page, null);
    }

    public static String key(String query, String topic, int page) {
        return key(query, topic, page, null);
    }

    public static String key(String query, String topic, int page, String language) {
        String normalizedQuery = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        String normalizedTopic = topic == null ? "" : topic.trim().toLowerCase(Locale.ROOT);
        String normalizedLanguage = language == null ? "" : language.trim().toLowerCase(Locale.ROOT);
        return normalizedQuery + "|" + normalizedTopic + "|" + normalizedLanguage + "|" + page;
    }

    public List<BookSearchResult> get(String key) {
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

    public void put(String key, List<BookSearchResult> value) {
        if (entries.size() >= MAX_ENTRIES) {
            entries.entrySet().removeIf(entry -> entry.getValue().expiresAt() < System.currentTimeMillis());
            if (entries.size() >= MAX_ENTRIES) {
                entries.clear();
            }
        }
        entries.put(key, new Entry(System.currentTimeMillis() + TTL_MS, List.copyOf(value)));
    }

    public void clear() {
        entries.clear();
    }

    private record Entry(long expiresAt, List<BookSearchResult> value) {
    }
}
