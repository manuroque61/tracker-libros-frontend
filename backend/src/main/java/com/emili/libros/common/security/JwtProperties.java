package com.emili.libros.common.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(String secret, String issuer, Duration accessTokenTtl) {

    public long accessTokenTtlSeconds() {
        return accessTokenTtl == null ? 0L : accessTokenTtl.toSeconds();
    }
}
