package com.emili.libros.books;

import com.emili.libros.users.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "book_files")
public class BookFile {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FileKind kind;

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "storage_path", nullable = false, length = 512)
    private String storagePath;

    @Column(nullable = false, length = 64)
    private String sha256;

    @Column(nullable = false)
    private Long size;

    @Column(name = "page_count")
    private Integer pageCount;

    @Column(name = "mime_type", length = 127)
    private String mimeType;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected BookFile() {
    }

    public BookFile(Book book, User user, FileKind kind, String originalFilename, String storagePath,
            String sha256, Long size, String mimeType) {
        this.book = book;
        this.user = user;
        this.kind = kind;
        this.originalFilename = originalFilename;
        this.storagePath = storagePath;
        this.sha256 = sha256;
        this.size = size;
        this.mimeType = mimeType;
    }

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public Book getBook() {
        return book;
    }

    public User getUser() {
        return user;
    }

    public FileKind getKind() {
        return kind;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public String getStoragePath() {
        return storagePath;
    }

    public String getSha256() {
        return sha256;
    }

    public Long getSize() {
        return size;
    }

    public String getMimeType() {
        return mimeType;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
