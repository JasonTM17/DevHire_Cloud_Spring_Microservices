"use client";

import { useCallback, useEffect, useState } from "react";
import { ServiceHealthMatrix } from "@/components/ops/ServiceHealthMatrix";
import { SparklineWidget } from "@/components/ops/SparklineWidget";
import { useDataFetcher } from "@/hooks/useDataFetcher";
import { api } from "@/lib/api";
import { buildOpsHealthSummary, unknownOpsHealthSummary } from "@/lib/ops";
import { appendDataPoint, type MetricName, type TimeRange } from "@/lib/opsSparklineBuffer";
import type { CodeAssessmentSummary, CodeChallenge, CodeChallengeTestCase } from "@/types/domain";
import type { OpsHealthSummary } from "@/lib/ops";

export default function AdminOverviewPage() {
  const [timeRanges, setTimeRanges] = useState<Record<MetricName, TimeRange>>({
    requestRate: "15m",
    errorRate: "15m",
    p95Latency: "15m",
    cpuUtilization: "15m",
    memoryUtilization: "15m",
  });

  const fetchOpsHealth = useCallback(async (): Promise<OpsHealthSummary> => {
    try {
      const [operations, codeAssessments] = await Promise.all([
        api.operationsSummary(),
        api.codeAssessmentSummary(),
      ]);
      const now = Date.now();
      appendDataPoint("requestRate", operations.auditEvents, now);
      appendDataPoint("errorRate", codeAssessments.runnerUnavailableRate + codeAssessments.policyBlockedRate, now);
      appendDataPoint("p95Latency", codeAssessments.p95ExecutionMs, now);
      appendDataPoint("cpuUtilization", codeAssessments.runQueueDepth, now);
      appendDataPoint("memoryUtilization", codeAssessments.sandboxFailureRate, now);
      return buildOpsHealthSummary(operations, codeAssessments);
    } catch (error) {
      return unknownOpsHealthSummary(error instanceof Error ? error.message : "Admin health APIs unavailable");
    }
  }, []);

  const { data: opsHealth } = useDataFetcher<OpsHealthSummary>(
    "ops:health-summary",
    fetchOpsHealth,
    { refreshInterval: 30_000, pauseWhenHidden: true }
  );
  const { data: assessmentSummary } = useDataFetcher<CodeAssessmentSummary>(
    "admin:code-assessment-summary",
    api.codeAssessmentSummary,
    { refreshInterval: 30_000, pauseWhenHidden: true }
  );
  const [challenges, setChallenges] = useState<CodeChallenge[]>([]);
  const [draft, setDraft] = useState<ChallengeDraft>(() => createJavaDraft());
  const [challengeMessage, setChallengeMessage] = useState("");
  const [challengeError, setChallengeError] = useState("");

  useEffect(() => {
    api.codeChallenges()
      .then(setChallenges)
      .catch(() => setChallenges([]));
  }, []);

  function handleTimeRangeChange(metric: MetricName) {
    return (range: TimeRange) => {
      setTimeRanges((prev) => ({ ...prev, [metric]: range }));
    };
  }

  const health = opsHealth ?? unknownOpsHealthSummary("Waiting for the first admin health poll.");
  const runnerHealth = assessmentSummary?.runnerHealth;

  async function handleSaveDraft() {
    setChallengeMessage("");
    setChallengeError("");
    try {
      const saved = await api.createCodeChallenge(toChallengePayload(draft, false));
      setChallenges((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setDraft(fromChallenge(saved));
      setChallengeMessage(`Challenge draft saved: ${saved.title}`);
    } catch (error) {
      setChallengeError(error instanceof Error ? error.message : "Unable to save challenge draft");
    }
  }

  async function handlePublish() {
    setChallengeMessage("");
    setChallengeError("");
    try {
      const payload = toChallengePayload(draft, true);
      const saved = draft.id
        ? await api.updateCodeChallenge(draft.id, payload)
        : await api.createCodeChallenge(payload);
      setChallenges((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setDraft(fromChallenge(saved));
      setChallengeMessage(`Challenge published: ${saved.title}`);
    } catch (error) {
      setChallengeError(error instanceof Error ? error.message : "Unable to validate and publish challenge");
    }
  }

  return (
    <section className="ops-overview-page" data-testid="admin-dashboard">
      <div className="ops-overview-page__header">
        <h1 className="ops-overview-page__title">Operations Overview</h1>
        <p className="ops-overview-page__subtitle">
          Gateway, audit, application, and assessment-runner signals synthesized from live admin APIs.
        </p>
      </div>

      <div className="ops-overview-page__health-matrix">
        <ServiceHealthMatrix services={health.services} />
      </div>

      <div className="ops-overview-page__sparklines">
        <SparklineWidget
          title="Audit Events"
          metric="requestRate"
          timeRange={timeRanges.requestRate}
          onTimeRangeChange={handleTimeRangeChange("requestRate")}
          color="var(--dh-color-ops-accent, #60a5fa)"
        />
        <SparklineWidget
          title="Runner Risk Rate"
          metric="errorRate"
          timeRange={timeRanges.errorRate}
          onTimeRangeChange={handleTimeRangeChange("errorRate")}
          color="var(--dh-color-danger, #ef4444)"
        />
        <SparklineWidget
          title="P95 Execution"
          metric="p95Latency"
          timeRange={timeRanges.p95Latency}
          onTimeRangeChange={handleTimeRangeChange("p95Latency")}
          color="var(--dh-color-warning, #f59e0b)"
        />
        <SparklineWidget
          title="Runner Queue"
          metric="cpuUtilization"
          timeRange={timeRanges.cpuUtilization}
          onTimeRangeChange={handleTimeRangeChange("cpuUtilization")}
          color="var(--dh-color-success, #10b981)"
        />
      </div>

      <div className="split-grid">
        <section className="panel">
          <div className="section-title">
            <h2>Code assessment health</h2>
          </div>
          <div className="metrics-row compact">
            <div className="metric-card">
              <span>Runner</span>
              <strong>{formatRunnerState(runnerHealth)}</strong>
              <small>{runnerHealth?.runnerVersion ?? "Awaiting signal"}</small>
            </div>
            <div className="metric-card">
              <span>Fail-closed</span>
              <strong>{runnerHealth?.failClosed ? "Active" : "Fail-closed clear"}</strong>
              <small>{runnerHealth?.failClosedReason ?? "No fail-closed reason"}</small>
            </div>
            <div className="metric-card">
              <span>Queue depth</span>
              <strong>{runnerHealth?.queueDepth ?? assessmentSummary?.runQueueDepth ?? 0}</strong>
              <small>Sandbox failures {formatRate(assessmentSummary?.sandboxFailureRate)}</small>
            </div>
            <div className="metric-card">
              <span>Verdicts</span>
              <strong>{formatRate(assessmentSummary?.acceptedRate)} accepted</strong>
              <small>Timeout {formatRate(assessmentSummary?.timeoutRate)} / unavailable {formatRate(assessmentSummary?.runnerUnavailableRate)}</small>
            </div>
          </div>
        </section>

        <section className="panel code-challenge-admin">
          <div className="section-title">
            <h2>Code challenge management</h2>
            <button className="button secondary" type="button" onClick={() => setDraft(createJavaDraft())}>
              New Java draft
            </button>
          </div>
          <div className="stack">
            {challenges.map((challenge) => (
              <div className="table-row" key={challenge.id}>
                <span>
                  <strong>{challenge.title}</strong>
                  <small>{challenge.language} v{challenge.version} / visible {challenge.visibleCaseCount} / hidden {challenge.hiddenCaseCount}</small>
                </span>
                <span className={challenge.active ? "badge live" : "badge"}>
                  {challenge.active ? "Active" : "Draft"}
                </span>
              </div>
            ))}
          </div>
          <div className="form">
            <label>
              Challenge title
              <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label>
              Problem statement
              <textarea value={draft.prompt} onChange={(event) => setDraft((current) => ({ ...current, prompt: event.target.value }))} />
            </label>
            <label>
              Runtime constraints
              <textarea value={draft.constraints} onChange={(event) => setDraft((current) => ({ ...current, constraints: event.target.value }))} />
            </label>
            <label>
              Reference solution
              <textarea value={draft.referenceSolution} onChange={(event) => setDraft((current) => ({ ...current, referenceSolution: event.target.value }))} />
            </label>
            <div className="stack">
              {draft.testCases.map((testCase, index) => (
                <div className="panel compact" key={`${testCase.visibility}-${index}`}>
                  <label>
                    Case {index + 1} name
                    <input value={testCase.name} onChange={(event) => updateCase(index, { name: event.target.value })} />
                  </label>
                  <label>
                    Case {index + 1} stdin
                    <textarea value={testCase.stdin} onChange={(event) => updateCase(index, { stdin: event.target.value })} />
                  </label>
                  <label>
                    Case {index + 1} expected output
                    <input value={testCase.expectedOutput} onChange={(event) => updateCase(index, { expectedOutput: event.target.value })} />
                  </label>
                </div>
              ))}
            </div>
            <div className="hero-actions">
              <button className="button outline" type="button" onClick={addVisibleCase}>
                Add visible case
              </button>
              <button className="button secondary" type="button" onClick={handleSaveDraft}>
                Save draft
              </button>
              <button className="button primary" type="button" onClick={handlePublish}>
                Validate and publish
              </button>
            </div>
            {challengeMessage ? <p className="success">{challengeMessage}</p> : null}
            {challengeError ? <p className="error">{challengeError}</p> : null}
          </div>
        </section>
      </div>
    </section>
  );

  function updateCase(index: number, patch: Partial<CodeChallengeTestCase>) {
    setDraft((current) => ({
      ...current,
      testCases: current.testCases.map((item, itemIndex) => (
        itemIndex === index ? { ...item, ...patch } : item
      )),
    }));
  }

  function addVisibleCase() {
    setDraft((current) => ({
      ...current,
      testCases: [
        ...current.testCases,
        {
          name: "Visible relaxed production case",
          visibility: "VISIBLE",
          stdin: "resource=res-2211;policy=RELAXED;tag=production",
          expectedOutput: "REJECTED",
          weight: 25,
          ordinal: current.testCases.length + 1,
        },
      ],
    }));
  }
}

type ChallengeDraft = Omit<CodeChallenge, "id" | "createdAt" | "visibleCaseCount" | "hiddenCaseCount"> & {
  id?: string;
};

function createJavaDraft(): ChallengeDraft {
  return {
    slug: "java-cloud-architecture",
    title: "Cloud Architecture Challenge",
    version: 1,
    level: "Senior",
    language: "Java",
    prompt: "Return PASSED only for strict production resources.",
    constraints: "Use CandidateSolution.solve(String input), no package, no public class.",
    starterCode: "class CandidateSolution {\n  String solve(String input) {\n    return \"\";\n  }\n}",
    skills: ["Java", "Runtime safety"],
    requiredSignals: ["CandidateSolution.solve"],
    maxScore: 100,
    active: false,
    referenceSolution: "class CandidateSolution {\n  String solve(String input) {\n    boolean strict = input != null && input.contains(\"policy=STRICT\");\n    boolean production = input != null && input.contains(\"tag=production\");\n    return strict && production ? \"PASSED\" : \"REJECTED\";\n  }\n}",
    testCases: [
      {
        name: "Visible production strict case",
        visibility: "VISIBLE",
        stdin: "resource=res-9982;policy=STRICT;tag=production",
        expectedOutput: "PASSED",
        weight: 25,
        ordinal: 1,
      },
      {
        name: "Private validation case A",
        visibility: "HIDDEN",
        stdin: "resource=res-1111;policy=STRICT;tag=staging",
        expectedOutput: "REJECTED",
        weight: 25,
        ordinal: 2,
      },
      {
        name: "Private validation case B",
        visibility: "HIDDEN",
        stdin: "resource=res-2001;policy=RELAXED;tag=production",
        expectedOutput: "REJECTED",
        weight: 25,
        ordinal: 3,
      },
    ],
  };
}

function fromChallenge(challenge: CodeChallenge): ChallengeDraft {
  return {
    id: challenge.id,
    slug: challenge.slug,
    title: challenge.title,
    version: challenge.version,
    level: challenge.level,
    language: challenge.language,
    prompt: challenge.prompt,
    constraints: challenge.constraints,
    starterCode: challenge.starterCode,
    skills: challenge.skills,
    requiredSignals: challenge.requiredSignals,
    maxScore: challenge.maxScore,
    active: challenge.active,
    referenceSolution: challenge.referenceSolution ?? "",
    testCases: challenge.testCases,
  };
}

function toChallengePayload(draft: ChallengeDraft, active: boolean) {
  return {
    ...draft,
    active,
    visibleCaseCount: draft.testCases.filter((item) => item.visibility === "VISIBLE").length,
    hiddenCaseCount: draft.testCases.filter((item) => item.visibility === "HIDDEN").length,
    testCases: draft.testCases.map((item, index) => ({ ...item, ordinal: index + 1 })),
  };
}

function formatRunnerState(runnerHealth: CodeAssessmentSummary["runnerHealth"] | undefined): string {
  if (!runnerHealth) return "Awaiting signal";
  const status = runnerHealth.status.toLowerCase() === "up" ? "Up" : runnerHealth.status;
  return `${status} / ${runnerHealth.mode}`;
}

function formatRate(value: number | undefined): string {
  if (typeof value !== "number") return "0%";
  return `${Math.round(value * 100)}%`;
}
