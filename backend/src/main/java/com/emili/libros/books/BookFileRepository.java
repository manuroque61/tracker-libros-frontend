package com.emili.libros.books;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookFileRepository extends JpaRepository<BookFile, UUID> {

    Optional<BookFile> findByUserIdAndBookIdAndKind(UUID userId, UUID bookId, FileKind kind);

    List<BookFile> findByBookIdAndUserId(UUID bookId, UUID userId);
}
