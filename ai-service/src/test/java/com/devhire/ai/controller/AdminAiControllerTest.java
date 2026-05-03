package com.devhire.ai.controller;

import com.devhire.ai.dto.AiProviderStatusResponse;
import com.devhire.ai.service.AiAssistantService;
import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.UserRole;
import com.devhire.common.web.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class AdminAiControllerTest {
    private final AiAssistantService aiAssistantService = mock(AiAssistantService.class);
    private final MockMvc mockMvc = standaloneSetup(new AdminAiController(aiAssistantService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    @Test
    void providerStatusReturnsSafeDiagnostics() throws Exception {
        when(aiAssistantService.providerStatus(any())).thenReturn(new AiProviderStatusResponse(
                "anthropic",
                "claude-haiku-4-5-20251001",
                "api.anthropic.com",
                "2023-06-01",
                900,
                false,
                true,
                "DEMO_FALLBACK",
                "CLOSED",
                0,
                null,
                null,
                null,
                Instant.now()
        ));

        mockMvc.perform(get("/admin/ai/provider/status")
                        .header(AppHeaders.USER_ID, UUID.randomUUID())
                        .header(AppHeaders.USER_EMAIL, "admin@devhire.local")
                        .header(AppHeaders.USER_ROLE, UserRole.ADMIN.name()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.provider", is("anthropic")))
                .andExpect(jsonPath("$.data.model", is("claude-haiku-4-5-20251001")))
                .andExpect(jsonPath("$.data.apiKeyConfigured", is(false)))
                .andExpect(jsonPath("$.data.mode", is("DEMO_FALLBACK")))
                .andExpect(jsonPath("$.data.circuitBreakerState", is("CLOSED")))
                .andExpect(jsonPath("$.data.consecutiveFailures", is(0)));
    }
}
