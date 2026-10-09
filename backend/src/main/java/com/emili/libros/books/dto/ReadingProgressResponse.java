package com.emili.libros.books.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ReadingProgressResponse(
        UUID bookId,
        String title,
        List<String> authors,
        String coverUrl,
        String description,
        String language,
        Double progressPercent,
        UUID fileId,
        Instant lastReadAt
) {
}
