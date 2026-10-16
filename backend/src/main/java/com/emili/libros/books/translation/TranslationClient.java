package com.emili.libros.books.translation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Traducción de los resúmenes que Gutendex entrega siempre en inglés. Usa un
 * servicio público sin API key, con timeout corto y caché en memoria. Nunca lanza:
 * si algo falla, devuelve el texto original.
 */
@Component
public class TranslationClient {

    private static final Logger log = LoggerFactory.getLogger(TranslationClient.class);

    private static final int MAX_TEXT_LENGTH = 1200;
    private static final int MAX_CACHE_ENTRIES = 5000;

    private final TranslationProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient client;
    private final Map<String, String> cache = new ConcurrentHashMap<>();

    public TranslationClient(TranslationProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(properties.connectTimeout());
        requestFactory.setReadTimeout(properties.readTimeout());
        this.client = RestClient.builder()
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public boolean isEnabled() {
        return properties.enabled();
    }

    public String translate(String text) {
        if (text == null || text.isBlank() || !properties.enabled()) {
            return text;
        }
        String source = properties.sourceLanguage();
        String target = properties.targetLanguage();
        String input = truncate(text.trim());
        String cacheKey = source + ">" + target + "|" + input.hashCode();
        String cached = cache.get(cacheKey);
        if (cached != null) {
            return cached;
        }
        try {
            String translated = request(input, source, target);
            if (translated != null && !translated.isBlank()) {
                cacheTranslation(cacheKey, translated);
                return translated;
            }
        } catch (RestClientException ex) {
            log.warn("No se pudo traducir un resumen a {}: {}", target, ex.getMessage());
        } catch (RuntimeException ex) {
            log.warn("Error inesperado al traducir un resumen: {}", ex.getMessage());
        }
        return input;
    }

    private String request(String text, String source, String target) throws RuntimeException {
        String body = "client=gtx&sl=" + encode(source) + "&tl=" + encode(target) + "&dt=t&q=" + encode(text);
        String response = client.post()
                .uri(properties.baseUrl() + "/translate_a/single")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(body)
                .retrieve()
                .body(String.class);
        if (response == null) {
            return null;
        }
        JsonNode root = objectMapper.readTree(response);
        if (!root.isArray() || root.isEmpty()) {
            return null;
        }
        StringBuilder translated = new StringBuilder();
        for (JsonNode segment : root.get(0)) {
            if (segment.isArray() && !segment.isEmpty()) {
                translated.append(segment.get(0).asText(""));
            }
        }
        return translated.isEmpty() ? null : translated.toString();
    }

    private void cacheTranslation(String key, String value) {
        if (cache.size() >= MAX_CACHE_ENTRIES) {
            cache.clear();
        }
        cache.put(key, value);
    }

    private static String truncate(String text) {
        if (text.length() <= MAX_TEXT_LENGTH) {
            return text;
        }
        return text.substring(0, MAX_TEXT_LENGTH).trim() + "…";
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
