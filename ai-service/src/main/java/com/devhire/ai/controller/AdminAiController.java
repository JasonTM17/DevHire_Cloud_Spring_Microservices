package com.devhire.ai.controller;

import com.devhire.ai.dto.AiProviderStatusResponse;
import com.devhire.ai.dto.ReindexResponse;
import com.devhire.ai.service.AiAssistantService;
import com.devhire.common.ApiResponse;
import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/admin/ai")
public class AdminAiController {
    private final AiAssistantService aiAssistantService;

    public AdminAiController(AiAssistantService aiAssistantService) {
        this.aiAssistantService = aiAssistantService;
    }

    @PostMapping("/knowledge/reindex")
    public ApiResponse<ReindexResponse> reindex(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                @RequestHeader(AppHeaders.USER_ROLE) UserRole role) {
        return ApiResponse.ok(aiAssistantService.reindex(new AuthenticatedUser(userId, email, role)));
    }

    @GetMapping("/provider/status")
    public ApiResponse<AiProviderStatusResponse> providerStatus(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                                @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                                @RequestHeader(AppHeaders.USER_ROLE) UserRole role) {
        return ApiResponse.ok(aiAssistantService.providerStatus(new AuthenticatedUser(userId, email, role)));
    }
}
