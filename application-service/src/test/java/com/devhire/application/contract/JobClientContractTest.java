package com.devhire.application.contract;

import com.devhire.application.client.dto.JobInternalResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JobClientContractTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void jobContractPayloadStillDeserializesForApplicationServiceConsumer() throws Exception {
        JobInternalResponse response = objectMapper.readValue(
                contract("job-service/internal-job-published.json"),
                JobInternalResponse.class
        );

        assertThat(response.id()).isEqualTo(UUID.fromString("30000000-0000-0000-0000-000000000001"));
        assertThat(response.companyId()).isEqualTo(UUID.fromString("20000000-0000-0000-0000-000000000001"));
        assertThat(response.employerId()).isEqualTo(UUID.fromString("00000000-0000-0000-0000-000000000002"));
        assertThat(response.title()).isEqualTo("Senior Java Backend Engineer");
        assertThat(response.status()).isEqualTo("PUBLISHED");
        assertThat(response.published()).isTrue();
    }

    private static String contract(String name) throws Exception {
        try (var input = JobClientContractTest.class.getClassLoader()
                .getResourceAsStream("contracts/" + name)) {
            if (input == null) {
                throw new IllegalStateException("Missing contract fixture: " + name);
            }
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
