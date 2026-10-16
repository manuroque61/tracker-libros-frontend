package com.emili.libros.books;

import com.emili.libros.books.dto.BookDetail;
import com.emili.libros.books.dto.BookFileInfo;
import com.emili.libros.books.dto.BookSearchResult;
import com.emili.libros.books.dto.GenreResponse;
import com.emili.libros.books.dto.HomeResponse;
import com.emili.libros.books.dto.ImportBookRequest;
import com.emili.libros.books.dto.ReadingProgressRequest;
import com.emili.libros.books.dto.ReadingProgressResponse;
import com.emili.libros.books.dto.RecommendationResponse;
import com.emili.libros.books.dto.RecommendationsResponse;
import com.emili.libros.books.external.GutendexClient;
import com.emili.libros.books.translation.TranslationClient;
import com.emili.libros.common.error.ConflictException;
import com.emili.libros.common.error.NotFoundException;
import com.emili.libros.users.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.JsonNode;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.TimeUnit;

@Service
public class BookService {

    private static final Logger log = LoggerFactory.getLogger(BookService.class);

    private static final int MAX_FILE_BYTES = 64 * 1024 * 1024;
    private static final int CONTINUE_READING_LIMIT = 10;
    private static final int GENRE_PICK_COUNT = 2;
    private static final long RECOMMENDATION_TIMEOUT_SECONDS = 4;
    private static final long TRANSLATION_TIMEOUT_SECONDS = 6;
    private static final String OVERALL_RECOMMENDATION_KEY = "__all__";

    private final GutendexClient gutendexClient;
    private final BookRepository bookRepository;
    private final BookFileRepository bookFileRepository;
    private final StorageService storageService;
    private final SearchCache searchCache;
    private final RecommendationCache recommendationCache;
    private final ReadingProgressRepository readingProgressRepository;
    private final TranslationClient translationClient;

    public BookService(GutendexClient gutendexClient, BookRepository bookRepository,
            BookFileRepository bookFileRepository, StorageService storageService, SearchCache searchCache,
            RecommendationCache recommendationCache, ReadingProgressRepository readingProgressRepository,
            TranslationClient translationClient) {
        this.gutendexClient = gutendexClient;
        this.bookRepository = bookRepository;
        this.bookFileRepository = bookFileRepository;
        this.storageService = storageService;
        this.searchCache = searchCache;
        this.recommendationCache = recommendationCache;
        this.readingProgressRepository = readingProgressRepository;
        this.translationClient = translationClient;
    }

    public List<BookSearchResult> search(String query, String topic, int page, String language) {
        String cacheKey = SearchCache.key(query, topic, page, language);
        List<BookSearchResult> cached = searchCache.get(cacheKey);
        if (cached != null) {
            return translatedResults(cached);
        }

        JsonNode root;
        try {
            root = gutendexClient.search(query, topic, page, language);
        } catch (HttpClientErrorException ex) {
            if (isNotFound(ex)) {
                return List.of();
            }
            throw ex;
        }
        List<BookSearchResult> results = new ArrayList<>();
        for (JsonNode node : root.path("results")) {
            results.add(toSearchResult(node));
        }
        searchCache.put(cacheKey, results);
        return translatedResults(results);
    }

    @Transactional
    public ImportOutcome importBook(ImportBookRequest request, User user) {
        long externalId = request.externalId();
        Book book = bookRepository.findBySourceAndExternalId(GutendexClient.SOURCE, String.valueOf(externalId))
                .orElse(null);

        String preferredEpubUrl = null;
        if (book == null) {
            if (request.hasMetadata()) {
                book = bookRepository.save(fromRequest(request, externalId));
            } else {
                JsonNode node = fetchBook(externalId);
                preferredEpubUrl = pickEpubUrl(node);
                book = bookRepository.save(fromGutendex(node, externalId));
            }
        }

        Optional<BookFile> existing = bookFileRepository.findByUserIdAndBookIdAndKind(
                user.getId(), book.getId(), FileKind.EPUB);
        if (existing.isPresent()) {
            return new ImportOutcome(toDetail(book, existing.get()), false);
        }

        byte[] content = downloadEpub(externalId, preferredEpubUrl);
        String sha256 = sha256(content);
        try {
            StorageService.StoredFile stored = storageService.store(user.getId(), sha256, "epub", content);
            BookFile file = bookFileRepository.save(new BookFile(
                    book,
                    user,
                    FileKind.EPUB,
                    filenameFor(book, "epub"),
                    stored.storagePath(),
                    sha256,
                    stored.size(),
                    "application/epub+zip"));
            return new ImportOutcome(toDetail(book, file), true);
        } catch (IOException ex) {
            throw new IllegalStateException("No se pudo guardar el archivo del libro", ex);
        }
    }

    @Transactional(readOnly = true)
    public List<BookDetail> list(User user) {
        Map<UUID, ReadingProgress> progressByBook = new HashMap<>();
        for (ReadingProgress progress : readingProgressRepository.findByUserId(user.getId())) {
            progressByBook.put(progress.getBook().getId(), progress);
        }

        List<Book> books = new ArrayList<>(bookRepository.findAllByUserFile(user.getId()));
        // Los libros empezados (con progreso) van primero, del último leído al más
        // antiguo; los que nunca se abrieron, después por fecha de importación.
        books.sort(Comparator
                .comparing((Book book) -> {
                    ReadingProgress progress = progressByBook.get(book.getId());
                    return progress == null ? null : progress.getLastReadAt();
                }, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(Book::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));

        List<BookDetail> details = new ArrayList<>();
        for (Book book : books) {
            List<BookFile> files = bookFileRepository.findByBookIdAndUserId(book.getId(), user.getId());
            details.add(toDetail(book, files, progressByBook.get(book.getId())));
        }
        return details;
    }

    @Transactional(readOnly = true)
    public BookFile ownedFile(User user, java.util.UUID bookId, java.util.UUID fileId) {
        return bookFileRepository.findById(fileId)
                .filter(file -> file.getBook().getId().equals(bookId))
                .filter(file -> file.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new NotFoundException("Archivo no encontrado"));
    }

    @Transactional
    public void updateProgress(User user, ReadingProgressRequest request) {
        Book book = bookRepository.findById(request.bookId())
                .orElseThrow(() -> new NotFoundException("Libro no encontrado"));
        BookFile file = ownedFile(user, request.bookId(), request.fileId());
        ReadingProgress progress = readingProgressRepository
                .findByUserIdAndBookId(user.getId(), request.bookId())
                .orElseGet(() -> new ReadingProgress(user, book, file));
        progress.setBookFile(file);
        progress.setProgressPercent(request.progressPercent());
        progress.setLocationCfi(blankToNull(request.locationCfi()));
        progress.touch();
        readingProgressRepository.save(progress);
    }

    @Transactional(readOnly = true)
    public Optional<ReadingProgressResponse> progress(User user, java.util.UUID bookId) {
        return readingProgressRepository.findByUserIdAndBookId(user.getId(), bookId)
                .map(this::toProgressResponse);
    }

    @Transactional(readOnly = true)
    public HomeResponse home(User user) {
        List<ReadingProgressResponse> continueReading = readingProgressRepository
                .findRecentByUserId(user.getId(), PageRequest.of(0, CONTINUE_READING_LIMIT))
                .stream()
                .map(this::toProgressResponse)
                .toList();
        return new HomeResponse(continueReading);
    }

    @Transactional(readOnly = true)
    public RecommendationsResponse recommendations(User user, int offset, int limit, List<String> genreSlugs,
            String language) {
        List<Genres.Genre> genres = Genres.resolve(genreSlugs);
        if (genres.isEmpty()) {
            genres = Genres.pickRandom(GENRE_PICK_COUNT);
        }

        Set<String> ownedExternalIds = new HashSet<>();
        for (Book book : bookRepository.findAllByUserFile(user.getId())) {
            if (book.getExternalId() != null) {
                ownedExternalIds.add(book.getExternalId());
            }
        }

        List<RecommendationResponse> pool = new ArrayList<>();
        Set<Long> seen = new HashSet<>();
        List<List<BookSearchResult>> byGenre = fetchGenresInParallel(genres, language);
        for (List<BookSearchResult> genreResults : byGenre) {
            for (BookSearchResult result : genreResults) {
                if (!result.epubAvailable()
                        || ownedExternalIds.contains(String.valueOf(result.externalId()))
                        || !seen.add(result.externalId())) {
                    continue;
                }
                pool.add(toRecommendation(result));
            }
        }

        List<GenreResponse> genreResponses = genres.stream()
                .map(genre -> new GenreResponse(genre.slug(), genre.label()))
                .toList();

        // Si ningún género tiene libros en el idioma elegido, mostramos los más
        // populares del catálogo en ese idioma (sin género) como respaldo.
        if (pool.isEmpty() && offset == 0) {
            for (BookSearchResult result : popularOverall(language)) {
                if (!result.epubAvailable()
                        || ownedExternalIds.contains(String.valueOf(result.externalId()))
                        || !seen.add(result.externalId())) {
                    continue;
                }
                pool.add(toRecommendation(result));
            }
            genreResponses = List.of();
        }

        int from = Math.min(Math.max(offset, 0), pool.size());
        int to = Math.min(from + Math.max(limit, 1), pool.size());
        List<RecommendationResponse> items = translatedRecommendations(pool.subList(from, to));
        return new RecommendationsResponse(genreResponses, items, to < pool.size());
    }

    /**
     * Trae en paralelo los populares de cada género para que el tiempo total sea el
     * de la llamada más lenta (no la suma). Nunca propaga excepciones: cada género
     * devuelve una lista (posiblemente vacía).
     */
    private List<List<BookSearchResult>> fetchGenresInParallel(List<Genres.Genre> genres, String language) {
        List<CompletableFuture<List<BookSearchResult>>> futures = genres.stream()
                .map(genre -> CompletableFuture.supplyAsync(() -> popularByGenre(genre, language)))
                .toList();
        try {
            CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new))
                    .orTimeout(RECOMMENDATION_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                    .join();
        } catch (CompletionException ex) {
            log.warn("Algunas recomendaciones no llegaron a tiempo: {}", ex.getMessage());
        }
        List<List<BookSearchResult>> results = new ArrayList<>();
        for (CompletableFuture<List<BookSearchResult>> future : futures) {
            results.add(future.getNow(List.of()));
        }
        return results;
    }

    /**
     * Lista de libros populares de un género, con caché para no golpear Gutendex en
     * cada visita. Si el servicio externo falla, se devuelve lo que haya en caché o vacío.
     */
    private List<BookSearchResult> popularByGenre(Genres.Genre genre, String language) {
        List<BookSearchResult> cached = recommendationCache.get(genre.slug(), language);
        if (cached != null) {
            return cached;
        }
        try {
            JsonNode root = gutendexClient.topicPopular(genre.slug(), 1, language);
            List<BookSearchResult> results = new ArrayList<>();
            for (JsonNode node : root.path("results")) {
                results.add(toSearchResult(node));
            }
            recommendationCache.put(genre.slug(), language, results);
            return results;
        } catch (RestClientException ex) {
            log.warn("No se pudieron obtener libros populares del género {}: {}", genre.label(), ex.getMessage());
            return List.of();
        }
    }

    /**
     * Libros más populares del catálogo en el idioma configurado, con la misma caché
     * y tolerancia a fallos que los géneros. Respaldo cuando ningún género tiene
     * resultados en ese idioma.
     */
    private List<BookSearchResult> popularOverall(String language) {
        List<BookSearchResult> cached = recommendationCache.get(OVERALL_RECOMMENDATION_KEY, language);
        if (cached != null) {
            return cached;
        }
        try {
            JsonNode root = gutendexClient.popularByLanguage(1, language);
            List<BookSearchResult> results = new ArrayList<>();
            for (JsonNode node : root.path("results")) {
                results.add(toSearchResult(node));
            }
            recommendationCache.put(OVERALL_RECOMMENDATION_KEY, language, results);
            return results;
        } catch (RestClientException ex) {
            log.warn("No se pudieron obtener libros populares en el idioma configurado: {}", ex.getMessage());
            return List.of();
        }
    }

    private RecommendationResponse toRecommendation(BookSearchResult result) {
        return new RecommendationResponse(
                result.externalId(),
                result.title(),
                result.authors(),
                result.language(),
                result.coverUrl(),
                result.description(),
                result.sourceDescription(),
                result.epubAvailable());
    }

    private ReadingProgressResponse toProgressResponse(ReadingProgress progress) {
        Book book = progress.getBook();
        BookFile file = progress.getBookFile();
        return new ReadingProgressResponse(
                book.getId(),
                book.getTitle(),
                List.copyOf(book.getAuthors()),
                book.getCoverUrl(),
                translated(book.getDescription()),
                book.getLanguage(),
                progress.getProgressPercent(),
                progress.getLocationCfi(),
                file == null ? null : file.getId(),
                progress.getLastReadAt());
    }

    private JsonNode fetchBook(long externalId) {
        try {
            return gutendexClient.book(externalId);
        } catch (HttpClientErrorException ex) {
            if (isNotFound(ex)) {
                throw new NotFoundException("Libro no encontrado en Project Gutenberg");
            }
            throw ex;
        }
    }

    private boolean isNotFound(HttpClientErrorException ex) {
        return ex.getStatusCode().value() == 404;
    }

    private byte[] downloadEpub(long externalId, String preferredUrl) {
        List<String> candidates = new ArrayList<>();
        if (preferredUrl != null && !preferredUrl.isBlank()) {
            candidates.add(preferredUrl);
        }
        String gutenberg = GutendexClient.GUTENBERG_BASE_URL + "/ebooks/" + externalId;
        candidates.add(gutenberg + ".epub3.images");
        candidates.add(gutenberg + ".epub.images");
        candidates.add(gutenberg + ".epub.noimages");

        RestClientException ioFailure = null;
        boolean notFound = false;
        boolean invalidContent = false;
        for (String url : candidates.stream().distinct().toList()) {
            try {
                byte[] content = gutendexClient.download(url);
                if (!looksLikeEpub(content)) {
                    log.warn("Descarga que no parece un EPUB desde {}", url);
                    invalidContent = true;
                    continue;
                }
                if (content.length > MAX_FILE_BYTES) {
                    throw new ConflictException("El archivo supera el tamaño máximo permitido");
                }
                return content;
            } catch (HttpClientErrorException ex) {
                if (!isNotFound(ex)) {
                    throw ex;
                }
                notFound = true;
            } catch (RestClientException ex) {
                ioFailure = ex;
            }
        }
        if (ioFailure != null) {
            throw ioFailure;
        }
        if (notFound) {
            throw new ConflictException("El libro no tiene un EPUB disponible en Project Gutenberg");
        }
        if (invalidContent) {
            throw new ConflictException("Project Gutenberg devolvió un archivo que no es un EPUB válido");
        }
        throw new ConflictException("No se pudo obtener el EPUB desde Project Gutenberg");
    }

    private boolean looksLikeEpub(byte[] content) {
        return content != null && content.length > 4
                && content[0] == 'P' && content[1] == 'K'
                && (content[2] == 3 || content[2] == 5 || content[2] == 7);
    }

    private BookSearchResult toSearchResult(JsonNode node) {
        JsonNode formats = node.path("formats");
        String summary = cleanSummary(node);
        return new BookSearchResult(
                node.path("id").asLong(),
                node.path("title").asText(),
                authorNames(node),
                firstOf(node.path("languages")),
                formats.path("image/jpeg").asText(null),
                summary,
                summary,
                node.path("download_count").asInt(0),
                pickEpubUrl(node) != null);
    }

    private Book fromRequest(ImportBookRequest request, long externalId) {
        Book book = new Book(request.title().trim(), GutendexClient.SOURCE, String.valueOf(externalId));
        book.setLanguage(blankToNull(request.language()));
        book.setCoverUrl(blankToNull(request.coverUrl()));
        book.setDescription(blankToNull(request.description()));
        if (request.authors() != null) {
            request.authors().stream()
                    .filter(author -> author != null && !author.isBlank())
                    .map(String::trim)
                    .forEach(book.getAuthors()::add);
        }
        return book;
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Book fromGutendex(JsonNode node, long externalId) {
        Book book = new Book(node.path("title").asText(), GutendexClient.SOURCE, String.valueOf(externalId));
        book.setLanguage(firstOf(node.path("languages")));
        book.setCoverUrl(node.path("formats").path("image/jpeg").asText(null));
        book.setDescription(cleanSummary(node));
        book.getAuthors().addAll(authorNames(node));
        return book;
    }

    private BookDetail toDetail(Book book, BookFile file) {
        return toDetail(book, List.of(file), null);
    }

    private BookDetail toDetail(Book book, List<BookFile> files) {
        return toDetail(book, files, null);
    }

    private BookDetail toDetail(Book book, List<BookFile> files, ReadingProgress progress) {
        List<BookFileInfo> fileInfos = files.stream()
                .map(file -> new BookFileInfo(
                        file.getId(),
                        file.getKind(),
                        file.getSize(),
                        file.getMimeType(),
                        file.getOriginalFilename(),
                        file.getCreatedAt()))
                .toList();
        Double progressPercent = progress == null ? null : progress.getProgressPercent();
        Instant lastReadAt = progress == null ? null : progress.getLastReadAt();
        UUID progressFileId = progress == null || progress.getBookFile() == null
                ? null
                : progress.getBookFile().getId();
        return new BookDetail(
                book.getId(),
                book.getTitle(),
                List.copyOf(book.getAuthors()),
                book.getLanguage(),
                translated(book.getDescription()),
                book.getCoverUrl(),
                book.getSource(),
                book.getExternalId(),
                fileInfos,
                progressPercent,
                lastReadAt,
                progressFileId);
    }

    private String pickEpubUrl(JsonNode node) {
        JsonNode formats = node.path("formats");
        String url = formats.path("application/epub+zip").asText(null);
        if (url == null || url.isBlank()) {
            return null;
        }
        return url;
    }

    private List<String> authorNames(JsonNode node) {
        List<String> names = new ArrayList<>();
        for (JsonNode author : node.path("authors")) {
            String name = author.path("name").asText();
            if (!name.isBlank()) {
                names.add(name);
            }
        }
        return names;
    }

    private String cleanSummary(JsonNode node) {
        JsonNode summaries = node.path("summaries");
        if (!summaries.isArray() || summaries.isEmpty()) {
            return null;
        }
        String summary = summaries.get(0).asText().trim();
        if (summary.length() > 2 && summary.startsWith("\"") && summary.endsWith("\"")) {
            summary = summary.substring(1, summary.length() - 1);
        }
        return summary.isBlank() ? null : summary;
    }

    private String firstOf(JsonNode array) {
        if (!array.isArray() || array.isEmpty()) {
            return null;
        }
        String value = array.get(0).asText();
        return value.isBlank() ? null : value;
    }

    private String translated(String description) {
        if (description == null || description.isBlank() || !translationClient.isEnabled()) {
            return description;
        }
        return translationClient.translate(description);
    }

    private List<BookSearchResult> translatedResults(List<BookSearchResult> results) {
        if (!translationClient.isEnabled() || results.isEmpty()) {
            return results;
        }
        List<String> translated = translateAll(results.stream().map(BookSearchResult::description).toList());
        List<BookSearchResult> out = new ArrayList<>(results.size());
        for (int i = 0; i < results.size(); i++) {
            BookSearchResult r = results.get(i);
            out.add(new BookSearchResult(r.externalId(), r.title(), r.authors(), r.language(), r.coverUrl(),
                    translated.get(i), r.description(), r.downloadCount(), r.epubAvailable()));
        }
        return out;
    }

    private List<RecommendationResponse> translatedRecommendations(List<RecommendationResponse> items) {
        if (!translationClient.isEnabled() || items.isEmpty()) {
            return List.copyOf(items);
        }
        List<String> translated = translateAll(items.stream().map(RecommendationResponse::description).toList());
        List<RecommendationResponse> out = new ArrayList<>(items.size());
        for (int i = 0; i < items.size(); i++) {
            RecommendationResponse r = items.get(i);
            out.add(new RecommendationResponse(r.externalId(), r.title(), r.authors(), r.language(), r.coverUrl(),
                    translated.get(i), r.description(), r.epubAvailable()));
        }
        return out;
    }

    /**
     * Traduce en paralelo (para no sumar latencias) con un presupuesto total acotado.
     * Si alguna no llega a tiempo, se mantiene el texto original.
     */
    private List<String> translateAll(List<String> texts) {
        List<CompletableFuture<String>> futures = new ArrayList<>(texts.size());
        for (String text : texts) {
            futures.add(CompletableFuture.supplyAsync(() -> translated(text)));
        }
        try {
            CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new))
                    .orTimeout(TRANSLATION_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                    .join();
        } catch (CompletionException ex) {
            log.warn("Algunas traducciones no terminaron a tiempo: {}", ex.getMessage());
        }
        List<String> out = new ArrayList<>(texts.size());
        for (int i = 0; i < texts.size(); i++) {
            out.add(futures.get(i).getNow(texts.get(i)));
        }
        return out;
    }

    private String filenameFor(Book book, String extension) {
        String base = book.getTitle().replaceAll("[^a-zA-Z0-9 _.-]", "").trim().replace(' ', '_');
        if (base.isBlank()) {
            base = "libro";
        }
        return base + "." + extension;
    }

    private String sha256(byte[] content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(content));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 no disponible", ex);
        }
    }

    public record ImportOutcome(BookDetail detail, boolean created) {
    }
}
