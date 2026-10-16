package com.emili.libros.books.external;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Supplier;

@Component
public class GutendexClient {

    public static final String SOURCE = "GUTENBERG";
    public static final String GUTENBERG_BASE_URL = "https://www.gutenberg.org";

    private static final Logger log = LoggerFactory.getLogger(GutendexClient.class);

    private static final String USER_AGENT = "libros-tracker/1.0 (libre; contacto: localhost)";
    private static final int MAX_ATTEMPTS = 3;
    private static final int MAX_DOWNLOAD_ATTEMPTS = 2;
    private static final long BACKOFF_MS = 400;

    private final ExternalProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient metadataClient;
    private final RestClient downloadClient;
    private final RestClient recommendationClient;

    public GutendexClient(ExternalProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.metadataClient = buildClient(properties.connectTimeout(), properties.readTimeout());
        this.downloadClient = buildClient(properties.connectTimeout(), properties.downloadReadTimeout());
        this.recommendationClient = buildClient(properties.connectTimeout(), properties.recommendationReadTimeout());
    }

    public JsonNode search(String query, int page, String language) {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("search", query);
        applyLanguage(params, language);
        params.put("page", page);
        return get(properties.gutendexBaseUrl() + "/books/", params);
    }

    public JsonNode search(String query, String topic, int page, String language) {
        Map<String, Object> params = new LinkedHashMap<>();
        if (query != null && !query.isBlank()) {
            params.put("search", query.trim());
        }
        if (topic != null && !topic.isBlank()) {
            params.put("topic", topic.trim());
        }
        applyLanguage(params, language);
        params.put("page", page);
        return get(properties.gutendexBaseUrl() + "/books/", params);
    }

    /**
     * Libros populares de un género (topic). Usa un timeout corto y sin reintentos
     * para no demorar la carga del inicio cuando el servicio externo está lento.
     */
    public JsonNode topicPopular(String topic, int page, String language) {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("topic", topic);
        params.put("sort", "popular");
        applyLanguage(params, language);
        params.put("page", page);
        return get(recommendationClient, 1, "populares", properties.gutendexBaseUrl() + "/books/", params);
    }

    /**
     * Libros más populares del catálogo en el idioma indicado (sin género). Se usa
     * como respaldo cuando ningún género tiene resultados en ese idioma.
     */
    public JsonNode popularByLanguage(int page, String language) {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("sort", "popular");
        applyLanguage(params, language);
        params.put("page", page);
        return get(recommendationClient, 1, "populares", properties.gutendexBaseUrl() + "/books/", params);
    }

    /**
     * Resuelve el idioma a usar: si viene uno explícito se respeta (el valor "all"
     * o vacío quita el filtro); si no viene ninguno, se usa el configurado.
     */
    private void applyLanguage(Map<String, Object> params, String language) {
        String chosen = language != null ? language : properties.languages();
        if (chosen == null || chosen.isBlank() || chosen.equalsIgnoreCase("all")) {
            return;
        }
        params.put("languages", chosen.trim());
    }

    public JsonNode book(long externalId) {
        return get(properties.gutendexBaseUrl() + "/books/" + externalId + "/", Map.of());
    }

    public byte[] download(String url) {
        byte[] body = withRetry("descarga", MAX_DOWNLOAD_ATTEMPTS, () -> downloadClient.get()
                .uri(URI.create(url))
                .header(HttpHeaders.ACCEPT, MediaType.ALL_VALUE)
                .retrieve()
                .body(byte[].class));
        if (body == null || body.length == 0) {
            throw new IllegalStateException("Descarga vacía desde " + url);
        }
        return body;
    }

    private JsonNode get(String baseUrl, Map<String, Object> params) {
        return get(metadataClient, MAX_ATTEMPTS, "metadatos", baseUrl, params);
    }

    private JsonNode get(RestClient client, int maxAttempts, String target, String baseUrl,
            Map<String, Object> params) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(baseUrl);
        params.forEach((name, value) -> builder.queryParam(name, String.valueOf(value)));
        URI uri = builder.build().encode().toUri();
        String body = withRetry(target, maxAttempts,
                () -> client.get().uri(uri).retrieve().body(String.class));
        if (body == null) {
            throw new IllegalStateException("Respuesta vacía desde " + uri);
        }
        try {
            return objectMapper.readTree(body);
        } catch (JacksonException ex) {
            throw new IllegalStateException("Respuesta inválida desde " + uri, ex);
        }
    }

    private static RestClient buildClient(java.time.Duration connectTimeout, java.time.Duration readTimeout) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeout);
        requestFactory.setReadTimeout(readTimeout);
        return RestClient.builder()
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    private <T> T withRetry(String target, int maxAttempts, Supplier<T> call) {
        RuntimeException last = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return call.get();
            } catch (ResourceAccessException ex) {
                last = ex;
                log.warn("Falla de red en {} (intento {}/{}): {}", target, attempt, maxAttempts, ex.getMessage());
            } catch (HttpServerErrorException ex) {
                last = ex;
                log.warn("El servicio externo respondió {} en {} (intento {}/{}): {}",
                        ex.getStatusCode(), target, attempt, maxAttempts, ex.getMessage());
            } catch (HttpClientErrorException ex) {
                if (ex.getStatusCode() != HttpStatus.TOO_MANY_REQUESTS) {
                    throw ex;
                }
                last = ex;
                log.warn("Límite de peticiones alcanzado en {} (intento {}/{}): {}",
                        target, attempt, maxAttempts, ex.getMessage());
            }
            if (attempt < maxAttempts) {
                try {
                    Thread.sleep(BACKOFF_MS * attempt);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    throw last;
                }
            }
        }
        throw last;
    }
}
