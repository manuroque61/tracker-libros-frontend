package com.emili.libros.books.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ReadingProgressRequest(
        @NotNull
        UUID bookId,
        @NotNull
        UUID fileId,
        @DecimalMin("0.0") @DecimalMax("100.0")
        Double progressPercent,
        String locationCfi
) {
}
