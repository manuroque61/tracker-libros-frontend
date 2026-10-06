package com.emili.libros.books.dto;

import com.emili.libros.books.FileKind;

import java.time.Instant;
import java.util.UUID;

public record BookFileInfo(UUID id, FileKind kind, long size, String mimeType, String filename, Instant createdAt) {
}
