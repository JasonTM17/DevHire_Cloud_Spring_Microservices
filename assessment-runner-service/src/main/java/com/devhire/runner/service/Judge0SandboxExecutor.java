package com.devhire.runner.service;

import com.devhire.runner.config.AssessmentRunnerProperties;
import com.devhire.runner.dto.RunnerRunRequest;
import com.devhire.runner.dto.RunnerRunResponse;
import com.devhire.runner.dto.RunnerTestCaseRequest;
import com.devhire.runner.dto.RunnerTestCaseResultResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

final class Judge0SandboxExecutor implements SandboxExecutor {
    private static final int STATUS_IN_QUEUE = 1;
    private static final int STATUS_PROCESSING = 2;
    private static final int STATUS_ACCEPTED = 3;
    private static final int STATUS_WRONG_ANSWER = 4;
    private static final int STATUS_TIME_LIMIT = 5;
    private static final int STATUS_COMPILATION_ERROR = 6;

    private final AssessmentRunnerProperties properties;
    private final RestClient restClient;

    Judge0SandboxExecutor(AssessmentRunnerProperties properties) {
        this(properties, restClient(properties));
    }

    Judge0SandboxExecutor(AssessmentRunnerProperties properties, RestClient restClient) {
        this.properties = properties;
        this.restClient = restClient;
    }

    @Override
    public RunnerRunResponse run(RunnerRunRequest request) {
        RunnerLimits defaultLimits = limits(request, null);
        if (SandboxPolicy.violatesBoundary(request.code())) {
            return RunnerResponses.blocked(request, defaultLimits, properties.getRunnerVersion());
        }
        if (properties.getJudge0BaseUrl().isBlank()) {
            return RunnerResponses.unavailable(request, defaultLimits,
                    "Judge0 runtime is not configured; server-side scoring failed closed.",
                    properties.getRunnerVersion());
        }
        if (normalizeLanguage(request.language()).equals("sql")
                && request.testCases().stream().anyMatch(testCase -> !hasExecutableSql(testCase))) {
            return RunnerResponses.unavailable(request, defaultLimits,
                    "SQL runtime requires executable setup SQL and expected normalized rows.",
                    properties.getRunnerVersion());
        }
        try {
            List<RunnerTestCaseResultResponse> results = request.testCases().stream()
                    .map(testCase -> executeCase(request, testCase))
                    .toList();
            int passed = (int) results.stream().filter(RunnerTestCaseResultResponse::passed).count();
            long totalTime = results.stream().mapToLong(RunnerTestCaseResultResponse::executionTimeMs).sum();
            long maxMemory = results.stream().mapToLong(RunnerTestCaseResultResponse::memoryKb).max().orElse(0);
            String verdict = overallVerdict(results);
            return new RunnerRunResponse(
                    "COMPLETED",
                    "JUDGE0_ISOLATED_SANDBOX",
                    verdict,
                    passed,
                    results.size(),
                    totalTime,
                    maxMemory,
                    verdict.equals("ACCEPTED") ? null : "One or more runtime judge cases failed.",
                    firstNonBlank(results, RunnerTestCaseResultResponse::compileOutput),
                    firstNonBlank(results, RunnerTestCaseResultResponse::stdout),
                    firstNonBlank(results, RunnerTestCaseResultResponse::stderr),
                    defaultLimits.timeLimitMs(),
                    defaultLimits.memoryLimitKb(),
                    properties.getRunnerVersion(),
                    results,
                    Instant.now());
        } catch (RestClientException | IllegalArgumentException ex) {
            return RunnerResponses.unavailable(request, defaultLimits,
                    "Judge0 runtime was unavailable: " + firstNonBlank(ex.getMessage(), ex.getClass().getSimpleName()),
                    properties.getRunnerVersion());
        }
    }

    private RunnerTestCaseResultResponse executeCase(RunnerRunRequest request, RunnerTestCaseRequest testCase) {
        RunnerLimits limits = limits(request, testCase);
        Judge0SubmissionResponse response = restClient.post()
                .uri("/submissions?base64_encoded=false&wait=false")
                .contentType(MediaType.APPLICATION_JSON)
                .body(judge0SubmissionBody(request, testCase, limits))
                .retrieve()
                .body(Judge0SubmissionResponse.class);
        response = pollUntilTerminal(response);
        if (response == null) {
            throw new IllegalArgumentException("Judge0 returned an empty submission response");
        }
        String verdict = normalizeVerdict(response.status());
        String stdout = SandboxPolicy.truncate(response.stdout(), maxOutputBytes(request));
        String stderr = SandboxPolicy.truncate(response.stderr(), maxOutputBytes(request));
        String compileOutput = SandboxPolicy.truncate(response.compileOutput(), maxOutputBytes(request));
        String expectedOutput = expectedOutputFor(testCase);
        boolean hasExpected = expectedOutput != null && !expectedOutput.isBlank();
        boolean passed = "ACCEPTED".equals(verdict)
                && (!hasExpected || normalizedOutput(stdout).equals(normalizedOutput(expectedOutput)));
        String caseVerdict = passed ? "ACCEPTED" : "ACCEPTED".equals(verdict) ? "WRONG_ANSWER" : verdict;
        String output = firstNonBlank(stdout, compileOutput, stderr, "");
        return new RunnerTestCaseResultResponse(
                testCase.id(),
                testCase.name(),
                RunnerResponses.normalizeVisibility(testCase.visibility()),
                passed,
                caseVerdict,
                output,
                stdout,
                stderr,
                compileOutput,
                passed ? null : firstNonBlank(
                        response.message(),
                        compileOutput,
                        stderr,
                        hasExpected ? expectedMismatch(expectedOutput, stdout) : null,
                        response.statusDescription()),
                millis(response.time()),
                response.memory() == null ? 0 : response.memory(),
                limits.timeLimitMs(),
                limits.memoryLimitKb());
    }

    private String sourceFor(String language, String code, RunnerTestCaseRequest testCase) {
        String normalized = normalizeLanguage(language);
        if (normalized.equals("java")) {
            return code + "\n\n" + """
                    class Main {
                      public static void main(String[] args) throws Exception {
                        String input = new String(System.in.readAllBytes());
                        Object solution = new CandidateSolution();
                        java.lang.reflect.Method method = solution.getClass().getDeclaredMethod("solve", String.class);
                        method.setAccessible(true);
                        Object result = method.invoke(solution, input);
                        System.out.print(result == null ? "" : result.toString());
                      }
                    }
                    """;
        }
        if (normalized.equals("typescript")) {
            return code + "\n\n" + """
                    const chunks: Buffer[] = [];
                    process.stdin.on("data", (chunk) => chunks.push(chunk));
                    process.stdin.on("end", async () => {
                      const input = Buffer.concat(chunks).toString("utf8");
                      const fn = (globalThis as any).solve ?? solve;
                      const result = await fn(input);
                      process.stdout.write(result == null ? "" : String(result));
                    });
                    """;
        }
        if (normalized.equals("sql")) {
            return firstNonBlank(testCase.setupSql(), "") + "\n" + code;
        }
        return code;
    }

    private Map<String, Object> judge0SubmissionBody(RunnerRunRequest request,
                                                     RunnerTestCaseRequest testCase,
                                                     RunnerLimits limits) {
        return Map.of(
                "language_id", languageId(request.language()),
                "source_code", sourceFor(request.language(), request.code(), testCase),
                "stdin", firstNonBlank(testCase.stdin(), testCase.input(), ""),
                "cpu_time_limit", Math.max(0.1, limits.timeLimitMs() / 1000.0),
                "wall_time_limit", Math.max(0.2, (limits.timeLimitMs() + 1_000) / 1000.0),
                "memory_limit", limits.memoryLimitKb(),
                "enable_network", !properties.isNetworkDisabled(),
                "max_file_size", properties.getMaxOutputBytes());
    }

    private int languageId(String language) {
        return switch (normalizeLanguage(language)) {
            case "java" -> properties.getJavaLanguageId();
            case "typescript" -> properties.getTypescriptLanguageId();
            case "sql" -> properties.getSqlLanguageId();
            default -> throw new IllegalArgumentException("Unsupported runner language: " + language);
        };
    }

    private RunnerLimits limits(RunnerRunRequest request, RunnerTestCaseRequest testCase) {
        int timeLimit = firstPositive(testCase == null ? null : testCase.timeLimitMs(),
                request.timeLimitMs(), properties.getDefaultTimeLimitMs());
        int memoryLimit = firstPositive(testCase == null ? null : testCase.memoryLimitKb(),
                request.memoryLimitKb(), properties.getDefaultMemoryKb());
        return new RunnerLimits(timeLimit, memoryLimit);
    }

    private int maxOutputBytes(RunnerRunRequest request) {
        return firstPositive(request.maxOutputBytes(), null, properties.getMaxOutputBytes());
    }

    private static String normalizeVerdict(Judge0Status status) {
        String description = status == null ? "" : firstNonBlank(status.description(), "");
        Integer id = status == null ? null : status.id();
        String normalizedDescription = description.toLowerCase(Locale.ROOT);
        if ((id != null && id == STATUS_ACCEPTED) || description.equalsIgnoreCase("Accepted")) {
            return "ACCEPTED";
        }
        if ((id != null && id == STATUS_WRONG_ANSWER) || description.equalsIgnoreCase("Wrong Answer")) {
            return "WRONG_ANSWER";
        }
        if ((id != null && id == STATUS_TIME_LIMIT) || normalizedDescription.contains("time limit")) {
            return "TIME_LIMIT_EXCEEDED";
        }
        if ((id != null && id == STATUS_COMPILATION_ERROR) || normalizedDescription.contains("compilation")) {
            return "COMPILE_ERROR";
        }
        if (normalizedDescription.contains("memory")) {
            return "MEMORY_LIMIT_EXCEEDED";
        }
        return "RUNTIME_ERROR";
    }

    private Judge0SubmissionResponse pollUntilTerminal(Judge0SubmissionResponse initial) {
        if (initial == null || isTerminal(initial.status())) {
            return initial;
        }
        String token = initial.token();
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Judge0 did not return a submission token");
        }
        Judge0SubmissionResponse current = initial;
        for (int attempt = 0; attempt < properties.getPollMaxAttempts(); attempt++) {
            sleep(properties.getPollIntervalMs());
            current = restClient.get()
                    .uri("/submissions/{token}?base64_encoded=false", token)
                    .retrieve()
                    .body(Judge0SubmissionResponse.class);
            if (current == null) {
                throw new IllegalArgumentException("Judge0 returned an empty poll response");
            }
            if (isTerminal(current.status())) {
                return current;
            }
        }
        throw new IllegalArgumentException("Judge0 submission did not finish before poll timeout");
    }

    private static boolean isTerminal(Judge0Status status) {
        Integer id = status == null ? null : status.id();
        return id != null && id != STATUS_IN_QUEUE && id != STATUS_PROCESSING;
    }

    private static void sleep(int millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalArgumentException("Interrupted while polling Judge0", ex);
        }
    }

    private static boolean hasExecutableSql(RunnerTestCaseRequest testCase) {
        return firstNonBlank(testCase.setupSql(), null) != null
                && firstNonBlank(testCase.expectedRowsJson(), null) != null;
    }

    private static String expectedOutputFor(RunnerTestCaseRequest testCase) {
        return firstNonBlank(testCase.expectedRowsJson(), testCase.expectedOutput(), "");
    }

    private static String expectedMismatch(String expected, String actual) {
        return "Expected %s but got %s.".formatted(
                normalizedOutput(expected),
                normalizedOutput(actual).isBlank() ? "<empty>" : normalizedOutput(actual));
    }

    private static String normalizedOutput(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\r\n", "\n").replace('\r', '\n').stripTrailing();
    }

    private static String overallVerdict(List<RunnerTestCaseResultResponse> results) {
        if (results.stream().allMatch(RunnerTestCaseResultResponse::passed)) {
            return "ACCEPTED";
        }
        return results.stream()
                .map(RunnerTestCaseResultResponse::verdict)
                .filter(verdict -> !"ACCEPTED".equals(verdict))
                .findFirst()
                .orElse("WRONG_ANSWER");
    }

    private static long millis(String value) {
        if (value == null || value.isBlank()) {
            return 0;
        }
        try {
            return Math.round(Double.parseDouble(value) * 1000.0);
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    private static String normalizeLanguage(String language) {
        return language == null ? "" : language.trim().toLowerCase(Locale.ROOT);
    }

    private static int firstPositive(Integer first, Integer second, int fallback) {
        if (first != null && first > 0) {
            return first;
        }
        if (second != null && second > 0) {
            return second;
        }
        return fallback;
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private static String firstNonBlank(List<RunnerTestCaseResultResponse> results,
                                        java.util.function.Function<RunnerTestCaseResultResponse, String> mapper) {
        return results.stream().map(mapper).filter(Objects::nonNull).filter(value -> !value.isBlank()).findFirst().orElse(null);
    }

    private static RestClient restClient(AssessmentRunnerProperties properties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(properties.getConnectTimeoutMs());
        requestFactory.setReadTimeout(properties.getReadTimeoutMs());
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(properties.getJudge0BaseUrl())
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);
        if (!properties.getJudge0AuthToken().isBlank()) {
            builder.defaultHeader("X-Auth-Token", properties.getJudge0AuthToken());
        }
        return builder.build();
    }

    private record Judge0SubmissionResponse(
            String token,
            String stdout,
            String stderr,
            String compile_output,
            String message,
            String time,
            Long memory,
            Judge0Status status
    ) {
        String compileOutput() {
            return compile_output;
        }

        String statusDescription() {
            return status == null ? null : status.description();
        }
    }

    private record Judge0Status(Integer id, String description) {
    }
}
