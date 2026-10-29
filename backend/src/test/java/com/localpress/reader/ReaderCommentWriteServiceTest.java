package com.localpress.reader;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.reader.dto.ReaderCommentResponse;
import com.localpress.reader.dto.ReportCommentResponse;
import com.localpress.reader.repository.ReaderCommentRepository;
import com.localpress.reader.repository.ReaderCommentRepository.CommentHead;
import com.localpress.reader.service.ReaderCommentWriteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReaderCommentWriteServiceTest {

    private ReaderCommentRepository repository;
    private ReaderCommentWriteService service;

    @BeforeEach
    void setUp() {
        repository = mock(ReaderCommentRepository.class);
        service = new ReaderCommentWriteService(repository, new ObjectMapper());
    }

    @Test
    void postOnPublishedArticleInsertsPending() {
        when(repository.isPublishedArticle(3L)).thenReturn(true);
        when(repository.insertPending(6L, 3L, "Xin chào")).thenReturn(15L);
        when(repository.findResponse(15L)).thenReturn(Optional.of(comment(15L, "PENDING")));

        ReaderCommentResponse saved = service.post(6L, 3L, "  Xin chào  ");

        assertEquals("PENDING", saved.getStatus());
        verify(repository).insertPending(6L, 3L, "Xin chào");
    }

    @Test
    void postOnMissingArticleDoesNotInsert() {
        when(repository.isPublishedArticle(9L)).thenReturn(false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.post(6L, 9L, "Nội dung"));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        verify(repository, never()).insertPending(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), anyString());
    }

    @Test
    void editOwnCommentSetsPendingWithoutTouchingModerator() {
        when(repository.findHead(4L)).thenReturn(Optional.of(new CommentHead(4L, 1L, 6L, "APPROVED")));
        when(repository.updateOwnContentToPending(4L, 6L, "Sửa lại")).thenReturn(1);
        when(repository.findResponse(4L)).thenReturn(Optional.of(comment(4L, "PENDING")));

        ReaderCommentResponse saved = service.edit(6L, 4L, "Sửa lại");

        assertEquals("PENDING", saved.getStatus());
        verify(repository).updateOwnContentToPending(4L, 6L, "Sửa lại");
    }

    @Test
    void editSomeoneElsesCommentIsForbidden() {
        when(repository.findHead(4L)).thenReturn(Optional.of(new CommentHead(4L, 1L, 7L, "APPROVED")));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.edit(6L, 4L, "Sửa"));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        verify(repository, never()).updateOwnContentToPending(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), anyString());
    }

    @Test
    void reportApprovedCommentWritesAuditAndMovesToPending() {
        when(repository.findHead(10L)).thenReturn(Optional.of(new CommentHead(10L, 1L, 7L, "APPROVED")));
        when(repository.markApprovedAsPending(10L)).thenReturn(1);

        ReportCommentResponse result = service.report(6L, 10L, "Spam");

        assertEquals("PENDING", result.status());
        verify(repository).markApprovedAsPending(10L);
        verify(repository).insertReportAudit(eq(6L), eq(10L), contains("APPROVED"), contains("Spam"));
    }

    @Test
    void reportRejectedCommentDoesNotReopen() {
        when(repository.findHead(11L)).thenReturn(Optional.of(new CommentHead(11L, 1L, 7L, "REJECTED")));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.report(6L, 11L, "Spam"));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(repository, never()).markApprovedAsPending(org.mockito.ArgumentMatchers.any());
        verify(repository, never()).insertReportAudit(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), anyString(), anyString());
    }

    @Test
    void reportHiddenCommentDoesNotReopen() {
        when(repository.findHead(12L)).thenReturn(Optional.of(new CommentHead(12L, 1L, 7L, "HIDDEN")));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.report(6L, 12L, "Spam"));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(repository, never()).insertReportAudit(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), anyString(), anyString());
    }

    @Test
    void reportOwnApprovedCommentIsBlocked() {
        when(repository.findHead(13L)).thenReturn(Optional.of(new CommentHead(13L, 1L, 6L, "APPROVED")));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.report(6L, 13L, "Tự báo"));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(repository, never()).markApprovedAsPending(org.mockito.ArgumentMatchers.any());
    }

    private ReaderCommentResponse comment(Long id, String status) {
        return ReaderCommentResponse.builder().id(id).articleId(1L).userId(6L).content("Nội dung").status(status).build();
    }
}
