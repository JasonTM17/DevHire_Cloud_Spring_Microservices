package com.devhire.auth.controller;

import com.devhire.auth.dto.request.RegisterRequest;
import com.devhire.auth.dto.response.AuthResponse;
import com.devhire.auth.service.AuthService;
import com.devhire.common.security.UserRole;
import com.devhire.common.web.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class AuthControllerTest {
    private final AuthService authService = mock(AuthService.class);
    private final MockMvc mockMvc = standaloneSetup(new AuthController(authService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    void registerReturnsCreatedTokenPayload() throws Exception {
        UUID userId = UUID.randomUUID();
        when(authService.register(any(RegisterRequest.class))).thenReturn(new AuthResponse(
                userId,
                "candidate@example.com",
                UserRole.CANDIDATE,
                "access-token",
                "refresh-token",
                Instant.parse("2026-05-02T10:15:30Z"),
                Instant.parse("2026-05-09T10:15:30Z")
        ));

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterRequest(
                                "candidate@example.com",
                                "Candidate@123456",
                                UserRole.CANDIDATE
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.userId", is(userId.toString())))
                .andExpect(jsonPath("$.data.role", is("CANDIDATE")))
                .andExpect(jsonPath("$.data.accessToken", is("access-token")));
    }

    @Test
    void registerRejectsInvalidEmail() throws Exception {
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "not-an-email",
                                  "password": "Candidate@123456",
                                  "role": "CANDIDATE"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", is("VALIDATION_ERROR")));
    }
}

