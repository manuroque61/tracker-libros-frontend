package com.emili.libros.books.translation;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app.translation")
public record TranslationProperties(
        boolean enabled,
        String baseUrl,
        String sourceLanguage,
        String targetLanguage,
        Duration connectTimeout,
        Duration readTimeout) {
}
