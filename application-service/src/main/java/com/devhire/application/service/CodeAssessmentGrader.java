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
        return grade(code, requiredSignals, "");
    }

    public GradeResult grade(String code, List<String> requiredSignals, String starterCode) {
        String source = code == null ? "" : code;
        String normalized = source.toLowerCase(Locale.ROOT);
        String implementationOnly = stripNonImplementationText(source).toLowerCase(Locale.ROOT);
        List<String> flags = riskFlags(source, normalized, starterCode, requiredSignals, implementationOnly);
        int implementationSignals = (int) requiredSignals.stream()
                .filter(signal -> !signal.isBlank())
                .filter(signal -> implementationOnly.contains(signal.toLowerCase(Locale.ROOT)))
                .count();
        int nonExecutableSignals = (int) requiredSignals.stream()
                .filter(signal -> !signal.isBlank())
                .filter(signal -> normalized.contains(signal.toLowerCase(Locale.ROOT)))
                .count() - implementationSignals;
        int signalMatches = implementationSignals;

        int completeness = Math.min(40, 12 + signalMatches * 6 + Math.min(16, source.length() / 180));
        int maintainability = maintainabilityScore(source, normalized);
        int performance = performanceScore(normalized);
        int security = Math.max(0, 15 - flags.size() * 5);
        int inputRobustness = inputRobustnessScore(source, normalized);

        List<RubricScoreResponse> rubric = List.of(
                new RubricScoreResponse("Correctness and completeness", completeness, 40,
                        implementationSignals + " implementation signals found; " + Math.max(0, nonExecutableSignals)
                                + " non-executable signals ignored"),
                new RubricScoreResponse("Maintainability and readability", maintainability, 20,
                        "Naming, structure, and method boundaries reviewed"),
                new RubricScoreResponse("Complexity and performance", performance, 15,
                        "Data structure and query/runtime considerations reviewed"),
                new RubricScoreResponse("Security posture", security, 15,
                        flags.isEmpty() ? "No high-risk static smells detected" : String.join(", ", flags)),
                new RubricScoreResponse("Input parsing and edge cases", inputRobustness, 10,
                        inputRobustness > 6
                                ? "Submission handles the solve input contract and basic edge cases"
                                : "Reviewer should verify null, blank, malformed, and hidden stdin cases")
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

    private static int inputRobustnessScore(String source, String normalized) {
        int score = 0;
        if (normalized.contains("class candidatesolution") && normalized.contains("solve")) {
            score += 4;
        }
        if (normalized.contains("input != null") || normalized.contains("input == null")) {
            score += 2;
        }
        if (normalized.contains("isblank()") || normalized.contains("isempty()") || normalized.contains("trim()")) {
            score += 2;
        }
        if (source.lines().filter(line -> line.contains("return")).count() > 1
                || normalized.contains("else")
                || normalized.contains("?")) {
            score += 2;
        }
        return Math.min(10, score);
    }

    private static List<String> riskFlags(String source,
                                          String normalized,
                                          String starterCode,
                                          List<String> requiredSignals,
                                          String implementationOnly) {
        List<String> flags = new ArrayList<>();
        if (!starterCode.isBlank() && normalizeForComparison(source).equals(normalizeForComparison(starterCode))) {
            flags.add("starter-code-only");
        }
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
        long nonExecutableSignals = requiredSignals.stream()
                .filter(signal -> !signal.isBlank())
                .filter(signal -> normalized.contains(signal.toLowerCase(Locale.ROOT)))
                .filter(signal -> !implementationOnly.contains(signal.toLowerCase(Locale.ROOT)))
                .count();
        if (nonExecutableSignals >= Math.min(3, Math.max(2, requiredSignals.size()))) {
            flags.add("non-executable-signal-stuffing");
        }
        boolean hasExecutableSolveContract = normalized.contains("class candidatesolution") && normalized.contains("solve");
        if (!hasExecutableSolveContract) {
            flags.add("low-signal-code");
        }
        return flags;
    }

    private static String stripNonImplementationText(String source) {
        return (source == null ? "" : source)
                .replaceAll("(?s)/\\*.*?\\*/", " ")
                .replaceAll("(?m)//.*$", " ")
                .replaceAll("(?s)\"\"\".*?\"\"\"", " ")
                .replaceAll("\"(?:\\\\.|[^\"\\\\])*\"", " ")
                .replaceAll("'(?:\\\\.|[^'\\\\])*'", " ")
                .replaceAll("`(?:\\\\.|[^`\\\\])*`", " ");
    }

    private static String normalizeForComparison(String value) {
        return stripNonImplementationText(value == null ? "" : value)
                .replaceAll("\\s+", "")
                .toLowerCase(Locale.ROOT);
    }

    private static String feedback(int total, List<String> flags) {
        if (total >= 85 && flags.size() <= 1) {
            return "Strong production-ready submission with clear implementation signals and low review risk.";
        }
        if (total >= 70) {
            return "Promising submission. Employer review should focus on hidden edge cases, parsing robustness, and deployment safety.";
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
