package com.emili.libros.books;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "books")
public class Book {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false)
    private String title;

    private String subtitle;

    @Column(name = "isbn13", length = 13)
    private String isbn13;

    private String publisher;

    @Column(name = "published_year")
    private Integer publishedYear;

    @Column(length = 5)
    private String language;

    @Column(name = "page_count")
    private Integer pageCount;

    private String description;

    @Column(name = "cover_url", length = 1024)
    private String coverUrl;

    @Column(nullable = false, length = 20)
    private String source;

    @Column(name = "external_id", length = 100)
    private String externalId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "books_authors", joinColumns = @JoinColumn(name = "book_id"))
    @Column(name = "author_name", length = 150, nullable = false)
    private Set<String> authors = new LinkedHashSet<>();

    protected Book() {
    }

    public Book(String title, String source, String externalId) {
        this.title = title;
        this.source = source;
        this.externalId = externalId;
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

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getSubtitle() {
        return subtitle;
    }

    public void setSubtitle(String subtitle) {
        this.subtitle = subtitle;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCoverUrl() {
        return coverUrl;
    }

    public void setCoverUrl(String coverUrl) {
        this.coverUrl = coverUrl;
    }

    public String getSource() {
        return source;
    }

    public String getExternalId() {
        return externalId;
    }

    public Set<String> getAuthors() {
        return authors;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
