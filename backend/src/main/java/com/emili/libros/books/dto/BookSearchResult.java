package com.emili.libros.books.dto;

import java.util.List;

public record BookSearchResult(
        long externalId,
        String title,
        List<String> authors,
        String language,
        String coverUrl,
        String description,
        String sourceDescription,
        int downloadCount,
        boolean epubAvailable) {
}
