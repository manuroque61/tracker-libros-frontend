CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE books (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    isbn13 VARCHAR(13),
    publisher VARCHAR(150),
    published_year INTEGER,
    language VARCHAR(5),
    page_count INTEGER,
    description TEXT,
    cover_url VARCHAR(1024),
    source VARCHAR(20) NOT NULL,
    external_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uk_books_source_ext UNIQUE (source, external_id)
);

CREATE TABLE books_authors (
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    author_name VARCHAR(150) NOT NULL,
    PRIMARY KEY (book_id, author_name)
);

CREATE TYPE shelf_status AS ENUM ('PENDING', 'READING', 'COMPLETED', 'ABANDONED', 'DNF');

CREATE TABLE shelf_entries (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    status shelf_status NOT NULL DEFAULT 'PENDING',
    rating SMALLINT,
    progress_page INTEGER,
    progress_percent DECIMAL(5,2),
    review TEXT,
    cfi VARCHAR(512),
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_id, book_id)
);

CREATE TYPE file_kind AS ENUM ('PDF', 'EPUB', 'HTML');

CREATE TABLE book_files (
    id UUID PRIMARY KEY,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    kind file_kind NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(512) NOT NULL UNIQUE,
    sha256 VARCHAR(64) NOT NULL,
    size BIGINT NOT NULL,
    page_count INTEGER,
    mime_type VARCHAR(127),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CHECK (user_id IS NOT NULL OR kind IN ('EPUB','HTML'))
);

CREATE INDEX idx_shelf_user_status ON shelf_entries(user_id, status);
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_authors_name ON books_authors(author_name);