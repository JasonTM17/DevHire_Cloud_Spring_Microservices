package com.devhire.user.controller;

import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.UserRole;
import com.devhire.common.web.GlobalExceptionHandler;
import com.devhire.user.dto.request.UpdateProfileRequest;
import com.devhire.user.dto.response.ProfileResponse;
import com.devhire.user.service.UserProfileService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class UserProfileControllerTest {
    private final UserProfileService profileService = mock(UserProfileService.class);
    private final MockMvc mockMvc = standaloneSetup(new UserProfileController(profileService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    void updateMeUsesGatewayIdentityHeaders() throws Exception {
        UUID userId = UUID.randomUUID();
        when(profileService.upsertMe(any(), any())).thenReturn(new ProfileResponse(
                userId,
                "candidate@example.com",
                UserRole.CANDIDATE,
                "Candidate",
                "Java Engineer",
                List.of("Java", "Spring Boot"),
                "5 years",
                "B.S. Computer Science",
                BigDecimal.valueOf(3500),
                null,
                null,
                "https://example.com/avatar.png",
                Instant.parse("2026-05-02T00:00:00Z"),
                Instant.parse("2026-05-02T00:00:00Z")
        ));

        mockMvc.perform(put("/users/me")
                        .header(AppHeaders.USER_ID, userId)
                        .header(AppHeaders.USER_EMAIL, "candidate@example.com")
                        .header(AppHeaders.USER_ROLE, "CANDIDATE")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateProfileRequest(
                                "Candidate",
                                "Java Engineer",
                                List.of("Java", "Spring Boot"),
                                "5 years",
                                "B.S. Computer Science",
                                BigDecimal.valueOf(3500),
                                null,
                                null,
                                "https://example.com/avatar.png"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId", is(userId.toString())))
                .andExpect(jsonPath("$.data.skills[0]", is("Java")));
    }

    @Test
    void updateMeRejectsNegativeSalary() throws Exception {
        UUID userId = UUID.randomUUID();

        mockMvc.perform(put("/users/me")
                        .header(AppHeaders.USER_ID, userId)
                        .header(AppHeaders.USER_EMAIL, "candidate@example.com")
                        .header(AppHeaders.USER_ROLE, "CANDIDATE")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Candidate",
                                  "expectedSalary": -1
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", is("VALIDATION_ERROR")));
    }
}

