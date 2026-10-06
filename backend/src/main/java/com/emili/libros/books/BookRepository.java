package com.emili.libros.books;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookRepository extends JpaRepository<Book, UUID> {

    Optional<Book> findBySourceAndExternalId(String source, String externalId);

    @Query("""
            select distinct b
            from Book b, BookFile f
            where f.book = b and f.user.id = :userId
            order by b.createdAt desc
            """)
    List<Book> findAllByUserFile(@Param("userId") UUID userId);
}
