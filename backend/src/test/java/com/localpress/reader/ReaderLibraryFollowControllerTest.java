package com.localpress.reader;

import com.localpress.reader.controller.ReaderFollowController;
import com.localpress.reader.controller.ReaderLibraryController;
import com.localpress.reader.controller.ReaderPurchaseExceptionHandler;
import com.localpress.reader.dto.BookmarkStateResponse;
import com.localpress.reader.dto.FollowStateResponse;
import com.localpress.reader.dto.FollowedCategoryResponse;
import com.localpress.reader.service.ReaderBookmarkService;
import com.localpress.reader.service.ReaderCurrentUser;
import com.localpress.reader.service.ReaderFollowService;
import com.localpress.reader.service.ReaderHistoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ReaderLibraryFollowControllerTest {

    private ReaderBookmarkService bookmarkService;
    private ReaderHistoryService historyService;
    private ReaderFollowService followService;
    private ReaderCurrentUser currentUser;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        bookmarkService = mock(ReaderBookmarkService.class);
        historyService = mock(ReaderHistoryService.class);
        followService = mock(ReaderFollowService.class);
        currentUser = mock(ReaderCurrentUser.class);
        mvc = MockMvcBuilders
                .standaloneSetup(
                        new ReaderLibraryController(bookmarkService, historyService, currentUser),
                        new ReaderFollowController(followService, currentUser))
                .setControllerAdvice(new ReaderPurchaseExceptionHandler())
                .build();
    }

    @Test
    void saveUsesUserFromSession() throws Exception {
        when(currentUser.requireUserId()).thenReturn(6L);
        when(bookmarkService.save(6L, 3L)).thenReturn(new BookmarkStateResponse(3L, true));

        mvc.perform(put("/api/v1/reader/saved-articles/3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.articleId").value(3))
                .andExpect(jsonPath("$.saved").value(true));
    }

    @Test
    void removeReturnsSavedFalse() throws Exception {
        when(currentUser.requireUserId()).thenReturn(6L);
        when(bookmarkService.remove(6L, 3L)).thenReturn(new BookmarkStateResponse(3L, false));

        mvc.perform(delete("/api/v1/reader/saved-articles/3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.saved").value(false));
    }

    @Test
    void savedIdsReturnsList() throws Exception {
        when(currentUser.requireUserId()).thenReturn(7L);
        when(bookmarkService.getSavedArticleIds(7L)).thenReturn(List.of(2L, 5L));

        mvc.perform(get("/api/v1/reader/saved-articles/ids"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0]").value(2))
                .andExpect(jsonPath("$[1]").value(5));
    }

    @Test
    void pageSizeIsCappedAt50() throws Exception {
        when(currentUser.requireUserId()).thenReturn(6L);
        when(bookmarkService.getSavedArticles(6L, PageRequest.of(0, 50)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(), PageRequest.of(0, 50), 0));

        mvc.perform(get("/api/v1/reader/saved-articles").param("page", "-1").param("size", "999"))
                .andExpect(status().isOk());
        verify(bookmarkService).getSavedArticles(6L, PageRequest.of(0, 50));
    }

    @Test
    void notLoggedInReturns401WithoutTouchingService() throws Exception {
        when(currentUser.requireUserId())
                .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập"));

        mvc.perform(put("/api/v1/reader/saved-articles/3"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Bạn cần đăng nhập"));
        verify(bookmarkService, never()).save(any(), any());
    }

    @Test
    void nonNumericIdIsNotRouted() throws Exception {
        mvc.perform(put("/api/v1/reader/saved-articles/abc"))
                .andExpect(status().isNotFound());
        verify(bookmarkService, never()).save(any(), any());
    }

    @Test
    void followMissingCategoryReturns404WithMessage() throws Exception {
        when(currentUser.requireUserId()).thenReturn(6L);
        when(followService.follow(6L, 99L)).thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND,
                "Không tìm thấy chuyên mục hoặc chuyên mục đã ngừng hoạt động"));

        mvc.perform(put("/api/v1/reader/followed-categories/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Không tìm thấy chuyên mục hoặc chuyên mục đã ngừng hoạt động"));
    }

    @Test
    void followedCategoriesAndUnfollow() throws Exception {
        when(currentUser.requireUserId()).thenReturn(6L);
        when(followService.getFollowedCategories(6L)).thenReturn(List.of(FollowedCategoryResponse.builder()
                .id(2L).name("Kinh tế").slug("kinh-te").articleCount(4L).build()));
        when(followService.unfollow(6L, 2L)).thenReturn(new FollowStateResponse(2L, false));

        mvc.perform(get("/api/v1/reader/followed-categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].slug").value("kinh-te"))
                .andExpect(jsonPath("$[0].articleCount").value(4));
        mvc.perform(delete("/api/v1/reader/followed-categories/2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.following").value(false));
    }

    @Test
    void purchasedArticlesUsesUserFromSession() throws Exception {
        when(currentUser.requireUserId()).thenReturn(6L);
        when(bookmarkService.getPurchasedArticles(6L, PageRequest.of(0, 20)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(
                        List.of(com.localpress.reader.dto.ArticleSummaryResponse.builder()
                                .id(1L).slug("bai-da-mua").title("Bài đã mua").isPremium(true).build()),
                        PageRequest.of(0, 20), 1));

        mvc.perform(get("/api/v1/reader/purchased-articles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].slug").value("bai-da-mua"));
    }

    @Test
    void readingHistoryUsesUserFromSession() throws Exception {
        when(currentUser.requireUserId()).thenReturn(6L);
        when(historyService.getHistory(6L, PageRequest.of(0, 20)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(
                        List.of(com.localpress.reader.dto.ReadingHistoryItemResponse.builder()
                                .articleId(1L).slug("bai-1").title("Bài 1").build()),
                        PageRequest.of(0, 20), 1));

        mvc.perform(get("/api/v1/reader/reading-history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].slug").value("bai-1"));
    }

    @Test
    void removeReadingHistoryReturnsSavedFalse() throws Exception {
        when(currentUser.requireUserId()).thenReturn(6L);

        mvc.perform(delete("/api/v1/reader/reading-history/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.articleId").value(1))
                .andExpect(jsonPath("$.saved").value(false));
        verify(historyService).remove(6L, 1L);
    }
}
