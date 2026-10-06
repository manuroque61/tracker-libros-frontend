package com.emili.libros.books.external;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app.external")
public record ExternalProperties(
        String gutendexBaseUrl,
        String openlibraryBaseUrl,
        Duration connectTimeout,
        Duration readTimeout,
        Duration downloadReadTimeout) {
}
