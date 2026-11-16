package com.localpress.shared.mail;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MailServiceTest {

    @Test
    void withoutSmtpConfigNothingIsSent() {
        MailService service = new MailService(provider(null), "", "LocalPress", "");

        assertFalse(service.isConfigured());
        assertFalse(service.send("an@test.vn", "Tiêu đề", "Nội dung"));
    }

    @Test
    void sendsToRecipient() throws Exception {
        JavaMailSender sender = sender();
        MailService service = new MailService(provider(sender), "noreply@test.vn", "LocalPress", "");

        assertTrue(service.send("an@test.vn", "Tiêu đề", "Nội dung"));

        MimeMessage sent = captured(sender);
        assertEquals("an@test.vn", sent.getAllRecipients()[0].toString());
        assertEquals("Tiêu đề", sent.getSubject());
    }

    @Test
    void redirectSendsEverythingToDemoInboxAndKeepsOriginalRecipientInSubject() throws Exception {
        JavaMailSender sender = sender();
        MailService service = new MailService(provider(sender), "noreply@test.vn", "LocalPress", "demo@test.vn");

        assertTrue(service.send("reader.an@gmail.com", "Tiêu đề", "Nội dung"));

        MimeMessage sent = captured(sender);
        assertEquals("demo@test.vn", sent.getAllRecipients()[0].toString());
        assertEquals("[gửi cho reader.an@gmail.com] Tiêu đề", sent.getSubject());
    }

    @Test
    void smtpErrorReturnsFalseInsteadOfThrowing() {
        JavaMailSender sender = sender();
        doThrow(new MailSendException("auth failed")).when(sender).send(any(MimeMessage.class));
        MailService service = new MailService(provider(sender), "noreply@test.vn", "LocalPress", "");

        assertFalse(service.send("an@test.vn", "Tiêu đề", "Nội dung"));
    }

    @Test
    void missingRecipientIsSkipped() {
        JavaMailSender sender = sender();
        MailService service = new MailService(provider(sender), "noreply@test.vn", "LocalPress", "");

        assertFalse(service.send(" ", "Tiêu đề", "Nội dung"));
        verify(sender, never()).send(any(MimeMessage.class));
    }

    private static JavaMailSender sender() {
        JavaMailSender sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenAnswer(invocation -> new MimeMessage(Session.getInstance(new Properties())));
        return sender;
    }

    private static MimeMessage captured(JavaMailSender sender) {
        ArgumentCaptor<MimeMessage> message = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender).send(message.capture());
        return message.getValue();
    }

    @SuppressWarnings("unchecked")
    private static ObjectProvider<JavaMailSender> provider(JavaMailSender sender) {
        ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(sender);
        return provider;
    }
}
