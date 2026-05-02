package com.devhire.user.controller;

import com.devhire.common.ApiResponse;
import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import com.devhire.user.dto.request.UpdateProfileRequest;
import com.devhire.user.dto.response.ProfileResponse;
import com.devhire.user.service.UserProfileService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/users")
public class UserProfileController {
    private final UserProfileService profileService;

    public UserProfileController(UserProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/me")
    public ApiResponse<ProfileResponse> me(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                           @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                           @RequestHeader(AppHeaders.USER_ROLE) UserRole role) {
        return ApiResponse.ok(profileService.getMe(new AuthenticatedUser(userId, email, role)));
    }

    @PutMapping("/me")
    public ApiResponse<ProfileResponse> updateMe(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                 @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                 @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                 @Valid @RequestBody UpdateProfileRequest request) {
        return ApiResponse.ok(profileService.upsertMe(new AuthenticatedUser(userId, email, role), request));
    }

    @GetMapping("/{id}")
    public ApiResponse<ProfileResponse> getById(@PathVariable UUID id) {
        return ApiResponse.ok(profileService.getByUserId(id));
    }
}

