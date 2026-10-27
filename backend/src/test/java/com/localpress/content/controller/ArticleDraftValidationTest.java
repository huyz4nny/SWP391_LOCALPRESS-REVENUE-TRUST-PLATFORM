package com.localpress.content.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.content.dto.CreateArticleDraftRequest;
import com.localpress.content.service.ArticleDraftSaveService;
import jakarta.validation.Validation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ArticleDraftValidationTest {
    final ArticleDraftSaveService saves=mock(ArticleDraftSaveService.class);
    final ObjectMapper json=new ObjectMapper();
    MockMvc mvc;
    Map<String,Object> values() {
        Map<String,Object> data=new HashMap<>();
        data.put("categoryId",2); data.put("title","Title"); data.put("sapo","Sapo"); data.put("content","Content");
        return data;
    }
    @BeforeEach void setup() {
        mvc=MockMvcBuilders.standaloneSetup(new ArticleDraftSaveController(saves))
                .setControllerAdvice(new ContentExceptionHandler()).build();
    }
    @ParameterizedTest @ValueSource(strings={"title","sapo","content"})
    void whitespaceIsRejectedForBothCreateAndUpdate(String field) throws Exception {
        var data=values();data.put(field,"  ");String body=json.writeValueAsString(data);
        mvc.perform(put("/api/v1/articles/8").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors."+field).exists());
        mvc.perform(post("/api/v1/articles/drafts").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(saves);
    }
    @ParameterizedTest @ValueSource(strings={"title","sapo","content"})
    void omittedRequiredValuesAreRejected(String field) throws Exception {
        var data=values();data.remove(field);
        mvc.perform(put("/api/v1/articles/8").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(data)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors."+field).exists());
        verifyNoInteractions(saves);
    }
    @ParameterizedTest @CsvSource({"title,256","sapo,2001","content,100001","changelog,2001"})
    void oversizedTextIsRejected(String field,int size) throws Exception {
        var data=values();data.put(field,"x".repeat(size));
        mvc.perform(put("/api/v1/articles/8").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(data)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors."+field).exists());
        verifyNoInteractions(saves);
    }
    @Test void premiumRequiresPositivePriceWithFieldError() throws Exception {
        var data=values();data.put("isPremium",true);data.put("price",0);
        mvc.perform(put("/api/v1/articles/8").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(data)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.price").exists());
        verifyNoInteractions(saves);
    }
    @Test void multipartCannotBypassRequiredContent() throws Exception {
        var data=values();data.put("content","");
        mvc.perform(multipart("/api/v1/articles/8")
                .file(new MockMultipartFile("request","","application/json",json.writeValueAsBytes(data)))
                .file(new MockMultipartFile("info","","application/json","{\"altText\":\"Alt\"}".getBytes()))
                .file(new MockMultipartFile("file","cover.png","image/png",new byte[]{1}))
                .with(r->{r.setMethod("PUT");return r;}))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.content").exists());
        verifyNoInteractions(saves);
    }
    @Test void originalCreateContractAlsoRequiresSapoAndContent() {
        try(var factory=Validation.buildDefaultValidatorFactory()) {
            var errors=factory.getValidator().validate(new CreateArticleDraftRequest(2L,"Title"," ","",null));
            org.junit.jupiter.api.Assertions.assertTrue(errors.stream().anyMatch(e->e.getPropertyPath().toString().equals("sapo")));
            org.junit.jupiter.api.Assertions.assertTrue(errors.stream().anyMatch(e->e.getPropertyPath().toString().equals("content")));
        }
    }
}
