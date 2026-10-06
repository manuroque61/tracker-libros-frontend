package com.emili.libros.books.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ImportBookRequest(
        @NotNull Long externalId,
        String title,
        List<String> authors,
        String language,
        String coverUrl,
        String description) {

    public boolean hasMetadata() {
        return title != null && !title.isBlank();
    }
}
