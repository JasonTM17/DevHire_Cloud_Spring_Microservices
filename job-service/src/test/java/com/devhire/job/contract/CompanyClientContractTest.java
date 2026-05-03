package com.devhire.job.contract;

import com.devhire.job.client.dto.CompanyInternalResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class CompanyClientContractTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void companyContractPayloadStillDeserializesForJobServiceConsumer() throws Exception {
        CompanyInternalResponse response = objectMapper.readValue(
                contract("company-service/internal-company-approved.json"),
                CompanyInternalResponse.class
        );

        assertThat(response.id()).isEqualTo(UUID.fromString("20000000-0000-0000-0000-000000000001"));
        assertThat(response.employerId()).isEqualTo(UUID.fromString("00000000-0000-0000-0000-000000000002"));
        assertThat(response.status()).isEqualTo("APPROVED");
        assertThat(response.approved()).isTrue();
    }

    private static String contract(String name) throws Exception {
        try (var input = CompanyClientContractTest.class.getClassLoader()
                .getResourceAsStream("contracts/" + name)) {
            if (input == null) {
                throw new IllegalStateException("Missing contract fixture: " + name);
            }
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
