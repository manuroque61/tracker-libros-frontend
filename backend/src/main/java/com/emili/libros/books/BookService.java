package com.emili.libros.books;

import com.emili.libros.books.dto.BookDetail;
import com.emili.libros.books.dto.BookFileInfo;
import com.emili.libros.books.dto.BookSearchResult;
import com.emili.libros.books.dto.ImportBookRequest;
import com.emili.libros.books.external.GutendexClient;
import com.emili.libros.common.error.ConflictException;
import com.emili.libros.common.error.NotFoundException;
import com.emili.libros.users.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.JsonNode;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

@Service
public class BookService {

    private static final Logger log = LoggerFactory.getLogger(BookService.class);

    private static final int MAX_FILE_BYTES = 64 * 1024 * 1024;

    private final GutendexClient gutendexClient;
    private final BookRepository bookRepository;
    private final BookFileRepository bookFileRepository;
    private final StorageService storageService;
    private final SearchCache searchCache;

    public BookService(GutendexClient gutendexClient, BookRepository bookRepository,
            BookFileRepository bookFileRepository, StorageService storageService, SearchCache searchCache) {
        this.gutendexClient = gutendexClient;
        this.bookRepository = bookRepository;
        this.bookFileRepository = bookFileRepository;
        this.storageService = storageService;
        this.searchCache = searchCache;
    }

    public List<BookSearchResult> search(String query, int page) {
        String cacheKey = SearchCache.key(query, page);
        List<BookSearchResult> cached = searchCache.get(cacheKey);
        if (cached != null) {
            return cached;
        }

        JsonNode root;
        try {
            root = gutendexClient.search(query, page);
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
        return results;
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
        List<BookDetail> details = new ArrayList<>();
        for (Book book : bookRepository.findAllByUserFile(user.getId())) {
            List<BookFile> files = bookFileRepository.findByBookIdAndUserId(book.getId(), user.getId());
            details.add(toDetail(book, files));
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
        return new BookSearchResult(
                node.path("id").asLong(),
                node.path("title").asText(),
                authorNames(node),
                firstOf(node.path("languages")),
                formats.path("image/jpeg").asText(null),
                cleanSummary(node),
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
        return toDetail(book, List.of(file));
    }

    private BookDetail toDetail(Book book, List<BookFile> files) {
        List<BookFileInfo> fileInfos = files.stream()
                .map(file -> new BookFileInfo(
                        file.getId(),
                        file.getKind(),
                        file.getSize(),
                        file.getMimeType(),
                        file.getOriginalFilename(),
                        file.getCreatedAt()))
                .toList();
        return new BookDetail(
                book.getId(),
                book.getTitle(),
                List.copyOf(book.getAuthors()),
                book.getLanguage(),
                book.getDescription(),
                book.getCoverUrl(),
                book.getSource(),
                book.getExternalId(),
                fileInfos);
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
