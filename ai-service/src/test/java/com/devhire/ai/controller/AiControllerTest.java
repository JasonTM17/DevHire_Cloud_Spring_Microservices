package com.devhire.ai.controller;

import com.devhire.ai.dto.AiChatRequest;
import com.devhire.ai.dto.AiChatResponse;
import com.devhire.ai.service.AiAssistantService;
import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.UserRole;
import com.devhire.common.web.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class AiControllerTest {
    private final AiAssistantService aiAssistantService = mock(AiAssistantService.class);
    private final MockMvc mockMvc = standaloneSetup(new AiController(aiAssistantService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    void chatReturnsAssistantAnswer() throws Exception {
        UUID conversationId = UUID.randomUUID();
        when(aiAssistantService.chat(any(), any())).thenReturn(new AiChatResponse(conversationId,
                "Portfolio answer", List.of(), List.of(), "claude-haiku-4-5-20251001", false, Instant.now()));

        mockMvc.perform(post("/ai/chat")
                        .header(AppHeaders.USER_ID, UUID.randomUUID())
                        .header(AppHeaders.USER_EMAIL, "candidate@devhire.local")
                        .header(AppHeaders.USER_ROLE, UserRole.CANDIDATE.name())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AiChatRequest(null, "Explain DevHire"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.conversationId", is(conversationId.toString())))
                .andExpect(jsonPath("$.data.answer", is("Portfolio answer")))
                .andExpect(jsonPath("$.data.fallback", is(false)));
    }

    @Test
    void chatRejectsBlankMessage() throws Exception {
        mockMvc.perform(post("/ai/chat")
                        .header(AppHeaders.USER_ID, UUID.randomUUID())
                        .header(AppHeaders.USER_EMAIL, "candidate@devhire.local")
                        .header(AppHeaders.USER_ROLE, UserRole.CANDIDATE.name())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "message": ""
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", is("VALIDATION_ERROR")));
    }
}
