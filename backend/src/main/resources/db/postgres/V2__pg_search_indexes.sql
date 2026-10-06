CREATE INDEX idx_books_title_lower ON books(lower(title));
CREATE INDEX idx_books_authors_name_lower ON books_authors(lower(author_name));
