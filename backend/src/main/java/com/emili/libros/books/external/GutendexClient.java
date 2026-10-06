package com.emili.libros.books.external;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.ResourceAccessException;
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

    private static final Logger log = LoggerFactory.getLogger(GutendexClient.class);

    private static final String USER_AGENT = "libros-tracker/1.0 (libre; contacto: localhost)";
    private static final long RETRY_DELAY_MS = 300;

    private final ExternalProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient client;

    public GutendexClient(ExternalProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(properties.connectTimeout());
        requestFactory.setReadTimeout(properties.readTimeout());
        this.client = RestClient.builder()
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public JsonNode search(String query, int page) {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("search", query);
        params.put("page", page);
        return get(properties.gutendexBaseUrl() + "/books/", params);
    }

    public JsonNode book(long externalId) {
        return get(properties.gutendexBaseUrl() + "/books/" + externalId + "/", Map.of());
    }

    public byte[] download(String url) {
        byte[] body = withRetry(() -> client.get()
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
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(baseUrl);
        params.forEach((name, value) -> builder.queryParam(name, String.valueOf(value)));
        URI uri = builder.build().encode().toUri();
        String body = withRetry(() -> client.get().uri(uri).retrieve().body(String.class));
        if (body == null) {
            throw new IllegalStateException("Respuesta vacía desde " + uri);
        }
        try {
            return objectMapper.readTree(body);
        } catch (JacksonException ex) {
            throw new IllegalStateException("Respuesta inválida desde " + uri, ex);
        }
    }

    private <T> T withRetry(Supplier<T> call) {
        try {
            return call.get();
        } catch (ResourceAccessException first) {
            log.warn("Falla de red contra el servicio externo, reintentando: {}", first.getMessage());
            try {
                Thread.sleep(RETRY_DELAY_MS);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                throw first;
            }
            return call.get();
        }
    }
}
