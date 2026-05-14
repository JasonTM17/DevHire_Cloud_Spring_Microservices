import { expect, test, type Page, type Route } from "@playwright/test";

const API_PATTERN = "**/api/**";
const NOW = "2026-05-11T08:00:00.000Z";
const candidateAssignmentId = "11111111-1111-4111-8111-111111111111";
const employerAssignmentId = "22222222-2222-4222-8222-222222222222";
const assignedAssignmentId = "99999999-9999-4999-8999-999999999999";
const applicationId = "33333333-3333-4333-8333-333333333333";
const challengeId = "44444444-4444-4444-8444-444444444444";
const jobId = "55555555-5555-4555-8555-555555555555";
const companyId = "66666666-6666-4666-8666-666666666666";

const accounts = {
  admin: {
    email: "admin@devhire.local",
    password: "Admin@123456",
    dashboard: "/admin",
    testId: "admin-dashboard"
  },
  employer: {
    email: "employer@devhire.local",
    password: "Employer@123456",
    dashboard: "/employer",
    testId: "employer-dashboard"
  },
  candidate: {
    email: "candidate@devhire.local",
    password: "Candidate@123456",
    dashboard: "/candidate",
    testId: "candidate-dashboard"
  }
} as const;

type Role = keyof typeof accounts;

async function login(page: Page, role: Role) {
  const user = accounts[role];
  await page.goto("/login");
  await expect(page.getByTestId("login-page")).toBeVisible();
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${user.dashboard}$`));
  await expect(page.getByTestId(user.testId)).toBeVisible();
}

async function setCandidateCode(page: Page, code: string) {
  const fallback = page.locator('textarea[aria-label="Candidate code submission"]');
  if (await fallback.isVisible().catch(() => false)) {
    await fallback.fill(code);
    return;
  }

  const monacoEditor = page.locator('.dh-code-editor[data-editor-mode="monaco"] .monaco-editor');
  await expect(monacoEditor).toBeVisible();
  await monacoEditor.click();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.insertText(code);
}

function envelope(data: unknown) {
  return {
    timestamp: NOW,
    success: true,
    data
  };
}

async function fulfillApi(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(envelope(data))
  });
}

async function fulfillApiError(route: Route, message: string, status = 400) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify({
      timestamp: NOW,
      success: false,
      message
    })
  });
}

function pageResponse<T>(content: T[]) {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    number: 0,
    size: Math.max(content.length, 1)
  };
}

function javaStarterCode() {
  return [
    "class CandidateSolution {",
    "  String solve(String input) {",
    "    return \"\";",
    "  }",
    "}"
  ].join("\n");
}

function javaAcceptedCode() {
  return [
    "class CandidateSolution {",
    "  String solve(String input) {",
    "    boolean strict = input != null && input.contains(\"policy=STRICT\");",
    "    boolean production = input != null && input.contains(\"tag=production\");",
    "    return strict && production ? \"PASSED\" : \"REJECTED\";",
    "  }",
    "}"
  ].join("\n");
}

function codeRun(overrides: Record<string, unknown> = {}) {
  return {
    ...baseRun(),
    ...overrides
  };
}

function baseRun() {
  return {
    id: "77777777-7777-4777-8777-777777777777",
    status: "COMPLETED",
    sandboxStatus: "JUDGE0_ISOLATED_SANDBOX",
    verdict: "ACCEPTED",
    visiblePassed: 1,
    visibleTotal: 1,
    hiddenPassed: 0,
    hiddenTotal: 0,
    executionTimeMs: 68,
    memoryKb: 24576,
    failureReason: undefined,
    compileOutput: "",
    stdout: "PASSED",
    stderr: "",
    timeLimitMs: 2000,
    memoryLimitKb: 131072,
    runnerVersion: "judge0-compatible-e2e",
    integrityRiskScore: 2,
    similarityScore: 0,
    results: [
      {
        caseId: "visible-1",
        name: "Visible production strict case",
        visibility: "VISIBLE",
        passed: true,
        verdict: "ACCEPTED",
        output: "PASSED",
        stdout: "PASSED",
        executionTimeMs: 68,
        memoryKb: 24576,
        timeLimitMs: 2000,
        memoryLimitKb: 131072
      }
    ],
    createdAt: NOW,
    completedAt: NOW
  };
}

function codeAssessment(overrides: Record<string, unknown> = {}) {
  return {
    id: candidateAssignmentId,
    applicationId,
    candidateName: "Linh Nguyen",
    jobTitle: "Senior Java Platform Engineer",
    challengeTitle: "Cloud Architecture Challenge",
    challengeVersion: 3,
    level: "Senior",
    language: "Java",
    prompt: "Return PASSED only for strict production resources, otherwise REJECTED.",
    constraints: "Submit class CandidateSolution with String solve(String input).",
    starterCode: javaStarterCode(),
    status: "ASSIGNED",
    maxScore: 100,
    latestScore: undefined,
    latestDecision: undefined,
    skills: ["Java", "Runtime safety"],
    rubric: [
      { category: "Runtime correctness", score: 0, maxScore: 75, evidence: "Awaiting final server-side submit." },
      { category: "Static quality", score: 0, maxScore: 25, evidence: "Awaiting final server-side submit." }
    ],
    riskFlags: [],
    feedback: "Visible examples can be run before final submit.",
    aiFeedbackFallback: false,
    submittedCode: undefined,
    attemptNumber: 0,
    codeHash: undefined,
    graderVersion: "devhire-runtime-v0.7",
    rubricVersion: "devhire-code-rubric-v1",
    submittedCodePreview: undefined,
    hasSubmittedCode: false,
    visibleTestCases: [
      {
        id: "visible-1",
        name: "Visible production strict case",
        visibility: "VISIBLE",
        input: "resource=res-9982;policy=STRICT;tag=production",
        weight: 25
      },
      {
        id: "visible-2",
        name: "Visible relaxed policy case",
        visibility: "VISIBLE",
        input: "resource=res-2211;policy=RELAXED;tag=production",
        weight: 25
      }
    ],
    latestRun: undefined,
    integrityRiskScore: 0,
    similarityScore: 0,
    sandboxStatus: "JUDGE0_READY",
    dueAt: "2026-05-18T08:00:00.000Z",
    assignedAt: NOW,
    submittedAt: undefined,
    ...overrides
  };
}

function submittedAssessment(overrides: Record<string, unknown> = {}) {
  return codeAssessment({
    id: employerAssignmentId,
    status: "SUBMITTED",
    latestScore: 91,
    latestDecision: "HOLD",
    submittedCode: javaAcceptedCode(),
    submittedCodePreview: javaAcceptedCode().slice(0, 180),
    hasSubmittedCode: true,
    attemptNumber: 2,
    codeHash: "7fe7a53a8a55ed3f7b12881eb3d4f9dcd817be8d063fb4ab7cb8c7f6a29f31dd",
    latestRun: codeRun({
      hiddenPassed: 2,
      hiddenTotal: 2,
      visiblePassed: 2,
      visibleTotal: 2
    }),
    rubric: [
      { category: "Runtime correctness", score: 75, maxScore: 75, evidence: "Visible and hidden cases accepted." },
      { category: "Static quality", score: 16, maxScore: 25, evidence: "Readable solution without unsafe APIs." }
    ],
    riskFlags: ["multiple-failed-attempts"],
    submittedAt: NOW,
    ...overrides
  });
}

function submissionSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: "88888888-8888-4888-8888-888888888888",
    assignmentId: employerAssignmentId,
    runId: "77777777-7777-4777-8777-777777777777",
    language: "Java",
    finalScore: 91,
    decision: "HOLD",
    rubric: [
      { category: "Runtime correctness", score: 75, maxScore: 75, evidence: "Visible and hidden cases accepted." },
      { category: "Static quality", score: 16, maxScore: 25, evidence: "Readable solution without unsafe APIs." }
    ],
    riskFlags: ["multiple-failed-attempts"],
    feedback: "Review hidden aggregate and retry pattern before final decision.",
    attemptNumber: 2,
    codeHash: "7fe7a53a8a55ed3f7b12881eb3d4f9dcd817be8d063fb4ab7cb8c7f6a29f31dd",
    graderVersion: "devhire-runtime-v0.7",
    rubricVersion: "devhire-code-rubric-v1",
    submittedCode: javaAcceptedCode(),
    submittedCodePreview: javaAcceptedCode().slice(0, 180),
    hasSubmittedCode: true,
    verdict: "ACCEPTED",
    visiblePassed: 2,
    visibleTotal: 2,
    hiddenPassed: 2,
    hiddenTotal: 2,
    executionTimeMs: 148,
    memoryKb: 24576,
    submittedAt: NOW,
    ...overrides
  };
}

function job() {
  return {
    id: jobId,
    companyId,
    employerId: "review-employer",
    title: "Senior Java Platform Engineer",
    description: "Build event-driven Java services.",
    requirements: "Java, PostgreSQL, Kafka, observability.",
    benefits: "Remote-friendly engineering team.",
    salaryMin: 8000,
    salaryMax: 12000,
    location: "Ho Chi Minh City / Remote",
    level: "Senior",
    type: "FULL_TIME",
    skills: ["Java", "PostgreSQL", "Kafka"],
    status: "PUBLISHED",
    publishedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW
  };
}

function application(status = "SUBMITTED") {
  return {
    id: applicationId,
    jobId,
    candidateId: "preview-candidate",
    employerId: "review-employer",
    status,
    cvUrl: "https://storage.devhire.local/cv/linh.pdf",
    coverLetter: "I can build Java platform services.",
    createdAt: NOW,
    updatedAt: NOW
  };
}

function company() {
  return {
    id: companyId,
    employerId: "review-employer",
    name: "Portfolio Labs",
    slug: "portfolio-labs",
    website: "https://portfolio-labs.local",
    size: "51-200",
    industry: "Recruitment platform",
    description: "Engineering portfolio company.",
    status: "APPROVED"
  };
}

function codeChallenge(overrides: Record<string, unknown> = {}) {
  return {
    id: challengeId,
    slug: "java-production-validation",
    title: "Cloud Architecture Challenge",
    version: 3,
    level: "Senior",
    language: "Java",
    prompt: "Return PASSED only for strict production resources.",
    constraints: "No package, public class, network, filesystem, process, or reflection APIs.",
    starterCode: javaStarterCode(),
    skills: ["Java", "Runtime safety"],
    requiredSignals: ["CandidateSolution.solve"],
    maxScore: 100,
    active: false,
    referenceSolution: javaAcceptedCode(),
    visibleCaseCount: 1,
    hiddenCaseCount: 1,
    testCases: [
      {
        id: "visible-1",
        name: "Visible production strict case",
        visibility: "VISIBLE",
        stdin: "resource=res-9982;policy=STRICT;tag=production",
        expectedOutput: "PASSED",
        weight: 25,
        ordinal: 1
      },
      {
        id: "hidden-1",
        name: "Private validation case A",
        visibility: "HIDDEN",
        stdin: "resource=res-1111;policy=STRICT;tag=staging",
        expectedOutput: "REJECTED",
        weight: 25,
        ordinal: 2
      }
    ],
    createdAt: NOW,
    ...overrides
  };
}

function codeAssessmentSummary() {
  return {
    totalAssignments: 12,
    submitted: 9,
    autoReviewed: 6,
    employerReviewed: 3,
    passed: 4,
    failed: 1,
    averageScore: 82.4,
    riskySubmissions: 2,
    runQueueDepth: 1,
    sandboxFailureRate: 0.02,
    acceptedRate: 0.72,
    wrongAnswerRate: 0.12,
    compileErrorRate: 0.04,
    timeoutRate: 0.03,
    runnerUnavailableRate: 0.01,
    policyBlockedRate: 0.02,
    averageRuntimeMs: 142,
    submissionVolumeByDay: [{ day: "2026-05-11", count: 9 }],
    statusDistribution: [
      { status: "SUBMITTED", count: 5 },
      { status: "PASSED", count: 4 },
      { status: "FAILED", count: 1 }
    ],
    runnerHealth: {
      status: "UP",
      mode: "judge0",
      runnerVersion: "judge0-compatible-e2e",
      judge0Configured: true,
      failClosed: false,
      networkDisabled: true,
      queueDepth: 1,
      failClosedReason: undefined,
      checkedAt: NOW
    }
  };
}

function operationsSummary() {
  return {
    apiGateway: "UP",
    kafkaLag: 0,
    openSearch: "GREEN",
    emailBacklog: 0,
    p95LatencyMs: 118,
    errorRate: 0.01,
    deploymentVersion: "e2e-preview"
  };
}

type CandidateRouteOptions = {
  runs?: Array<Record<string, unknown>>;
  submittedState?: Record<string, unknown>;
};

async function routeCandidateCodeAssessmentApi(page: Page, options: CandidateRouteOptions = {}) {
  let submitted = false;
  const queuedRuns = [...(options.runs ?? [])];

  await page.route(API_PATTERN, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (method === "GET" && path === "/api/candidate/code-assessments") {
      await fulfillApi(route, [codeAssessment(submitted ? submittedCandidateState() : {})]);
      return;
    }
    if (method === "GET" && path === `/api/candidate/code-assessments/${candidateAssignmentId}`) {
      await fulfillApi(route, codeAssessment(submitted ? submittedCandidateState() : {}));
      return;
    }
    if (method === "GET" && path === `/api/candidate/code-assessments/${candidateAssignmentId}/submissions`) {
      await fulfillApi(route, submitted ? [submissionSummary({ assignmentId: candidateAssignmentId, hiddenPassed: 0, hiddenTotal: 0 })] : []);
      return;
    }
    if (method === "POST" && path === `/api/candidate/code-assessments/${candidateAssignmentId}/runs`) {
      const body = route.request().postDataJSON() as { customInput?: string; code?: string };
      expect(body.customInput).toContain("policy=STRICT");
      expect(body.code).toContain("class CandidateSolution");
      await fulfillApi(route, queuedRuns.shift() ?? codeRun());
      return;
    }
    if (method === "POST" && path === `/api/candidate/code-assessments/${candidateAssignmentId}/submissions`) {
      const body = route.request().postDataJSON() as { notes?: string; code?: string };
      expect(body.notes).toContain("Reviewed visible output");
      expect(body.code).toContain("String solve");
      submitted = true;
      await fulfillApi(route, codeAssessment(submittedCandidateState(options.submittedState)));
      return;
    }

    await route.fallback();
  });
}

function submittedCandidateState(overrides: Record<string, unknown> = {}) {
  return {
    status: "SUBMITTED",
    latestScore: 92,
    latestDecision: "HOLD",
    submittedCode: javaAcceptedCode(),
    submittedCodePreview: javaAcceptedCode().slice(0, 180),
    hasSubmittedCode: true,
    attemptNumber: 1,
    codeHash: "7fe7a53a8a55ed3f7b12881eb3d4f9dcd817be8d063fb4ab7cb8c7f6a29f31dd",
    latestRun: codeRun({
      visiblePassed: 2,
      visibleTotal: 2,
      hiddenPassed: 0,
      hiddenTotal: 0
    }),
    rubric: [
      { category: "Runtime correctness", score: 75, maxScore: 75, evidence: "Visible accepted; hidden evidence redacted for candidate view." },
      { category: "Static quality", score: 17, maxScore: 25, evidence: "Readable Java solve method." }
    ],
    feedback: "Server-side grading complete; hidden evidence remains redacted.",
    submittedAt: NOW,
    ...overrides
  };
}

async function routeEmployerApi(page: Page) {
  let reviewState = submittedAssessment();
  let assignCalled = false;

  await page.route(API_PATTERN, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (method === "GET" && path === "/api/employer/companies") {
      await fulfillApi(route, pageResponse([company()]));
      return;
    }
    if (method === "GET" && path === "/api/jobs") {
      await fulfillApi(route, pageResponse([job()]));
      return;
    }
    if (method === "GET" && path === "/api/employer/pipeline/summary") {
      await fulfillApi(route, {
        openApplications: 1,
        interviews: 0,
        offers: 0,
        conversionRate: 0.42,
        statusDistribution: [{ status: "SUBMITTED", count: 1 }],
        recentActivity: []
      });
      return;
    }
    if (method === "GET" && path === `/api/employer/jobs/${jobId}/applications`) {
      await fulfillApi(route, pageResponse([application()]));
      return;
    }
    if (method === "POST" && path === `/api/employer/applications/${applicationId}/code-assessments`) {
      expect(route.request().postDataJSON()).toEqual({});
      assignCalled = true;
      await fulfillApi(route, codeAssessment({ id: assignedAssignmentId, status: "ASSIGNED" }));
      return;
    }
    if (method === "GET" && path === "/api/employer/code-assessments") {
      await fulfillApi(route, assignCalled ? [codeAssessment({ id: assignedAssignmentId, status: "ASSIGNED" }), reviewState] : [reviewState]);
      return;
    }
    if (method === "GET" && path === `/api/employer/code-assessments/${employerAssignmentId}`) {
      await fulfillApi(route, reviewState);
      return;
    }
    if (method === "GET" && path === `/api/employer/code-assessments/${employerAssignmentId}/submissions`) {
      await fulfillApi(route, [submissionSummary()]);
      return;
    }
    if (method === "PATCH" && path === `/api/employer/code-assessments/${employerAssignmentId}/review`) {
      const body = route.request().postDataJSON() as { decision: string; note: string };
      expect(["PASS", "HOLD", "REJECT"]).toContain(body.decision);
      expect(body.decision).toBe("PASS");
      expect(body.note).toContain("hidden aggregate");
      reviewState = submittedAssessment({ status: "PASSED", latestDecision: "PASS", latestScore: 91 });
      await fulfillApi(route, reviewState);
      return;
    }

    await route.fallback();
  });
}

async function routeAdminApi(page: Page) {
  let savedChallenge = codeChallenge();

  await page.route(API_PATTERN, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (method === "GET" && path === "/api/companies") {
      await fulfillApi(route, pageResponse([company()]));
      return;
    }
    if (method === "GET" && path === "/api/admin/audit-logs") {
      await fulfillApi(route, pageResponse([{
        id: "audit-1",
        actorId: "review-admin",
        actorEmail: "admin@devhire.local",
        actorRole: "ADMIN",
        action: "CODE_CHALLENGE_PUBLISHED",
        targetType: "CODE_CHALLENGE",
        targetId: challengeId,
        metadata: { source: "e2e" },
        createdAt: NOW
      }]));
      return;
    }
    if (method === "GET" && path === "/api/admin/ai/provider/status") {
      await fulfillApi(route, {
        provider: "anthropic",
        model: "claude-haiku",
        baseUrlHost: "api.anthropic.com",
        anthropicVersion: "2023-06-01",
        maxTokens: 1200,
        apiKeyConfigured: false,
        demoFallbackEnabled: true,
        mode: "REVIEWER_SAFE",
        circuitBreakerState: "CLOSED",
        consecutiveFailures: 0,
        checkedAt: NOW
      });
      return;
    }
    if (method === "GET" && path === "/api/admin/jobs") {
      await fulfillApi(route, pageResponse([job()]));
      return;
    }
    if (method === "GET" && path === "/api/admin/operations/summary") {
      await fulfillApi(route, operationsSummary());
      return;
    }
    if (method === "GET" && path === "/api/admin/code-assessments/summary") {
      await fulfillApi(route, codeAssessmentSummary());
      return;
    }
    if (method === "GET" && path === "/api/admin/code-challenges") {
      await fulfillApi(route, [savedChallenge]);
      return;
    }
    if (method === "POST" && path === "/api/admin/code-challenges") {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      expect(body.title).toContain("E2E Java Challenge");
      expect(body.active).toBe(false);
      expect(String(body.referenceSolution)).toContain("CandidateSolution");
      savedChallenge = codeChallenge({
        title: String(body.title),
        active: false,
        testCases: body.testCases
      });
      await fulfillApi(route, savedChallenge);
      return;
    }
    if (method === "PATCH" && path === `/api/admin/code-challenges/${challengeId}`) {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      expect(body.active).toBe(true);
      expect(Array.isArray(body.testCases)).toBe(true);
      savedChallenge = codeChallenge({
        title: String(body.title),
        active: true,
        visibleCaseCount: 2,
        hiddenCaseCount: 2,
        testCases: body.testCases
      });
      await fulfillApi(route, savedChallenge);
      return;
    }
    if (method === "POST" && path === "/api/admin/ai/knowledge/reindex") {
      await fulfillApi(route, { documents: 12, chunks: 48 });
      return;
    }

    await route.fallback();
  });
}

test.describe("LeetCode-style code assessment E2E", () => {
  test("candidate runs custom visible input, submits Java, and never sees hidden payloads", async ({ page }) => {
    await routeCandidateCodeAssessmentApi(page);
    await login(page, "candidate");

    await page.goto("/candidate/assessments");
    await expect(page.getByTestId("candidate-assessments-page")).toHaveAttribute("data-assessment-source", "api");
    await expect(page.getByRole("tab", { name: /CandidateSolution\.java/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cloud Architecture Challenge", exact: true })).toBeVisible();
    await expect(page.getByText("Visible production strict case").first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Private validation case A");
    await expect(page.locator("body")).not.toContainText("resource=res-1111");

    await setCandidateCode(page, javaAcceptedCode());
    await page.getByLabel("Custom stdin").fill("resource=res-9982;policy=STRICT;tag=production");
    await page.getByRole("button", { name: "Run Custom Input" }).click();

    await expect(page.getByText(/Accepted: 1\/1 visible cases passed/i)).toBeVisible();
    await expect(page.getByText(/PASSED \(68 ms \/ 24 MB\)/i)).toBeVisible();
    await expect(page.getByText(/Runner judge0-compatible-e2e/i)).toBeVisible();

    await page.getByLabel("Candidate notes").fill("Reviewed visible output before final server-side hidden grading.");
    await page.getByRole("button", { name: "Submit for rubric score" }).click();

    await expect(page.getByText(/Server-side grading complete/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Submission history" })).toBeVisible();
    await expect(page.getByText(/hidden results redacted for candidate view/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit for rubric score" })).toBeDisabled();
    await expect(page.locator("body")).not.toContainText("Private validation case A");
    await expect(page.locator("body")).not.toContainText("resource=res-1111");
    await expect(page.locator("body")).not.toContainText("expected_output");
  });

  test("candidate sees compile error, timeout, and runner unavailable states", async ({ page }) => {
    await routeCandidateCodeAssessmentApi(page, {
      runs: [
        codeRun({
          status: "FAILED",
          verdict: "COMPILE_ERROR",
          visiblePassed: 0,
          visibleTotal: 1,
          compileOutput: "CandidateSolution.java:3: error: ';' expected",
          results: [{
            caseId: "visible-compile",
            name: "Visible production strict case",
            visibility: "VISIBLE",
            passed: false,
            verdict: "COMPILE_ERROR",
            output: "CandidateSolution.java:3: error: ';' expected",
            stdout: "",
            stderr: "",
            compileOutput: "CandidateSolution.java:3: error: ';' expected",
            error: "CandidateSolution.java:3: error: ';' expected",
            executionTimeMs: 0,
            memoryKb: 0,
            timeLimitMs: 2000,
            memoryLimitKb: 131072
          }]
        }),
        codeRun({
          status: "COMPLETED",
          verdict: "TIME_LIMIT_EXCEEDED",
          visiblePassed: 0,
          visibleTotal: 1,
          results: [{
            caseId: "visible-timeout",
            name: "Visible production strict case",
            visibility: "VISIBLE",
            passed: false,
            verdict: "TIME_LIMIT_EXCEEDED",
            output: "Time limit exceeded",
            stdout: "",
            stderr: "Time limit exceeded",
            compileOutput: "",
            error: "Time limit exceeded",
            executionTimeMs: 2000,
            memoryKb: 24576,
            timeLimitMs: 2000,
            memoryLimitKb: 131072
          }]
        }),
        codeRun({
          status: "FAILED",
          verdict: "RUNNER_UNAVAILABLE",
          visiblePassed: 0,
          visibleTotal: 1,
          failureReason: "Judge0 runtime is not configured; server-side scoring failed closed.",
          results: [{
            caseId: "visible-runner",
            name: "Visible production strict case",
            visibility: "VISIBLE",
            passed: false,
            verdict: "RUNNER_UNAVAILABLE",
            output: "Runner unavailable",
            stdout: "",
            stderr: "",
            compileOutput: "",
            error: "Judge0 runtime is not configured; server-side scoring failed closed.",
            executionTimeMs: 0,
            memoryKb: 0,
            timeLimitMs: 2000,
            memoryLimitKb: 131072
          }]
        })
      ]
    });
    await login(page, "candidate");
    await page.goto("/candidate/assessments");

    await setCandidateCode(page, javaAcceptedCode());
    await page.getByLabel("Custom stdin").fill("resource=res-9982;policy=STRICT;tag=production");

    await page.getByRole("button", { name: "Run Custom Input" }).click();
    await expect(page.getByText(/Compile Error: 0\/1 visible cases passed/i)).toBeVisible();
    await expect(page.getByText(/';' expected/i)).toBeVisible();

    await page.getByRole("button", { name: "Run Custom Input" }).click();
    await expect(page.getByText(/Time Limit Exceeded: 0\/1 visible cases passed/i)).toBeVisible();
    await expect(page.getByText(/Time limit exceeded/i).first()).toBeVisible();

    await page.getByRole("button", { name: "Run Custom Input" }).click();
    await expect(page.getByText(/Runner Unavailable: 0\/1 visible cases passed/i)).toBeVisible();
    await expect(page.getByText(/server-side scoring failed closed/i).first()).toBeVisible();
  });

  test("employer assigns an assessment, opens dossier evidence, and records PASS review", async ({ page }) => {
    await routeEmployerApi(page);
    await login(page, "employer");

    await expect(page.getByRole("heading", { name: "Code assessment review" })).toBeVisible();
    await page.getByLabel("Applicant pipeline job").selectOption(jobId);
    await page.getByRole("button", { name: "Load applicants" }).click();
    await expect(page.getByText("Linh Nguyen").first()).toBeVisible();
    await page.locator(".table-row").filter({ hasText: "Linh Nguyen" }).getByRole("button", { name: "Assign code" }).click();

    await expect(page.getByText(/Waiting for candidate submission/i)).toBeVisible();
    await expect(page.getByText("Cloud Architecture Challenge").first()).toBeVisible();

    const readyReview = page.locator(".review-card").filter({ hasText: "Ready for employer decision" }).first();
    await readyReview.getByRole("button", { name: /Open review dossier for Linh Nguyen/ }).click();
    const dossier = page.locator(".review-dossier");
    await expect(dossier).toBeVisible();
    await expect(dossier.getByText(/Visible 2\/2 \/ hidden 2\/2/i)).toBeVisible();
    await expect(dossier.getByText(/Attempt 2 - Accepted/i)).toBeVisible();
    await expect(dossier.getByText(/Hash 7fe7a53a8a/i).first()).toBeVisible();
    await expect(dossier.getByText(/Runtime correctness/)).toBeVisible();

    await page.getByLabel("Employer review notes").fill("PASS after checking hidden aggregate and low-risk Java solution.");
    await page.getByRole("button", { name: "Pass candidate" }).click();

    await expect(page.getByText(/Code review recorded for Linh Nguyen/i)).toBeVisible();
    await expect(page.getByText(/Decision Pass/i)).toBeVisible();
    await expect(page.getByText("91/100").first()).toBeVisible();
  });

  test("admin sees runner health and validates challenge authoring before publish", async ({ page }) => {
    await routeAdminApi(page);
    await login(page, "admin");

    await expect(page.getByRole("heading", { name: "Code assessment health" })).toBeVisible();
    await expect(page.getByText("Up / judge0")).toBeVisible();
    await expect(page.getByText("judge0-compatible-e2e")).toBeVisible();
    await expect(page.getByText("Fail-closed clear")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Code challenge management" })).toBeVisible();

    await page.getByRole("button", { name: "New Java draft" }).click();
    await page.getByLabel("Challenge title").fill("E2E Java Challenge");
    await page.getByLabel("Problem statement").fill("Return PASSED for strict production input and REJECTED otherwise.");
    await page.getByLabel("Runtime constraints").fill("Use CandidateSolution.solve(String input), no package, no public class.");
    await page.getByLabel("Reference solution").fill(javaAcceptedCode());
    await page.getByRole("button", { name: "Add visible case" }).click();
    await page.getByLabel("Case 4 name").fill("Visible relaxed production case");
    await page.getByLabel("Case 4 stdin").fill("resource=res-2211;policy=RELAXED;tag=production");
    await page.getByLabel("Case 4 expected output").fill("REJECTED");

    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText(/Challenge draft saved: E2E Java Challenge/i)).toBeVisible();
    await page.getByRole("button", { name: "Validate and publish" }).click();
    await expect(page.getByText(/Challenge published: E2E Java Challenge/i)).toBeVisible();
    await expect(page.getByText("E2E Java Challenge", { exact: true })).toBeVisible();
    await expect(page.getByText(/Active/).first()).toBeVisible();
  });

  test("admin surfaces publish validation failures without changing the editor draft", async ({ page }) => {
    await routeAdminApi(page);
    await page.route("**/api/admin/code-challenges", async (route) => {
      if (route.request().method() === "POST") {
        await fulfillApiError(route, "Active code challenges require at least one visible and one hidden executable case");
        return;
      }
      await route.fallback();
    });
    await login(page, "admin");

    await page.getByLabel("Challenge title").fill("Invalid publish attempt");
    await page.getByLabel("Reference solution").fill("");
    await page.getByRole("button", { name: "Validate and publish" }).click();

    await expect(page.getByText(/Active code challenges require at least one visible and one hidden executable case/i)).toBeVisible();
    await expect(page.getByLabel("Challenge title")).toHaveValue("Invalid publish attempt");
  });
});
