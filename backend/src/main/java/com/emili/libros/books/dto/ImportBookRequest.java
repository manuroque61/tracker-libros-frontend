package com.emili.libros.books.dto;

import jakarta.validation.constraints.NotNull;

public record ImportBookRequest(@NotNull Long externalId) {
}
