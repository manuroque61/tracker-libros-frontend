package com.emili.libros.books.dto;

import java.util.List;

public record HomeResponse(
        List<ReadingProgressResponse> continueReading,
        List<RecommendationResponse> recommendations
) {
}
