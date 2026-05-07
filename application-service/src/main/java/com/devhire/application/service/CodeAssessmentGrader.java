package com.devhire.application.service;

import com.devhire.application.dto.response.RubricScoreResponse;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Component
public class CodeAssessmentGrader {
    private static final Pattern SECRET_PATTERN = Pattern.compile(
            "(?i)(api[_-]?key|password|passwd|secret|token)\\s*[=:]\\s*[\"'][^\"']{6,}[\"']");

    public GradeResult grade(String code, List<String> requiredSignals) {
        String source = code == null ? "" : code;
        String normalized = source.toLowerCase(Locale.ROOT);
        List<String> flags = riskFlags(source, normalized);
        int signalMatches = (int) requiredSignals.stream()
                .filter(signal -> !signal.isBlank())
                .filter(signal -> normalized.contains(signal.toLowerCase(Locale.ROOT)))
                .count();

        int completeness = Math.min(40, 12 + signalMatches * 6 + Math.min(16, source.length() / 180));
        int maintainability = maintainabilityScore(source, normalized);
        int performance = performanceScore(normalized);
        int security = Math.max(0, 15 - flags.size() * 5);
        int testEvidence = testEvidenceScore(normalized);

        List<RubricScoreResponse> rubric = List.of(
                new RubricScoreResponse("Correctness and completeness", completeness, 40,
                        signalMatches + " required implementation signals found"),
                new RubricScoreResponse("Maintainability and readability", maintainability, 20,
                        "Naming, structure, and method boundaries reviewed"),
                new RubricScoreResponse("Complexity and performance", performance, 15,
                        "Data structure and query/runtime considerations reviewed"),
                new RubricScoreResponse("Security posture", security, 15,
                        flags.isEmpty() ? "No high-risk static smells detected" : String.join(", ", flags)),
                new RubricScoreResponse("Test and evidence quality", testEvidence, 10,
                        testEvidence > 0 ? "Candidate included test or assertion evidence" : "No test evidence found")
        );
        int total = rubric.stream().mapToInt(RubricScoreResponse::score).sum();
        return new GradeResult(total, rubric, flags, feedback(total, flags));
    }

    private static int maintainabilityScore(String source, String normalized) {
        int score = 8;
        if (normalized.contains("class ") || normalized.contains("record ") || normalized.contains("function ")) {
            score += 4;
        }
        if (normalized.contains("private ") || normalized.contains("public ") || normalized.contains("const ")) {
            score += 3;
        }
        if (source.lines().noneMatch(line -> line.length() > 140)) {
            score += 3;
        }
        if (normalized.contains("//") || normalized.contains("/*")) {
            score += 2;
        }
        return Math.min(20, score);
    }

    private static int performanceScore(String normalized) {
        int score = 6;
        if (normalized.contains("map") || normalized.contains("set") || normalized.contains("index")) {
            score += 4;
        }
        if (normalized.contains("batch") || normalized.contains("page") || normalized.contains("limit")) {
            score += 3;
        }
        if (!normalized.contains("select *") && !normalized.contains("n+1")) {
            score += 2;
        }
        return Math.min(15, score);
    }

    private static int testEvidenceScore(String normalized) {
        int score = 0;
        if (normalized.contains("@test") || normalized.contains("assert") || normalized.contains("expect(")) {
            score += 6;
        }
        if (normalized.contains("given") && normalized.contains("when") && normalized.contains("then")) {
            score += 4;
        }
        return Math.min(10, score);
    }

    private static List<String> riskFlags(String source, String normalized) {
        List<String> flags = new ArrayList<>();
        if (SECRET_PATTERN.matcher(source).find()) {
            flags.add("hardcoded-secret");
        }
        if (normalized.contains("runtime.getruntime") || normalized.contains("processbuilder")
                || normalized.contains("system.exit") || normalized.contains(".exec(")) {
            flags.add("process-execution");
        }
        if (normalized.contains("socket(") || normalized.contains("files.write") || normalized.contains("new file(")) {
            flags.add("io-boundary");
        }
        if (!normalized.contains("@test") && !normalized.contains("assert") && !normalized.contains("expect(")) {
            flags.add("missing-test-evidence");
        }
        return flags;
    }

    private static String feedback(int total, List<String> flags) {
        if (total >= 85 && flags.size() <= 1) {
            return "Strong production-ready submission with clear implementation signals and low review risk.";
        }
        if (total >= 70) {
            return "Promising submission. Employer review should focus on edge cases, test depth, and deployment safety.";
        }
        return "Submission needs additional implementation detail before it should advance in the hiring pipeline.";
    }

    public record GradeResult(
            int totalScore,
            List<RubricScoreResponse> rubric,
            List<String> riskFlags,
            String feedback
    ) {
    }
}
