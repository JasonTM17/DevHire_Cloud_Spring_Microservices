package com.devhire.job.contract;

import com.devhire.job.controller.InternalJobController;
import com.devhire.job.dto.response.JobInternalResponse;
import com.devhire.job.entity.JobStatus;
import com.devhire.job.service.JobService;
import org.junit.jupiter.api.Test;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class JobInternalContractTest {
    private static final UUID JOB_ID = UUID.fromString("30000000-0000-0000-0000-000000000001");
    private static final UUID COMPANY_ID = UUID.fromString("20000000-0000-0000-0000-000000000001");
    private static final UUID EMPLOYER_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");

    private final JobService jobService = mock(JobService.class);
    private final MockMvc mockMvc = standaloneSetup(new InternalJobController(jobService)).build();

    @Test
    void internalJobEndpointMatchesPublishedContract() throws Exception {
        when(jobService.getInternal(JOB_ID)).thenReturn(new JobInternalResponse(
                JOB_ID,
                COMPANY_ID,
                EMPLOYER_ID,
                "Senior Java Backend Engineer",
                JobStatus.PUBLISHED,
                true
        ));

        mockMvc.perform(get("/internal/jobs/{id}", JOB_ID))
                .andExpect(status().isOk())
                .andExpect(content().json(contract("job-service/internal-job-published.json"), JsonCompareMode.STRICT));
    }

    private static String contract(String name) throws Exception {
        try (var input = JobInternalContractTest.class.getClassLoader()
                .getResourceAsStream("contracts/" + name)) {
            if (input == null) {
                throw new IllegalStateException("Missing contract fixture: " + name);
            }
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
