package com.localpress.shared.mail;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

/**
 * Gửi email văn bản ngắn qua SMTP (vd Gmail + App Password khai báo trong backend/config/application-secrets.yml).
 * - Chưa khai báo spring.mail.host thì Spring không tạo JavaMailSender: send() bỏ qua và trả false, app vẫn chạy.
 * - localpress.mail.redirect-to (chỉ dùng khi demo): mọi thư được gửi về địa chỉ này, tiêu đề ghi người nhận gốc,
 *   để không bao giờ gửi nhầm tới chủ thật của các email mẫu như reader.an@gmail.com.
 * - Không ném lỗi ra ngoài: gửi mail là kênh phụ, lỗi SMTP không được làm hỏng nghiệp vụ đã xong.
 */
@Slf4j
@Service
public class MailService {

    private final ObjectProvider<JavaMailSender> senders;
    private final String from;
    private final String fromName;
    private final String redirectTo;

    public MailService(ObjectProvider<JavaMailSender> senders,
                       @Value("${localpress.mail.from:${spring.mail.username:}}") String from,
                       @Value("${localpress.mail.from-name:LocalPress}") String fromName,
                       @Value("${localpress.mail.redirect-to:}") String redirectTo) {
        this.senders = senders;
        this.from = from == null ? "" : from.trim();
        this.fromName = fromName == null || fromName.isBlank() ? "LocalPress" : fromName.trim();
        this.redirectTo = redirectTo == null ? "" : redirectTo.trim();
    }

    /** true nếu SMTP đã được cấu hình (có JavaMailSender và địa chỉ người gửi). */
    public boolean isConfigured() {
        return senders.getIfAvailable() != null && !from.isEmpty();
    }

    /**
     * Gửi một thư văn bản. Trả true khi máy chủ SMTP đã nhận thư, false khi chưa cấu hình,
     * thiếu người nhận hoặc gửi lỗi (đã ghi log).
     */
    public boolean send(String to, String subject, String body) {
        JavaMailSender sender = senders.getIfAvailable();
        if (sender == null || from.isEmpty()) {
            log.info("Bỏ qua gửi email '{}' vì chưa cấu hình SMTP (spring.mail.host, spring.mail.username)", subject);
            return false;
        }
        if (to == null || to.isBlank()) {
            log.warn("Bỏ qua gửi email '{}' vì không có địa chỉ người nhận", subject);
            return false;
        }
        String recipient = redirectTo.isEmpty() ? to.trim() : redirectTo;
        String finalSubject = redirectTo.isEmpty() ? subject : "[gửi cho " + to.trim() + "] " + subject;
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            helper.setFrom(new InternetAddress(from, fromName, StandardCharsets.UTF_8.name()));
            helper.setTo(recipient);
            helper.setSubject(finalSubject);
            helper.setText(body, false);
            sender.send(message);
            log.info("Đã gửi email '{}' tới {}", finalSubject, recipient);
            return true;
        } catch (MailException | MessagingException | UnsupportedEncodingException exception) {
            log.warn("Gửi email '{}' tới {} thất bại: {}", finalSubject, recipient, exception.getMessage());
            return false;
        }
    }
}
