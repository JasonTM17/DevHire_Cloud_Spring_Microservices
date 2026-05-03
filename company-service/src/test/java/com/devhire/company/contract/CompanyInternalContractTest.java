package com.devhire.company.contract;

import com.devhire.company.controller.CompanyController;
import com.devhire.company.dto.response.CompanyInternalResponse;
import com.devhire.company.entity.CompanyStatus;
import com.devhire.company.service.CompanyService;
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

class CompanyInternalContractTest {
    private static final UUID COMPANY_ID = UUID.fromString("20000000-0000-0000-0000-000000000001");
    private static final UUID EMPLOYER_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");

    private final CompanyService companyService = mock(CompanyService.class);
    private final MockMvc mockMvc = standaloneSetup(new CompanyController(companyService)).build();

    @Test
    void internalCompanyEndpointMatchesPublishedContract() throws Exception {
        when(companyService.getInternal(COMPANY_ID))
                .thenReturn(new CompanyInternalResponse(COMPANY_ID, EMPLOYER_ID, CompanyStatus.APPROVED, true));

        mockMvc.perform(get("/internal/companies/{id}", COMPANY_ID))
                .andExpect(status().isOk())
                .andExpect(content().json(contract("company-service/internal-company-approved.json"), JsonCompareMode.STRICT));
    }

    private static String contract(String name) throws Exception {
        try (var input = CompanyInternalContractTest.class.getClassLoader()
                .getResourceAsStream("contracts/" + name)) {
            if (input == null) {
                throw new IllegalStateException("Missing contract fixture: " + name);
            }
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
