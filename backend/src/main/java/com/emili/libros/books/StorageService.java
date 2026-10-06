package com.emili.libros.books;

import com.emili.libros.common.error.NotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class StorageService {

    private final Path root;

    public StorageService(@Value("${app.storage.root}") String rootPath) throws IOException {
        this.root = Paths.get(rootPath).toAbsolutePath().normalize();
        Files.createDirectories(this.root);
    }

    public record StoredFile(String storagePath, long size) {
    }

    public StoredFile store(UUID userId, String sha256, String extension, byte[] content) throws IOException {
        Path directory = root.resolve(userId.toString());
        Files.createDirectories(directory);
        Path target = directory.resolve(sha256 + "." + extension);
        if (!Files.exists(target)) {
            Files.write(target, content);
        }
        return new StoredFile(relativize(target), Files.size(target));
    }

    public Path resolve(String storagePath) {
        Path path = root.resolve(storagePath).normalize();
        if (!path.startsWith(root)) {
            throw new NotFoundException("Archivo no encontrado");
        }
        return path;
    }

    private String relativize(Path path) {
        return root.relativize(path).toString().replace('\\', '/');
    }
}
