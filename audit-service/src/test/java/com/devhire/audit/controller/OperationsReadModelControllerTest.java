package com.devhire.audit.controller;

import com.devhire.audit.dto.response.ActionCountResponse;
import com.devhire.audit.dto.response.OperationsSummaryResponse;
import com.devhire.audit.service.OperationsReadModelService;
import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.UserRole;
import com.devhire.common.web.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class OperationsReadModelControllerTest {
    private final OperationsReadModelService readModelService = mock(OperationsReadModelService.class);
    private final MockMvc mockMvc = standaloneSetup(new OperationsReadModelController(readModelService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    @Test
    void adminOperationsSummaryReturnsControlPlaneSignals() throws Exception {
        when(readModelService.summary(any())).thenReturn(new OperationsSummaryResponse(
                820, 72, Instant.parse("2026-05-06T08:30:00Z"),
                List.of(new ActionCountResponse("approve job", 144)),
                List.of(new ActionCountResponse("EMPLOYER", 210))));

        mockMvc.perform(get("/admin/operations/summary")
                        .header(AppHeaders.USER_ID, UUID.randomUUID())
                        .header(AppHeaders.USER_EMAIL, "admin@devhire.local")
                        .header(AppHeaders.USER_ROLE, UserRole.ADMIN.name()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.auditEvents", is(820)))
                .andExpect(jsonPath("$.data.topActions[0].label", is("approve job")))
                .andExpect(jsonPath("$.data.actorRoles[0].label", is("EMPLOYER")));
    }
}
