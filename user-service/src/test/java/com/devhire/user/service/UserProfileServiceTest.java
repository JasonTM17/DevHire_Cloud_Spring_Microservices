package com.devhire.user.service;

import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import com.devhire.user.dto.request.UpdateProfileRequest;
import com.devhire.user.entity.UserProfile;
import com.devhire.user.mapper.UserProfileMapper;
import com.devhire.user.repository.UserProfileRepository;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class UserProfileServiceTest {
    private final UserProfileRepository repository = mock(UserProfileRepository.class);
    private final UserProfileService service = new UserProfileService(repository, new UserProfileMapper());

    @Test
    void upsertCandidateProfileNormalizesSkills() {
        UUID userId = UUID.randomUUID();
        when(repository.findById(userId)).thenReturn(Optional.empty());
        when(repository.save(any(UserProfile.class))).thenAnswer(invocation -> {
            UserProfile profile = invocation.getArgument(0);
            ReflectionTestUtils.setField(profile, "createdAt", Instant.parse("2026-05-02T00:00:00Z"));
            ReflectionTestUtils.setField(profile, "updatedAt", Instant.parse("2026-05-02T00:00:00Z"));
            return profile;
        });

        var response = service.upsertMe(
                new AuthenticatedUser(userId, "candidate@example.com", UserRole.CANDIDATE),
                new UpdateProfileRequest("Candidate", "Java Engineer", List.of("Java", " Java ", "Kafka"),
                        "5 years", "B.S.", BigDecimal.valueOf(3500), null, null, null)
        );

        assertThat(response.skills()).containsExactly("Java", "Kafka");
        assertThat(response.expectedSalary()).isEqualByComparingTo("3500");
    }

    @Test
    void adminProfileUpdateIsForbidden() {
        assertThatThrownBy(() -> service.upsertMe(
                new AuthenticatedUser(UUID.randomUUID(), "admin@example.com", UserRole.ADMIN),
                new UpdateProfileRequest(null, null, null, null, null, null, null, null, null)
        )).isInstanceOf(DevHireException.class)
                .hasMessageContaining("Admin accounts do not have editable recruitment profiles");
    }
}

