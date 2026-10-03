package com.localpress.content.service;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Iterator;
import java.util.UUID;

@Service
public class ImageStorageService {
    private static final long MAX_FILE_SIZE = 5L * 1024 *1024;
    private static final int MAX_DIMENSION = 4096;

    private final Path imageDirectory;

    public ImageStorageService(@Value("${localpress.storage.image-directory}") String imageDirectory){
        this .imageDirectory = Path.of(imageDirectory).toAbsolutePath().normalize();
    }

    public String store(MultipartFile file) {
        if(file == null || file.isEmpty()){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng chọn ảnh");
        }

        if(file.getSize() > MAX_FILE_SIZE){
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Ảnh tối đa 5MB");
        }

        BufferedImage image = readImage(file);

        String filename = UUID.randomUUID() + ".png";
        Path target = imageDirectory.resolve(filename);

        try{
            Files.createDirectories(imageDirectory);
            try(OutputStream output = Files.newOutputStream(target,
                    StandardOpenOption.CREATE_NEW,
                    StandardOpenOption.WRITE)){
                if(!ImageIO.write(image, "png", output)){
                    throw new IOException("Không có bộ ghi ảnh PNG");
                }
            }
            return filename;
        } catch(IOException exception){
            try{
                Files.deleteIfExists(target);
            } catch(IOException cleanupException){
                exception.addSuppressed(cleanupException);
            }

            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không lưu được ảnh", exception);
        }
    }

    private BufferedImage readImage(MultipartFile file) {
        try(InputStream input = file.getInputStream();
        ImageInputStream imageInput = ImageIO.createImageInputStream(input)){
            if(imageInput == null){
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không đọc được ảnh");
            }

            Iterator<ImageReader> readers = ImageIO.getImageReaders(imageInput);

            if(!readers.hasNext()){
                throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Chỉ hỗ trợ ảnh JPEG và PNG");
            }

            ImageReader reader = readers.next();

            try{
                String format = reader.getFormatName();
                if(!format.equalsIgnoreCase("JPEG") && !format.equalsIgnoreCase("JPNG")){
                    throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Chỉ hỗ trợ ảnh JPEG và PNG");
                }

                reader.setInput(imageInput, true, true);

                int width = reader.getWidth(0);
                int height = reader.getHeight(0);

                if(width <= 0 || height <= 0 || width > MAX_DIMENSION || height > MAX_DIMENSION){
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chiều rộng và chiều cao ảnh tối đa 4096 pixel");
                }

                return reader.read(0);
            } finally {
                reader.dispose();
            }
        }catch (IOException exception){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File ảnh bị lỗi hoặc không đọc được", exception);
        }
    }
}
