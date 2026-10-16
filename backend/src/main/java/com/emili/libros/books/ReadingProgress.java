package com.emili.libros.books;

import com.emili.libros.users.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "reading_progress",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "book_id"})
)
public class ReadingProgress {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_file_id")
    private BookFile bookFile;

    @Column(name = "progress_percent")
    private Double progressPercent;

    @Column(name = "location_cfi", length = 512)
    private String locationCfi;

    @Column(name = "last_read_at", nullable = false)
    private Instant lastReadAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    protected ReadingProgress() {
    }

    public ReadingProgress(User user, Book book, BookFile bookFile) {
        this.user = user;
        this.book = book;
        this.bookFile = bookFile;
        this.progressPercent = 0.0;
    }

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (lastReadAt == null) {
            lastReadAt = Instant.now();
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
        if (lastReadAt == null) {
            lastReadAt = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public Book getBook() {
        return book;
    }

    public BookFile getBookFile() {
        return bookFile;
    }

    public void setBookFile(BookFile bookFile) {
        this.bookFile = bookFile;
    }

    public Double getProgressPercent() {
        return progressPercent;
    }

    public void setProgressPercent(Double progressPercent) {
        this.progressPercent = progressPercent;
    }

    public String getLocationCfi() {
        return locationCfi;
    }

    public void setLocationCfi(String locationCfi) {
        this.locationCfi = locationCfi;
    }

    public void touch() {
        this.lastReadAt = Instant.now();
    }

    public Instant getLastReadAt() {
        return lastReadAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
