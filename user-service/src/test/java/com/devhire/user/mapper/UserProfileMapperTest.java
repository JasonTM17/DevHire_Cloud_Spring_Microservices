package com.devhire.user.mapper;

import com.devhire.common.security.UserRole;
import com.devhire.user.entity.UserProfile;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class UserProfileMapperTest {
    private final UserProfileMapper mapper = new UserProfileMapper();

    @Test
    void convertsSkillsToStableDeduplicatedCsv() {
        assertThat(mapper.toSkillsCsv(List.of(" Java ", "Kafka", "Java", " ", "AWS")))
                .isEqualTo("Java,Kafka,AWS");
    }

    @Test
    void returnsNullCsvForEmptySkillInput() {
        assertThat(mapper.toSkillsCsv(null)).isNull();
        assertThat(mapper.toSkillsCsv(List.of())).isNull();
        assertThat(mapper.toSkillsCsv(List.of(" ", ""))).isNull();
    }

    @Test
    void mapsCandidateProfileWithoutLeakingEntity() {
        UUID userId = UUID.randomUUID();
        UserProfile profile = new UserProfile(userId, "candidate@example.com", UserRole.CANDIDATE);
        profile.updateCandidate(
                "Linh Tran",
                "Senior Java Backend Engineer",
                "Java, Kafka, AWS",
                "7 years building recruitment and SaaS platforms",
                "B.Sc. Computer Science",
                BigDecimal.valueOf(4500),
                "https://cdn.devhire.example.invalid/avatar/linh.png"
        );

        var response = mapper.toResponse(profile);

        assertThat(response.userId()).isEqualTo(userId);
        assertThat(response.email()).isEqualTo("candidate@example.com");
        assertThat(response.role()).isEqualTo(UserRole.CANDIDATE);
        assertThat(response.skills()).containsExactly("Java", "Kafka", "AWS");
        assertThat(response.expectedSalary()).isEqualByComparingTo("4500");
        assertThat(response.avatarUrl()).contains("avatar/linh.png");
    }
}
