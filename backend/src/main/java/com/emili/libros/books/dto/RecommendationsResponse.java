package com.emili.libros.books.dto;

import java.util.List;

public record RecommendationsResponse(
        List<GenreResponse> genres,
        List<RecommendationResponse> items,
        boolean hasMore) {
}
