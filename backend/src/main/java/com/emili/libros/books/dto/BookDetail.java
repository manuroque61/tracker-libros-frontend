package com.emili.libros.books.dto;

import java.util.List;
import java.util.UUID;

public record BookDetail(
        UUID id,
        String title,
        List<String> authors,
        String language,
        String description,
        String coverUrl,
        String source,
        String externalId,
        List<BookFileInfo> files) {
}
