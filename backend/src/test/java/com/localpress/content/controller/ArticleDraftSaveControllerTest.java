package com.localpress.content.controller;

import com.localpress.content.dto.*;
import com.localpress.content.service.*;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.http.MediaType;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ArticleDraftSaveControllerTest {
    ArticleDraftSaveService saves=mock(ArticleDraftSaveService.class);
    MockMvc mvc;
    String json="{\"categoryId\":2,\"title\":\"Title\",\"sapo\":\"Sapo\",\"content\":\"Content\"}";
    @BeforeEach void setup() {
        mvc=MockMvcBuilders.standaloneSetup(new ArticleDraftSaveController(saves))
                .setControllerAdvice(new ContentExceptionHandler()).build();
    }
    @Test void putJsonIsMappedToCmsSave() throws Exception {
        mvc.perform(put("/api/v1/articles/8").contentType(MediaType.APPLICATION_JSON).content(json)).andExpect(status().isOk());
        verify(saves).update(eq(8L),any(SaveArticleDraftRequest.class),isNull(),isNull());
    }
    @Test void putMultipartAcceptsJsonPartsAndImage() throws Exception {
        mvc.perform(multipart("/api/v1/articles/8")
            .file(new MockMultipartFile("request","","application/json",json.getBytes()))
            .file(new MockMultipartFile("info","","application/json","{\"altText\":\"Alt\"}".getBytes()))
            .file(new MockMultipartFile("file","cover.png","image/png",new byte[]{1}))
            .with(r->{r.setMethod("PUT");return r;})).andExpect(status().isOk());
        verify(saves).update(eq(8L),any(),any(),any());
    }
    @Test void postEditorDraftCreatesResource() throws Exception {
        mvc.perform(post("/api/v1/articles/drafts").contentType(MediaType.APPLICATION_JSON).content(json)).andExpect(status().isCreated());
        verify(saves).create(any(),isNull(),isNull());
    }
    @Test void emptyTitleIsRejectedBeforeService() throws Exception {
        mvc.perform(put("/api/v1/articles/8").contentType(MediaType.APPLICATION_JSON)
                .content(json.replace("Title",""))).andExpect(status().isBadRequest());
        verifyNoInteractions(saves);
    }
}
