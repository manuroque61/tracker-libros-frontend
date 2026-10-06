package com.emili.libros.books;

import com.emili.libros.books.external.GutendexClient;
import com.emili.libros.users.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.client.HttpClientErrorException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BookControllerTest {

    private static final String BOOK_JSON = """
            {
              "id": 84,
              "title": "Frankenstein; or, the modern prometheus",
              "authors": [{"name": "Shelley, Mary Wollstonecraft", "birth_year": 1797, "death_year": 1851}],
              "languages": ["en"],
              "summaries": ["\\"Frankenstein; Or, The Modern Prometheus\\" es una novela gótica."],
              "formats": {
                "application/epub+zip": "https://www.gutenberg.org/ebooks/84.epub3.images",
                "image/jpeg": "https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg"
              },
              "download_count": 12345
            }
            """;

    private static final String SEARCH_JSON = """
            {"count": 1, "results": [%s]}
            """.formatted(BOOK_JSON);

    private static final byte[] EPUB_BYTES = {'P', 'K', 3, 4, 1, 2, 3, 4};

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private BookFileRepository bookFileRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SearchCache searchCache;

    @MockitoBean
    private GutendexClient gutendexClient;

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        bookFileRepository.deleteAll();
        bookRepository.deleteAll();
        userRepository.deleteAll();
        searchCache.clear();
        token = register("emili", "emili@example.com");
    }

    @Test
    void searchRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/books/search").param("q", "frankenstein"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void searchWithoutQueryParameterReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/books/search").header("Authorization", bearer()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void downloadWithMalformedIdentifiersReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/books/{bookId}/files/{fileId}", "no-uuid", "tampoco-uuid")
                        .header("Authorization", bearer()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void searchMapsGutendexResults() throws Exception {
        when(gutendexClient.search(eq("frankenstein"), anyInt())).thenReturn(objectMapper.readTree(SEARCH_JSON));

        mockMvc.perform(get("/api/books/search")
                        .param("q", "frankenstein")
                        .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].externalId").value(84))
                .andExpect(jsonPath("$[0].title").value("Frankenstein; or, the modern prometheus"))
                .andExpect(jsonPath("$[0].authors[0]").value("Shelley, Mary Wollstonecraft"))
                .andExpect(jsonPath("$[0].language").value("en"))
                .andExpect(jsonPath("$[0].epubAvailable").value(true))
                .andExpect(jsonPath("$[0].downloadCount").value(12345));
    }

    @Test
    void importDownloadsEpubAndListReturnsIt() throws Exception {
        stubBook();
        byte[] epub = EPUB_BYTES;
        when(gutendexClient.download("https://www.gutenberg.org/ebooks/84.epub3.images")).thenReturn(epub);

        MvcResult imported = mockMvc.perform(post("/api/books/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"externalId\":84}")
                        .header("Authorization", bearer()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Frankenstein; or, the modern prometheus"))
                .andExpect(jsonPath("$.authors[0]").value("Shelley, Mary Wollstonecraft"))
                .andExpect(jsonPath("$.files[0].kind").value("EPUB"))
                .andExpect(jsonPath("$.files[0].size").value(epub.length))
                .andReturn();

        JsonNode detail = objectMapper.readTree(imported.getResponse().getContentAsString());
        UUID bookId = UUID.fromString(detail.get("id").asText());
        UUID fileId = UUID.fromString(detail.get("files").get(0).get("id").asText());

        mockMvc.perform(get("/api/books").header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(bookId.toString()))
                .andExpect(jsonPath("$[0].files").hasJsonPath());

        mockMvc.perform(get("/api/books/{bookId}/files/{fileId}", bookId, fileId)
                        .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/epub+zip"))
                .andExpect(header().string("Content-Disposition", containsString("attachment")))
                .andExpect(content().bytes(epub));
    }

    @Test
    void importIsIdempotentForSameUserAndBook() throws Exception {
        stubBook();
        when(gutendexClient.download(anyString())).thenReturn(EPUB_BYTES);

        MvcResult first = mockMvc.perform(post("/api/books/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"externalId\":84}")
                        .header("Authorization", bearer()))
                .andExpect(status().isCreated())
                .andReturn();

        MvcResult second = mockMvc.perform(post("/api/books/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"externalId\":84}")
                        .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode firstDetail = objectMapper.readTree(first.getResponse().getContentAsString());
        JsonNode secondDetail = objectMapper.readTree(second.getResponse().getContentAsString());
        assertThat(secondDetail.get("files").get(0).get("id").asText())
                .isEqualTo(firstDetail.get("files").get(0).get("id").asText());
    }

    @Test
    void importWithoutEpubFormatReturnsConflict() throws Exception {
        when(gutendexClient.book(99)).thenReturn(objectMapper.readTree("""
                {"id": 99, "title": "Sin epub", "authors": [], "languages": ["en"],
                 "formats": {"text/html": "https://www.gutenberg.org/ebooks/99.html"}}
                """));

        mockMvc.perform(post("/api/books/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"externalId\":99}")
                        .header("Authorization", bearer()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void downloadOfAnotherUsersFileReturnsNotFound() throws Exception {
        stubBook();
        when(gutendexClient.download(anyString())).thenReturn(EPUB_BYTES);

        String otherToken = register("otra", "otra@example.com");
        MvcResult imported = mockMvc.perform(post("/api/books/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"externalId\":84}")
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode detail = objectMapper.readTree(imported.getResponse().getContentAsString());
        UUID bookId = UUID.fromString(detail.get("id").asText());
        UUID fileId = UUID.fromString(detail.get("files").get(0).get("id").asText());

        mockMvc.perform(get("/api/books/{bookId}/files/{fileId}", bookId, fileId)
                        .header("Authorization", bearer()))
                .andExpect(status().isNotFound());
    }

    @Test
    void listOnlyReturnsBooksImportedByTheUser() throws Exception {
        stubBook();
        when(gutendexClient.download(anyString())).thenReturn(EPUB_BYTES);
        String otherToken = register("otra", "otra@example.com");

        mockMvc.perform(post("/api/books/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"externalId\":84}")
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/books").header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void unknownPathReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/ruta-que-no-existe").header("Authorization", bearer()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void searchResultsAreCached() throws Exception {
        when(gutendexClient.search(anyString(), anyInt())).thenReturn(objectMapper.readTree(SEARCH_JSON));

        mockMvc.perform(get("/api/books/search").param("q", "Tolkien").header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].externalId").value(84));

        mockMvc.perform(get("/api/books/search").param("q", "  tolkien ").header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].externalId").value(84));

        verify(gutendexClient, times(1)).search(anyString(), anyInt());
    }

    @Test
    void importWithClientMetadataSkipsExternalMetadataLookup() throws Exception {
        when(gutendexClient.download("https://www.gutenberg.org/ebooks/84.epub3.images")).thenReturn(EPUB_BYTES);

        mockMvc.perform(post("/api/books/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"externalId":84,"title":"Frankenstein",
                                 "authors":["Shelley, Mary Wollstonecraft"],"language":"en",
                                 "coverUrl":"https://example.org/cover.jpg","description":"Resumen de prueba"}
                                """)
                        .header("Authorization", bearer()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Frankenstein"))
                .andExpect(jsonPath("$.description").value("Resumen de prueba"))
                .andExpect(jsonPath("$.coverUrl").value("https://example.org/cover.jpg"))
                .andExpect(jsonPath("$.authors[0]").value("Shelley, Mary Wollstonecraft"))
                .andExpect(jsonPath("$.files[0].kind").value("EPUB"));

        verify(gutendexClient, never()).book(anyLong());
    }

    private void stubBook() throws Exception {
        when(gutendexClient.book(84)).thenReturn(objectMapper.readTree(BOOK_JSON));
    }

    private String register(String username, String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"%s\",\"email\":\"%s\",\"password\":\"supersecret1\"}"
                                .formatted(username, email)))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return body.get("accessToken").asText();
    }

    private String bearer() {
        return "Bearer " + token;
    }

    @Test
    void unknownBookReturnsNotFound() throws Exception {
        when(gutendexClient.book(123456)).thenThrow(new HttpClientErrorException(HttpStatus.NOT_FOUND));

        mockMvc.perform(post("/api/books/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"externalId\":123456}")
                        .header("Authorization", bearer()))
                .andExpect(status().isNotFound());
    }
}
