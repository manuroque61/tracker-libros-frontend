CREATE TABLE reading_progress (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    book_file_id UUID REFERENCES book_files(id) ON DELETE SET NULL,
    progress_percent DOUBLE PRECISION,
    last_read_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uk_reading_progress_user_book UNIQUE (user_id, book_id)
);

CREATE INDEX idx_reading_progress_user_last_read ON reading_progress (user_id, last_read_at DESC);
