package com.localpress.content.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class EditorialAiServiceTest {
    final RestClient.Builder builder = RestClient.builder();
    final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    final String json = "{\"suggestedTitles\":[\"Tiêu đề\"],\"suggestedSapo\":\"Sapo\",\"suggestedTags\":[\"Tag\"]}";

    @Test void missingConfigurationMakesNoProviderRequest() {
        var service = new EditorialAiService("gemini", "model", "", builder.build());
        assertEquals(503, assertThrows(ResponseStatusException.class, () -> service.suggest("Topic")).getStatusCode().value());
        server.verify();
    }
    @Test void geminiContractAndCredentialsStayServerSide() throws Exception {
        String text = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(json);
        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent"))
                .andExpect(header("x-goog-api-key", "test-key"))
                .andExpect(jsonPath("$.contents[0].parts[0].text").value("Topic"))
                .andRespond(withSuccess("{\"candidates\":[{\"content\":{\"parts\":[{\"text\":" + text + "}]}}]}", MediaType.APPLICATION_JSON));
        var result = new EditorialAiService("gemini", "test-model", "test-key", builder.build()).suggest("Topic");
        assertEquals("Tiêu đề", result.suggestedTitles().get(0));
        server.verify();
    }
    @Test void claudeContract() throws Exception {
        String text = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(json);
        server.expect(requestTo("https://api.anthropic.com/v1/messages"))
                .andExpect(header("anthropic-version", "2023-06-01"))
                .andExpect(header("x-api-key", "test-key"))
                .andExpect(jsonPath("$.model").value("test-model"))
                .andRespond(withSuccess("{\"content\":[{\"type\":\"text\",\"text\":" + text + "}]}", MediaType.APPLICATION_JSON));
        assertEquals("Sapo", new EditorialAiService("claude", "test-model", "test-key", builder.build()).suggest("Topic").suggestedSapo());
        server.verify();
    }
    @Test void providerErrorsAreSanitized() {
        server.expect(anything()).andRespond(withServerError().body("secret provider payload"));
        var service = new EditorialAiService("claude", "model", "test-key", builder.build());
        var error = assertThrows(ResponseStatusException.class, () -> service.suggest("Topic"));
        assertEquals(502, error.getStatusCode().value());
        assertFalse(error.getMessage().contains("secret"));
        server.verify();
    }
    @Test void malformedOrBlockedResponseDoesNotProduceFakeSuggestions() {
        server.expect(anything()).andRespond(withSuccess("{\"candidates\":[]}", MediaType.APPLICATION_JSON));
        var service = new EditorialAiService("gemini", "model", "test-key", builder.build());
        assertEquals(502, assertThrows(ResponseStatusException.class, () -> service.suggest("Topic")).getStatusCode().value());
        server.verify();
    }

    @Test void titleAtEditorLimitCanBeApplied() throws Exception {
        var service = responseWith("T".repeat(255), "Tag");
        assertEquals(255, service.suggest("Topic").suggestedTitles().get(0).length());
        server.verify();
    }

    @Test void titleAboveEditorLimitIsRejected() throws Exception {
        var service = responseWith("T".repeat(256), "Tag");
        assertEquals(502, assertThrows(ResponseStatusException.class,
                () -> service.suggest("Topic")).getStatusCode().value());
        server.verify();
    }

    @Test void commaDelimitedTagCannotBypassEditorTagLimits() throws Exception {
        var service = responseWith("Title", "One,Two");
        assertEquals(502, assertThrows(ResponseStatusException.class,
                () -> service.suggest("Topic")).getStatusCode().value());
        server.verify();
    }

    private EditorialAiService responseWith(String title, String tag) throws Exception {
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        var suggestions = new EditorialAiService.Suggestions(java.util.List.of(title), "Sapo", java.util.List.of(tag));
        String text = mapper.writeValueAsString(mapper.writeValueAsString(suggestions));
        server.expect(anything()).andRespond(withSuccess(
                "{\"content\":[{\"type\":\"text\",\"text\":" + text + "}]}", MediaType.APPLICATION_JSON));
        return new EditorialAiService("claude", "model", "test-key", builder.build());
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.CsvSource({
        "400,AI_PROVIDER_BAD_REQUEST", "401,AI_PROVIDER_ACCESS_DENIED",
        "403,AI_PROVIDER_ACCESS_DENIED", "404,AI_MODEL_UNAVAILABLE",
        "429,AI_PROVIDER_LIMIT", "503,AI_PROVIDER_ERROR"
    })
    void providerFailureIsClassifiedWithoutExposingBody(int status, String code) {
        server.expect(org.springframework.test.web.client.ExpectedCount.times(status == 503 ? 2 : 1), anything()).andRespond(withStatus(org.springframework.http.HttpStatus.valueOf(status))
                .body("secret-key private-topic"));
        var service = new EditorialAiService("gemini", "model", "test-key", builder.build());
        var error = assertThrows(EditorialAiService.AiException.class, () -> service.suggest("Topic"));
        assertEquals(code, error.getCode());
        assertFalse(error.getReason().contains("secret-key"));
        assertFalse(error.getReason().contains("private-topic"));
        server.verify();
    }

    @Test void endpointReturnsSafeMessageAndCode() throws Exception {
        server.expect(anything()).andRespond(withStatus(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS)
                .body("secret-key private-topic"));
        var service = new EditorialAiService("gemini", "model", "test-key", builder.build());
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(
                new com.localpress.content.controller.EditorialAiController(service)).build();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .post("/api/v1/editorial/ai/suggest").contentType(MediaType.APPLICATION_JSON)
                .content("{\"topic\":\"Topic\"}"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadGateway())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.code").value("AI_PROVIDER_LIMIT"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.message").isNotEmpty());
        server.verify();
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"gemini", "claude"})
    void temporary503RecoversOnSecondAttempt(String provider) throws Exception {
        String text = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(json);
        String body = provider.equals("gemini")
                ? "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":" + text + "}]}}]}"
                : "{\"content\":[{\"type\":\"text\",\"text\":" + text + "}]}";
        server.expect(anything()).andRespond(withStatus(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE));
        server.expect(anything()).andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
        assertEquals("Sapo", new EditorialAiService(provider, "model", "test-key", builder.build())
                .suggest("Topic").suggestedSapo());
        server.verify();
    }

    @Test void retryAfterDoesNotCauseAnEarlyRetry() {
        server.expect(anything()).andRespond(withStatus(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE)
                .header("Retry-After", "60"));
        var error = assertThrows(EditorialAiService.AiException.class,
                () -> new EditorialAiService("gemini", "model", "test-key", builder.build()).suggest("Topic"));
        assertEquals("AI_PROVIDER_ERROR", error.getCode());
        server.verify();
    }

    @Test void interruptionStopsRetryAndPreservesInterruptFlag() {
        server.expect(anything()).andRespond(withStatus(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE));
        Thread.currentThread().interrupt();
        try {
            var error = assertThrows(EditorialAiService.AiException.class,
                    () -> new EditorialAiService("gemini", "model", "test-key", builder.build()).suggest("Topic"));
            assertEquals("AI_REQUEST_INTERRUPTED", error.getCode());
            assertTrue(Thread.currentThread().isInterrupted());
        } finally {
            Thread.interrupted();
        }
        server.verify();
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"html", "json", "timeout", "resourceTimeout"})
    void responseDiagnosticsAreCorrelatedAndNeverLogSensitivePayload(String kind) throws Exception {
        var logger = (ch.qos.logback.classic.Logger) org.slf4j.LoggerFactory.getLogger(EditorialAiService.class);
        var appender = new ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent>();
        appender.start();
        logger.addAppender(appender);
        try {
            if (kind.equals("timeout") || kind.equals("resourceTimeout")) {
                server.expect(anything()).andRespond(request -> {
                    var timeout = new java.net.SocketTimeoutException("secret-key private-topic");
                    timeout.initCause(new java.net.SocketTimeoutException("secret-key private-topic"));
                    if (kind.equals("resourceTimeout")) {
                        throw new org.springframework.web.client.ResourceAccessException("secret-key private-topic", timeout);
                    }
                    throw new org.springframework.web.client.RestClientException("secret-key private-topic", timeout);
                });
            } else {
                server.expect(anything()).andRespond(withSuccess("secret-key private-topic",
                        kind.equals("html") ? MediaType.TEXT_HTML : MediaType.APPLICATION_JSON));
            }
            var service = new EditorialAiService("gemini", "model", "secret-key", builder.build());
            var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(
                    new com.localpress.content.controller.EditorialAiController(service)).build();
            var result = mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                    .post("/api/v1/editorial/ai/suggest").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"topic\":\"private-topic\"}"))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadGateway())
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.code").value(kind.equals("timeout") || kind.equals("resourceTimeout") ? "AI_TIMEOUT" : "AI_RESPONSE_ERROR"))
                    .andReturn();
            String body = result.getResponse().getContentAsString();
            String id = new com.fasterxml.jackson.databind.ObjectMapper().readTree(body).path("diagnosticId").asText();
            assertDoesNotThrow(() -> java.util.UUID.fromString(id));
            assertEquals(1, appender.list.size());
            var event = appender.list.get(0);
            String log = event.getFormattedMessage();
            assertTrue(log.contains(id));
            assertTrue(log.contains(kind.equals("timeout") || kind.equals("resourceTimeout") ? "SocketTimeoutException"
                    : kind.equals("html") ? "UnknownContentTypeException" : "HttpMessageNotReadableException"));
            assertNull(event.getThrowableProxy());
            for (String safeOutput : java.util.List.of(log, body)) {
                assertFalse(safeOutput.contains("secret-key"));
                assertFalse(safeOutput.contains("private-topic"));
            }
            server.verify();
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(ints = {0, -1, 121})
    void invalidReadTimeoutCannotEnableAnUnboundedWait(int seconds) {
        assertThrows(IllegalArgumentException.class,
                () -> new EditorialAiService("gemini", "model", "test-key", seconds));
    }

    @Test void readTimeoutConfigurationDefaultsTo60AndAcceptsOverride() {
        new org.springframework.boot.test.context.runner.ApplicationContextRunner()
                .withBean(EditorialAiService.class)
                .run(context -> {
                    assertNull(context.getStartupFailure());
                    assertNotNull(context.getBean(EditorialAiService.class));
                });
        new org.springframework.boot.test.context.runner.ApplicationContextRunner()
                .withBean(EditorialAiService.class)
                .withPropertyValues("localpress.ai.read-timeout-seconds=90")
                .run(context -> assertNull(context.getStartupFailure()));
        new org.springframework.boot.test.context.runner.ApplicationContextRunner()
                .withBean(EditorialAiService.class)
                .withPropertyValues("localpress.ai.read-timeout-seconds=0")
                .run(context -> assertNotNull(context.getStartupFailure()));
    }

}
