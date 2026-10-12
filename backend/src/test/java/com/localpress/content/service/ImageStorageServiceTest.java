package com.localpress.content.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.*;

class ImageStorageServiceTest {
    @TempDir Path directory;

    @Test
    void jpegIsStoredAsReadablePngAndCanBeDeleted() throws Exception {
        var service = new ImageStorageService(directory.toString());
        String filename = service.store(image("JPEG", 2, 3));
        assertTrue(filename.matches("[0-9a-f-]{36}\\.png"));
        var stored = ImageIO.read(directory.resolve(filename).toFile());
        assertEquals(2, stored.getWidth());
        assertEquals(3, stored.getHeight());
        assertEquals(0x89, Files.readAllBytes(directory.resolve(filename))[0] & 0xff);
        service.delete(filename);
        assertFalse(Files.exists(directory.resolve(filename)));
    }

    @Test
    void fakeImageDoesNotCreateAFile() throws Exception {
        var service = new ImageStorageService(directory.toString());
        assertThrows(ResponseStatusException.class,
                () -> service.store(new MockMultipartFile("file", "fake.png", "image/png", new byte[]{1, 2, 3})));
        assertEmptyDirectory();
    }

    @Test
    void fileOverFiveMegabytesIsRejectedBeforeWriting() throws Exception {
        var service = new ImageStorageService(directory.toString());
        var exception = assertThrows(ResponseStatusException.class, () -> service.store(
                new MockMultipartFile("file", "large.png", "image/png", new byte[5 * 1024 * 1024 + 1])));
        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, exception.getStatusCode());
        assertEmptyDirectory();
    }

    @Test
    void dimensionOver4096IsRejectedBeforeWriting() throws Exception {
        var service = new ImageStorageService(directory.toString());
        var exception = assertThrows(ResponseStatusException.class, () -> service.store(image("PNG", 4097, 1)));
        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEmptyDirectory();
    }

    private MockMultipartFile image(String format, int width, int height) throws Exception {
        var output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB), format, output);
        return new MockMultipartFile("file", "cover", "image/" + format.toLowerCase(), output.toByteArray());
    }

    private void assertEmptyDirectory() throws Exception {
        try (var files = Files.list(directory)) { assertEquals(0, files.count()); }
    }
}
