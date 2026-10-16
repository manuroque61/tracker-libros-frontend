package com.emili.libros.books;

import com.emili.libros.books.dto.BookDetail;
import com.emili.libros.books.dto.BookSearchResult;
import com.emili.libros.books.dto.GenreResponse;
import com.emili.libros.books.dto.HomeResponse;
import com.emili.libros.books.dto.ImportBookRequest;
import com.emili.libros.books.dto.ReadingProgressRequest;
import com.emili.libros.books.dto.ReadingProgressResponse;
import com.emili.libros.books.dto.RecommendationsResponse;
import com.emili.libros.common.error.BadRequestException;
import com.emili.libros.common.error.NotFoundException;
import com.emili.libros.common.security.CurrentUser;
import com.emili.libros.users.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/books")
public class BookController {

    private final BookService bookService;
    private final CurrentUser currentUser;
    private final StorageService storageService;

    public BookController(BookService bookService, CurrentUser currentUser, StorageService storageService) {
        this.bookService = bookService;
        this.currentUser = currentUser;
        this.storageService = storageService;
    }

    @GetMapping("/search")
    public List<BookSearchResult> search(@RequestParam(required = false) String q,
            @RequestParam(required = false) String topic,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(required = false) String language) {
        String query = q == null ? null : q.trim();
        String genre = topic == null ? null : topic.trim();
        boolean hasQuery = query != null && !query.isBlank();
        boolean hasTopic = genre != null && !genre.isBlank();
        if (!hasQuery && !hasTopic) {
            throw new BadRequestException("Indicá un término de búsqueda o un género");
        }
        return bookService.search(hasQuery ? query : null, hasTopic ? genre : null, Math.max(page, 1), normalizeLanguage(language));
    }

    @GetMapping("/genres")
    public List<GenreResponse> genres() {
        return Genres.ALL.stream()
                .map(genre -> new GenreResponse(genre.slug(), genre.label()))
                .toList();
    }

    @GetMapping("/recommendations")
    public RecommendationsResponse recommendations(
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "4") int limit,
            @RequestParam(required = false) List<String> genres,
            @RequestParam(required = false) String language,
            @AuthenticationPrincipal Jwt jwt) {
        User user = currentUser.require(jwt);
        return bookService.recommendations(user, Math.max(offset, 0), Math.max(limit, 1), genres,
                normalizeLanguage(language));
    }

    @PostMapping("/import")
    public ResponseEntity<BookDetail> importBook(@Valid @RequestBody ImportBookRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        User user = currentUser.require(jwt);
        BookService.ImportOutcome outcome = bookService.importBook(request, user);
        return ResponseEntity.status(outcome.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(outcome.detail());
    }

    @GetMapping
    public List<BookDetail> list(@AuthenticationPrincipal Jwt jwt) {
        User user = currentUser.require(jwt);
        return bookService.list(user);
    }

    @GetMapping("/{bookId}/files/{fileId}")
    public ResponseEntity<InputStreamResource> download(@PathVariable UUID bookId, @PathVariable UUID fileId,
            @AuthenticationPrincipal Jwt jwt, HttpServletRequest request) throws IOException {
        User user = currentUser.require(jwt);
        BookFile file = bookService.ownedFile(user, bookId, fileId);
        Path path = storageService.resolve(file.getStoragePath());
        if (!Files.isRegularFile(path)) {
            throw new NotFoundException("Archivo no encontrado en disco");
        }

        MediaType mediaType = file.getMimeType() == null
                ? MediaType.APPLICATION_OCTET_STREAM
                : MediaType.parseMediaType(file.getMimeType());
        InputStream inputStream = Files.newInputStream(path);
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(file.getOriginalFilename(), StandardCharsets.UTF_8)
                .build();

        try {
            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .contentLength(Files.size(path))
                    .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                    .body(new InputStreamResource(inputStream));
        } catch (IOException ex) {
            inputStream.close();
            throw ex;
        }
    }

    @PutMapping("/progress")
    public ResponseEntity<Void> updateProgress(@Valid @RequestBody ReadingProgressRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        User user = currentUser.require(jwt);
        bookService.updateProgress(user, request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{bookId}/progress")
    public ResponseEntity<ReadingProgressResponse> progress(@PathVariable UUID bookId,
            @AuthenticationPrincipal Jwt jwt) {
        User user = currentUser.require(jwt);
        return bookService.progress(user, bookId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/home")
    public HomeResponse home(@AuthenticationPrincipal Jwt jwt) {
        User user = currentUser.require(jwt);
        return bookService.home(user);
    }

    /**
     * Normaliza el idioma elegido en la interfaz: vacío o "all" significa sin filtro.
     * Devuelve null cuando hay que usar el idioma configurado por defecto.
     */
    private static String normalizeLanguage(String language) {
        if (language == null) {
            return null;
        }
        String value = language.trim();
        if (value.isEmpty() || value.equalsIgnoreCase("all")) {
            return "all";
        }
        return value;
    }
}

