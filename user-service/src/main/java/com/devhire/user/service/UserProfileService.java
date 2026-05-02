package com.devhire.user.service;

import com.devhire.common.error.ErrorCode;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import com.devhire.user.dto.request.UpdateProfileRequest;
import com.devhire.user.dto.response.ProfileResponse;
import com.devhire.user.entity.UserProfile;
import com.devhire.user.mapper.UserProfileMapper;
import com.devhire.user.repository.UserProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class UserProfileService {
    private final UserProfileRepository repository;
    private final UserProfileMapper mapper;

    public UserProfileService(UserProfileRepository repository, UserProfileMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public ProfileResponse getMe(AuthenticatedUser user) {
        return getByUserId(user.id());
    }

    @Transactional(readOnly = true)
    public ProfileResponse getByUserId(UUID userId) {
        return repository.findById(userId)
                .map(mapper::toResponse)
                .orElseThrow(() -> new DevHireException(ErrorCode.NOT_FOUND, "Profile not found"));
    }

    @Transactional
    public ProfileResponse upsertMe(AuthenticatedUser user, UpdateProfileRequest request) {
        if (user.role() == UserRole.ADMIN) {
            throw new DevHireException(ErrorCode.FORBIDDEN, "Admin accounts do not have editable recruitment profiles");
        }
        UserProfile profile = repository.findById(user.id())
                .orElseGet(() -> new UserProfile(user.id(), user.email(), user.role()));
        profile.updateIdentity(user.email(), user.role());
        if (user.role() == UserRole.CANDIDATE) {
            profile.updateCandidate(
                    request.name(),
                    request.title(),
                    mapper.toSkillsCsv(request.skills()),
                    request.experience(),
                    request.education(),
                    request.expectedSalary(),
                    request.avatarUrl()
            );
        } else if (user.role() == UserRole.EMPLOYER) {
            profile.updateEmployer(
                    request.name(),
                    request.title(),
                    request.companyPosition(),
                    request.contactInfo(),
                    request.avatarUrl()
            );
        }
        return mapper.toResponse(repository.save(profile));
    }
}

