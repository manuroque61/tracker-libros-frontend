package com.emili.libros.books;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReadingProgressRepository extends JpaRepository<ReadingProgress, UUID> {

    Optional<ReadingProgress> findByUserIdAndBookId(UUID userId, UUID bookId);

    @Query("SELECT rp FROM ReadingProgress rp JOIN FETCH rp.book b LEFT JOIN FETCH b.authors WHERE rp.user.id = :userId ORDER BY rp.lastReadAt DESC")
    List<ReadingProgress> findRecentByUserId(@Param("userId") UUID userId, Pageable pageable);
}
