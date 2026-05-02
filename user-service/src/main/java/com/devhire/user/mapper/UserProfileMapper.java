package com.devhire.user.mapper;

import com.devhire.user.dto.response.ProfileResponse;
import com.devhire.user.entity.UserProfile;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class UserProfileMapper {
    public ProfileResponse toResponse(UserProfile profile) {
        return new ProfileResponse(
                profile.getUserId(),
                profile.getEmail(),
                profile.getRole(),
                profile.getName(),
                profile.getTitle(),
                toSkills(profile.getSkillsCsv()),
                profile.getExperience(),
                profile.getEducation(),
                profile.getExpectedSalary(),
                profile.getCompanyPosition(),
                profile.getContactInfo(),
                profile.getAvatarUrl(),
                profile.getCreatedAt(),
                profile.getUpdatedAt()
        );
    }

    public String toSkillsCsv(List<String> skills) {
        if (skills == null || skills.isEmpty()) {
            return null;
        }
        return String.join(",", skills.stream()
                .map(String::trim)
                .filter(skill -> !skill.isBlank())
                .distinct()
                .toList());
    }

    private static List<String> toSkills(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(skill -> !skill.isBlank())
                .toList();
    }
}

