import type {
  AiProviderStatus,
  Application,
  AuditLog,
  CandidateApplicationsSummary,
  CandidateAssessment,
  CandidateDashboardSummary,
  CandidateOffer,
  CodeAssessment,
  CodeAssessmentSummary,
  CandidateRoadmap,
  Company,
  EmployerPipelineSummary,
  InterviewPrep,
  Job,
  Notification,
  OperationsSummary,
  PageResponse,
  SkillAnalytics
} from "@/types/domain";

const PREVIEW_NOW = new Date("2026-05-08T02:00:00.000Z");

export const previewJobs: PageResponse<Job> = {
  content: [
    previewJob("preview-java-platform", "Senior Java Platform Engineer", "Build event-driven Spring Boot services for high-volume hiring workflows.", "Ho Chi Minh City / Remote", "Senior", ["Java", "Spring Boot", "Kafka", "PostgreSQL"]),
    previewJob("preview-cloud-search", "Search Platform Engineer", "Own OpenSearch relevance, indexing pipelines, and recruitment search latency targets.", "Singapore / Hybrid", "Senior", ["OpenSearch", "Java", "Kubernetes", "Terraform"]),
    previewJob("preview-sre", "Backend SRE Engineer", "Improve gateway reliability, outbox delivery, tracing, and production SLO operations.", "Remote APAC", "Mid-Senior", ["Prometheus", "Grafana", "Kafka", "AWS"]),
    previewJob("preview-ai-platform", "AI Platform Backend Engineer", "Build Claude assistant guardrails, citations, tool traces, and deterministic provider-backup flows.", "Tokyo / Remote", "Senior", ["Claude", "RAG", "Java", "Security"]),
    previewJob("preview-cloud-apply", "Cloud Infrastructure Engineer", "Prepare EKS, RDS, Redis, MSK, OpenSearch, Helm, and GitOps delivery for AWS staging.", "Bangkok / Hybrid", "Lead", ["AWS", "Terraform", "EKS", "Helm"]),
    previewJob("preview-security-gateway", "Gateway Security Engineer", "Harden JWT validation, Redis rate limiting, CORS, security headers, and audit evidence.", "Hanoi", "Senior", ["Gateway", "JWT", "Redis", "Security"]),
    previewJob("preview-observability", "Observability Platform Engineer", "Own SLO dashboards, Prometheus rules, tracing, logs, and runtime evidence automation.", "Da Nang", "Senior", ["Prometheus", "Grafana", "Tempo", "Loki"]),
    previewJob("preview-data-platform", "Recruitment Data Platform Engineer", "Operate search indexing, analytics events, job recommendations, and reporting pipelines.", "Remote Vietnam", "Middle", ["PostgreSQL", "OpenSearch", "Kafka", "Analytics"])
  ],
  totalElements: 188,
  totalPages: 16,
  number: 0,
  size: 12
};

export const previewApplications: PageResponse<Application> = {
  content: [
    {
      id: "preview-application-java",
      jobId: "preview-java-platform",
      candidateId: "preview-candidate",
      employerId: "preview-employer",
      status: "INTERVIEW",
      cvUrl: "https://storage.devhire.local/cv/candidate-profile.pdf",
      coverLetter: "I can lead Spring Boot, Kafka, and observability work across the hiring platform.",
      createdAt: daysAgo(3),
      updatedAt: daysAgo(1)
    },
    {
      id: "preview-application-search",
      jobId: "preview-cloud-search",
      candidateId: "preview-candidate",
      employerId: "preview-employer",
      status: "REVIEWING",
      cvUrl: "https://storage.devhire.local/cv/candidate-profile.pdf",
      coverLetter: "OpenSearch and latency ownership are a strong fit for my platform background.",
      createdAt: daysAgo(6),
      updatedAt: daysAgo(2)
    },
    {
      id: "preview-application-ai",
      jobId: "preview-ai-platform",
      candidateId: "preview-candidate-security",
      employerId: "preview-employer",
      status: "OFFER",
      cvUrl: "https://storage.devhire.local/cv/security-ai-platform.pdf",
      coverLetter: "I can combine backend reliability, AI safety controls, and production observability.",
      createdAt: daysAgo(9),
      updatedAt: daysAgo(1)
    },
    {
      id: "preview-application-cloud",
      jobId: "preview-cloud-apply",
      candidateId: "preview-candidate-cloud",
      employerId: "preview-employer",
      status: "SUBMITTED",
      cvUrl: "https://storage.devhire.local/cv/cloud-platform.pdf",
      coverLetter: "I have shipped Terraform, Helm, and GitOps delivery paths for regulated systems.",
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1)
    },
    {
      id: "preview-application-observability",
      jobId: "preview-observability",
      candidateId: "preview-candidate-sre",
      employerId: "preview-employer",
      status: "INTERVIEW",
      cvUrl: "https://storage.devhire.local/cv/observability-platform.pdf",
      coverLetter: "SLO operations, incident response, and runtime proof are my core strengths.",
      createdAt: daysAgo(12),
      updatedAt: daysAgo(3)
    }
  ],
  totalElements: 240,
  totalPages: 1,
  number: 0,
  size: 5
};

export const previewNotifications: PageResponse<Notification> = {
  content: [
    {
      id: "preview-notification-interview",
      recipientId: "preview-candidate",
      type: "APPLICATION_STATUS_CHANGED",
      title: "Interview stage scheduled",
      message: "Portfolio Labs moved your Senior Java Platform Engineer application to interview.",
      read: false,
      emailStatus: "SENT",
      emailRecipient: "candidate@devhire.local",
      emailSentAt: daysAgo(1),
      createdAt: daysAgo(1)
    },
    {
      id: "preview-notification-submitted",
      recipientId: "preview-candidate",
      type: "APPLICATION_SUBMITTED",
      title: "Application submitted",
      message: "Your application was persisted and emitted through notification and audit events.",
      read: true,
      readAt: daysAgo(2),
      emailStatus: "SENT",
      emailRecipient: "candidate@devhire.local",
      emailSentAt: daysAgo(2),
      createdAt: daysAgo(2)
    },
    {
      id: "preview-notification-offer",
      recipientId: "preview-candidate-security",
      type: "APPLICATION_STATUS_CHANGED",
      title: "Offer stage created",
      message: "AI Platform Backend Engineer moved to offer after architecture review.",
      read: false,
      emailStatus: "SENT",
      emailRecipient: "candidate@devhire.local",
      emailSentAt: daysAgo(1),
      createdAt: daysAgo(1)
    },
    {
      id: "preview-notification-employer",
      recipientId: "preview-employer",
      type: "APPLICATION_SUBMITTED",
      title: "New cloud platform applicant",
      message: "A candidate applied with Terraform, Helm, and GitOps production experience.",
      read: false,
      emailStatus: "PENDING",
      emailRecipient: "employer@devhire.local",
      createdAt: daysAgo(1)
    }
  ],
  totalElements: 220,
  totalPages: 1,
  number: 0,
  size: 4
};

export const previewCompanies: PageResponse<Company> = {
  content: [
    {
      id: "preview-company-portfolio-labs",
      employerId: "preview-employer",
      name: "Portfolio Labs",
      slug: "portfolio-labs",
      website: "https://careers.devhire.local/portfolio-labs",
      size: "51-200",
      industry: "Developer Platforms",
      description: "Builds platform tooling for recruitment operations.",
      status: "APPROVED"
    },
    {
      id: "preview-company-cloudway",
      employerId: "preview-employer",
      name: "Cloudway Systems",
      slug: "cloudway-systems",
      website: "https://careers.devhire.local/cloudway-systems",
      size: "201-500",
      industry: "Cloud Infrastructure",
      description: "Runs cloud-native hiring and search infrastructure.",
      status: "PENDING"
    },
    {
      id: "preview-company-signalforge",
      employerId: "preview-employer",
      name: "SignalForge AI",
      slug: "signalforge-ai",
      website: "https://careers.devhire.local/signalforge-ai",
      size: "201-500",
      industry: "AI Products",
      description: "Builds explainable AI workflows for engineering and recruiting teams.",
      status: "APPROVED"
    },
    {
      id: "preview-company-kafkaway",
      employerId: "preview-employer",
      name: "KafkaWay Platform",
      slug: "kafkaway-platform",
      website: "https://careers.devhire.local/kafkaway-platform",
      size: "501-1000",
      industry: "Developer Platforms",
      description: "Operates event-driven systems and platform reliability tooling.",
      status: "APPROVED"
    }
  ],
  totalElements: 27,
  totalPages: 1,
  number: 0,
  size: 4
};

export const previewAuditLogs: PageResponse<AuditLog> = {
  content: [
    previewAudit("AI_TOOL_EXECUTED", "AI_ASSISTANT", "preview-ai"),
    previewAudit("APPROVE_JOB", "JOB", "preview-java-platform"),
    previewAudit("CHANGE_APPLICATION_STATUS", "APPLICATION", "preview-application-java"),
    previewAudit("APPROVE_COMPANY", "COMPANY", "preview-company-portfolio-labs"),
    previewAudit("EMAIL_RETRY_SCHEDULED", "NOTIFICATION", "preview-notification-employer"),
    previewAudit("CLOUD_POLICY_AUDIT", "CLOUD_BLUEPRINT", "preview-cloud-apply")
  ],
  totalElements: 280,
  totalPages: 1,
  number: 0,
  size: 6
};

export const previewAiProviderStatus: AiProviderStatus = {
  provider: "anthropic",
  model: "claude-haiku-4-5-20251001",
  baseUrlHost: "api.anthropic.com",
  anthropicVersion: "2023-06-01",
  maxTokens: 900,
  apiKeyConfigured: true,
  demoFallbackEnabled: false,
  mode: "CLAUDE_READY",
  circuitBreakerState: "CLOSED",
  consecutiveFailures: 0,
  checkedAt: daysAgo(0)
};

export const previewCandidateDashboardSummary: CandidateDashboardSummary = {
  applications: 42,
  activeApplications: 31,
  interviews: 8,
  offers: 3,
  statusDistribution: [
    { status: "SUBMITTED", count: 12 },
    { status: "REVIEWING", count: 11 },
    { status: "INTERVIEW", count: 8 },
    { status: "OFFER", count: 3 },
    { status: "REJECTED", count: 5 },
    { status: "WITHDRAWN", count: 3 }
  ],
  timeline: [
    previewTimeline("Senior Java Platform Engineer", "INTERVIEW", "Technical interview scheduled with platform team."),
    previewTimeline("AI Platform Backend Engineer", "OFFER", "Offer package prepared after architecture review."),
    previewTimeline("Cloud Infrastructure Engineer", "REVIEWING", "Recruiter screening cloud blueprint experience.")
  ]
};

export const previewCandidateApplicationsSummary: CandidateApplicationsSummary = {
  totalApplications: 42,
  duplicateProtectedJobs: 42,
  statusDistribution: previewCandidateDashboardSummary.statusDistribution,
  recentActivity: previewCandidateDashboardSummary.timeline
};

export const previewCandidateOffers: CandidateOffer[] = [
  {
    id: "preview-offer-ai-platform",
    applicationId: "preview-application-ai",
    jobTitle: "AI Platform Backend Engineer",
    companyName: "SignalForge AI",
    compensation: "$5,200 - $7,800 / month",
    status: "SENT",
    highlights: ["Architecture ownership", "Claude safety work", "Remote APAC", "Learning budget"],
    expiresAt: daysFromNow(7),
    createdAt: daysAgo(1)
  },
  {
    id: "preview-offer-java-platform",
    applicationId: "preview-application-java",
    jobTitle: "Senior Java Platform Engineer",
    companyName: "Portfolio Labs",
    compensation: "$4,800 - $7,200 / month",
    status: "DRAFT",
    highlights: ["Kafka workflows", "SLO ownership", "Spring Boot platform", "Mentorship track"],
    expiresAt: daysFromNow(12),
    createdAt: daysAgo(2)
  }
];

export const previewCandidateAssessments: CandidateAssessment[] = [
  {
    id: "preview-assessment-java",
    title: "Java Microservices Design",
    provider: "DevHire Labs",
    score: 91,
    maxScore: 100,
    status: "PASSED",
    skills: ["Java", "Spring Boot", "PostgreSQL", "Kafka"],
    completedAt: daysAgo(5)
  },
  {
    id: "preview-assessment-cloud",
    title: "Cloud Infrastructure Review",
    provider: "Cloud Guild",
    score: 84,
    maxScore: 100,
    status: "PASSED",
    skills: ["AWS", "Terraform", "EKS", "Helm"],
    completedAt: daysAgo(9)
  },
  {
    id: "preview-assessment-incident",
    title: "Production Incident Response",
    provider: "Platform Review Board",
    score: 0,
    maxScore: 100,
    status: "IN_PROGRESS",
    skills: ["SLO", "Runbooks", "Observability"],
    completedAt: undefined
  }
];

export const previewCodeAssessments: CodeAssessment[] = [
  {
    id: "preview-code-cloud-architecture",
    applicationId: "preview-application-java",
    candidateName: "Linh Nguyen",
    jobTitle: "Senior Java Platform Engineer",
    challengeTitle: "Cloud Architecture Challenge",
    level: "Senior",
    language: "Java",
    prompt: "Implement a custom ResourceValidator bean in the main Spring Boot application class.",
    constraints: "Use @Bean, apply EnterpriseSecurityPolicy.STRICT, and validate production-tagged resources only.",
    starterCode: "package com.devhire.cloud;\n\nimport org.springframework.boot.SpringApplication;\nimport org.springframework.boot.autoconfigure.SpringBootApplication;\nimport org.springframework.context.annotation.Bean;\n\n@SpringBootApplication\npublic class CloudServiceApplication {\n  public static void main(String[] args) {\n    SpringApplication.run(CloudServiceApplication.class, args);\n  }\n\n  public ResourceValidator resourceValidator() {\n    return new DefaultResourceValidator();\n  }\n}",
    status: "AUTO_REVIEWED",
    maxScore: 100,
    latestScore: 91,
    latestDecision: "ADVANCE",
    skills: ["Java", "Spring Boot", "Bean Validation", "Security"],
    rubric: [
      { category: "Correctness and completeness", score: 36, maxScore: 40, evidence: "ResourceValidator bean and production policy signals found." },
      { category: "Maintainability and readability", score: 18, maxScore: 20, evidence: "Main application class remains clear and reviewable." },
      { category: "Complexity and performance", score: 13, maxScore: 15, evidence: "Validation boundary is direct and deterministic." },
      { category: "Security posture", score: 15, maxScore: 15, evidence: "Strict enterprise policy is applied without unsafe execution calls." },
      { category: "Test and evidence quality", score: 9, maxScore: 10, evidence: "Candidate included assertion-style validation evidence." }
    ],
    riskFlags: [],
    feedback: "Strong production-ready submission with clear validator signals and low review risk.",
    aiFeedbackFallback: true,
    submittedCode: "package com.devhire.cloud;\n\nimport org.springframework.boot.SpringApplication;\nimport org.springframework.boot.autoconfigure.SpringBootApplication;\nimport org.springframework.context.annotation.Bean;\n\n/**\n * Main application class for the DevHire Cloud Resource Manager.\n * TASK 1: Provide the ResourceValidator bean below.\n */\n@SpringBootApplication\npublic class CloudServiceApplication {\n\n  public static void main(String[] args) {\n    SpringApplication.run(CloudServiceApplication.class, args);\n  }\n\n  @Bean\n  public ResourceValidator resourceValidator() {\n    return new ResourceValidator(EnterpriseSecurityPolicy.STRICT, \"production\");\n  }\n\n  @Test\n  void validatesProductionResourcesWithStrictPolicy() {\n    assert resourceValidator().policy() == EnterpriseSecurityPolicy.STRICT;\n  }\n}",
    attemptNumber: 2,
    codeHash: "7fe7a53a8a55ed3f7b12881eb3d4f9dcd817be8d063fb4ab7cb8c7f6a29f31dd",
    graderVersion: "static-rubric-v1",
    rubricVersion: "devhire-code-rubric-v1",
    submittedCodePreview: "package com.devhire.cloud; @SpringBootApplication public class CloudServiceApplication { @Bean public ResourceValidator resourceValidator() {...",
    hasSubmittedCode: true,
    visibleTestCases: [
      { id: "preview-case-resource-visible-1", name: "Bean Initialization", visibility: "VISIBLE", input: "@Bean ResourceValidator", weight: 15 },
      { id: "preview-case-resource-visible-2", name: "Policy Enforcement", visibility: "VISIBLE", input: "EnterpriseSecurityPolicy.STRICT", weight: 15 },
      { id: "preview-case-resource-visible-3", name: "Tag Filtering", visibility: "VISIBLE", input: "production resources only", weight: 10 }
    ],
    latestRun: {
      id: "preview-run-cloud-architecture",
      status: "COMPLETED",
      sandboxStatus: "JUDGE0_COMPATIBLE_LOCAL_SANDBOX",
      visiblePassed: 3,
      visibleTotal: 3,
      hiddenPassed: 0,
      hiddenTotal: 2,
      executionTimeMs: 146,
      memoryKb: 24576,
      integrityRiskScore: 8.5,
      similarityScore: 4.2,
      results: [
        { caseId: "preview-case-resource-visible-1", name: "Bean Initialization", visibility: "VISIBLE", passed: true, output: "matched:@Bean ResourceValidator", executionTimeMs: 62, memoryKb: 18432 },
        { caseId: "preview-case-resource-visible-2", name: "Policy Enforcement", visibility: "VISIBLE", passed: true, output: "matched:EnterpriseSecurityPolicy.STRICT", executionTimeMs: 84, memoryKb: 24576 },
        { caseId: "preview-case-resource-visible-3", name: "Tag Filtering", visibility: "VISIBLE", passed: true, output: "matched:production", executionTimeMs: 68, memoryKb: 22528 }
      ],
      createdAt: daysAgo(1),
      completedAt: daysAgo(1)
    },
    integrityRiskScore: 8.5,
    similarityScore: 4.2,
    sandboxStatus: "JUDGE0_COMPATIBLE_LOCAL_SANDBOX",
    dueAt: daysFromNow(6),
    assignedAt: daysAgo(4),
    submittedAt: daysAgo(1)
  },
  {
    id: "preview-code-sql",
    applicationId: "preview-application-search",
    candidateName: "Aiko Sato",
    jobTitle: "Search Platform Engineer",
    challengeTitle: "SQL application funnel diagnostics",
    level: "Mid-Senior",
    language: "SQL",
    prompt: "Summarize application status counts and stale review queues for an employer dashboard.",
    constraints: "Prefer indexed filters and pagination-safe aggregation.",
    starterCode: "SELECT status, count(*) FROM job_applications WHERE employer_id = :employerId GROUP BY status;",
    status: "EMPLOYER_REVIEWED",
    maxScore: 100,
    latestScore: 84,
    latestDecision: "REVIEW",
    skills: ["SQL", "PostgreSQL", "Indexes", "Analytics"],
    rubric: [
      { category: "Correctness and completeness", score: 32, maxScore: 40, evidence: "Employer filter and grouped counts included." },
      { category: "Maintainability and readability", score: 17, maxScore: 20, evidence: "Readable query structure." },
      { category: "Complexity and performance", score: 14, maxScore: 15, evidence: "Index-aware filter strategy." },
      { category: "Security posture", score: 15, maxScore: 15, evidence: "No unsafe static smell detected." },
      { category: "Test and evidence quality", score: 6, maxScore: 10, evidence: "Needs stronger edge-case assertions." }
    ],
    riskFlags: ["missing-test-evidence"],
    feedback: "Promising submission. Employer review should focus on edge cases, test depth, and stale queue behavior.",
    aiFeedbackFallback: true,
    submittedCode: "SELECT status, count(*) AS total FROM job_applications WHERE employer_id = :employerId GROUP BY status ORDER BY status LIMIT 50;",
    attemptNumber: 1,
    codeHash: "807d7ba96f4c7ccdc987328bbcaf5b68100bd68742221f591945e17e4b4d7306",
    graderVersion: "static-rubric-v1",
    rubricVersion: "devhire-code-rubric-v1",
    submittedCodePreview: "SELECT status, count(*) AS total FROM job_applications WHERE employer_id = :employerId GROUP BY status ORDER BY status LIMIT 50;",
    hasSubmittedCode: true,
    visibleTestCases: [
      { id: "preview-case-sql-visible-1", name: "Visible tenant scope", visibility: "VISIBLE", input: "employer scoped rows", weight: 20 },
      { id: "preview-case-sql-visible-2", name: "Visible grouped status", visibility: "VISIBLE", input: "status funnel", weight: 20 }
    ],
    latestRun: {
      id: "preview-run-sql",
      status: "COMPLETED",
      sandboxStatus: "JUDGE0_COMPATIBLE_LOCAL_SANDBOX",
      visiblePassed: 2,
      visibleTotal: 2,
      hiddenPassed: 0,
      hiddenTotal: 1,
      executionTimeMs: 88,
      memoryKb: 18432,
      integrityRiskScore: 16.4,
      similarityScore: 11.8,
      results: [
        { caseId: "preview-case-sql-visible-1", name: "Visible tenant scope", visibility: "VISIBLE", passed: true, output: "matched:employer_id", executionTimeMs: 38, memoryKb: 16384 },
        { caseId: "preview-case-sql-visible-2", name: "Visible grouped status", visibility: "VISIBLE", passed: true, output: "matched:group|status", executionTimeMs: 50, memoryKb: 18432 }
      ],
      createdAt: daysAgo(2),
      completedAt: daysAgo(2)
    },
    integrityRiskScore: 16.4,
    similarityScore: 11.8,
    sandboxStatus: "JUDGE0_COMPATIBLE_LOCAL_SANDBOX",
    dueAt: daysFromNow(3),
    assignedAt: daysAgo(6),
    submittedAt: daysAgo(2)
  },
  {
    id: "preview-code-resilience",
    applicationId: "preview-application-cloud",
    candidateName: "Bao Pham",
    jobTitle: "Backend SRE Engineer",
    challengeTitle: "Search resilience implementation sketch",
    level: "Senior",
    language: "Java",
    prompt: "Design an OpenSearch-first, PostgreSQL recovery path with published-only visibility.",
    constraints: "Include adapter status, timing, exception handling, and tests.",
    starterCode: "class JobSearchResilience {\n  SearchResult search(SearchCriteria criteria) {\n    // implement adapter recovery\n  }\n}",
    status: "ASSIGNED",
    maxScore: 100,
    latestScore: undefined,
    latestDecision: undefined,
    skills: ["Java", "OpenSearch", "PostgreSQL", "Observability"],
    rubric: [],
    riskFlags: [],
    feedback: undefined,
    aiFeedbackFallback: true,
    submittedCode: undefined,
    attemptNumber: undefined,
    codeHash: undefined,
    graderVersion: "static-rubric-v1",
    rubricVersion: "devhire-code-rubric-v1",
    submittedCodePreview: undefined,
    hasSubmittedCode: false,
    visibleTestCases: [
      { id: "preview-case-resilience-visible-1", name: "Visible OpenSearch adapter", visibility: "VISIBLE", input: "primary search dependency", weight: 20 },
      { id: "preview-case-resilience-visible-2", name: "Visible Postgres recovery", visibility: "VISIBLE", input: "dependency outage", weight: 20 }
    ],
    latestRun: undefined,
    integrityRiskScore: 0,
    similarityScore: 0,
    sandboxStatus: "JUDGE0_COMPATIBLE_LOCAL_SANDBOX",
    dueAt: daysFromNow(9),
    assignedAt: daysAgo(1),
    submittedAt: undefined
  }
];

export const previewCodeAssessmentSummary: CodeAssessmentSummary = {
  totalAssignments: 18,
  submitted: 14,
  autoReviewed: 6,
  employerReviewed: 4,
  passed: 3,
  failed: 1,
  averageScore: 84.5,
  riskySubmissions: 2,
  runQueueDepth: 1,
  sandboxFailureRate: 3.4,
  averageIntegrityRisk: 12.8,
  averageSimilarityScore: 9.1,
  statusDistribution: [
    { status: "ASSIGNED", count: 4 },
    { status: "AUTO_REVIEWED", count: 6 },
    { status: "EMPLOYER_REVIEWED", count: 4 },
    { status: "PASSED", count: 3 },
    { status: "FAILED", count: 1 }
  ]
};

export const previewEmployerPipelineSummary: EmployerPipelineSummary = {
  totalApplications: 240,
  activeCandidates: 84,
  interviewReady: 34,
  offers: 18,
  statusDistribution: [
    { status: "SUBMITTED", count: 96 },
    { status: "REVIEWING", count: 48 },
    { status: "INTERVIEW", count: 34 },
    { status: "OFFER", count: 18 },
    { status: "REJECTED", count: 24 },
    { status: "WITHDRAWN", count: 20 }
  ],
  recentActivity: [
    previewTimeline("Senior Java Platform Engineer", "INTERVIEW", "Linh Nguyen moved to technical interview."),
    previewTimeline("Cloud Infrastructure Engineer", "REVIEWING", "Aiko Sato entered recruiter review."),
    previewTimeline("AI Platform Backend Engineer", "OFFER", "Minh Tran offer package created.")
  ]
};

export const previewSkillAnalytics: SkillAnalytics = {
  publishedJobs: 150,
  averageSalaryMin: 3200,
  averageSalaryMax: 6100,
  topSkills: [
    { skill: "Java", jobs: 88 },
    { skill: "Spring Boot", jobs: 76 },
    { skill: "Kafka", jobs: 54 },
    { skill: "AWS", jobs: 48 },
    { skill: "OpenSearch", jobs: 32 }
  ],
  topLocations: [
    { location: "Ho Chi Minh City", jobs: 38 },
    { location: "Remote Vietnam", jobs: 34 },
    { location: "Hanoi", jobs: 26 },
    { location: "Singapore / Hybrid", jobs: 18 }
  ],
  levelDistribution: [
    { level: "Senior", jobs: 52 },
    { level: "Lead", jobs: 34 },
    { level: "Middle", jobs: 32 },
    { level: "Principal", jobs: 18 }
  ]
};

export const previewCandidateRoadmap: CandidateRoadmap = {
  title: "Cloud Backend Career Roadmap",
  currentTrack: "Java microservices, Kafka, AWS, observability",
  readinessScore: 88,
  milestones: [
    {
      title: "Production Java foundation",
      status: "COMPLETED",
      evidence: "Spring Boot services, RBAC, validation, Flyway, and tests.",
      nextAction: "Prepare a concise architecture narrative."
    },
    {
      title: "Event reliability",
      status: "IN_PROGRESS",
      evidence: "Kafka, transactional outbox, retries, and idempotency.",
      nextAction: "Practice a duplicate-event debugging story."
    },
    {
      title: "Cloud readiness",
      status: "NEXT",
      evidence: "Terraform AWS blueprint, Helm, External Secrets, GitOps.",
      nextAction: "Rehearse first apply and rollback checklist."
    }
  ],
  recommendedPrompts: [
    "Quiz me on Kafka outbox failure modes",
    "Explain my AWS blueprint to a staff engineer",
    "Create a STAR story for a production incident"
  ]
};

export const previewInterviewPrep: InterviewPrep[] = [
  {
    conversationId: "preview-interview-architecture",
    title: "Explain the production architecture",
    model: "claude-haiku-4-5-20251001",
    fallback: false,
    lastMessageAt: daysAgo(1),
    focusAreas: ["Service boundaries", "Kafka outbox", "Cloud blueprint"]
  },
  {
    conversationId: "preview-interview-security",
    title: "Explain AI safety controls",
    model: "claude-haiku-4-5-20251001",
    fallback: false,
    lastMessageAt: daysAgo(2),
    focusAreas: ["Prompt injection", "Citations", "Provider backup behavior"]
  }
];

export const previewOperationsSummary: OperationsSummary = {
  auditEvents: 820,
  distinctActors: 94,
  latestEventAt: daysAgo(0),
  topActions: [
    { label: "SUBMIT_APPLICATION", count: 240 },
    { label: "CHANGE_APPLICATION_STATUS", count: 180 },
    { label: "AI_TOOL_EXECUTED", count: 92 },
    { label: "APPROVE_JOB", count: 64 }
  ],
  actorRoles: [
    { label: "CANDIDATE", count: 420 },
    { label: "EMPLOYER", count: 260 },
    { label: "ADMIN", count: 140 }
  ]
};

function previewJob(id: string, title: string, description: string, location: string, level: string, skills: string[]): Job {
  return {
    id,
    companyId: id,
    employerId: "preview-employer",
    title,
    description,
    requirements: "Production Java 21, Spring Boot 3.5, PostgreSQL, Kafka, cloud-native delivery, and observability ownership.",
    benefits: "Remote-friendly engineering culture, modern platform ownership, learning budget, and clear promotion path.",
    salaryMin: 3500,
    salaryMax: 7500,
    location,
    level,
    type: "Full-time",
    skills,
    status: "PUBLISHED",
    publishedAt: daysAgo(0),
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0)
  };
}

function previewAudit(action: string, targetType: string, targetId: string): AuditLog {
  return {
    id: `preview-audit-${action.toLowerCase()}`,
    actorId: "preview-admin",
    actorEmail: "admin@devhire.local",
    actorRole: "ADMIN",
    action,
    targetType,
    targetId,
    metadata: { source: "portfolio-preview" },
    createdAt: daysAgo(1)
  };
}

function daysAgo(days: number) {
  const value = new Date(PREVIEW_NOW);
  value.setDate(value.getDate() - days);
  return value.toISOString();
}

function daysFromNow(days: number) {
  const value = new Date(PREVIEW_NOW);
  value.setDate(value.getDate() + days);
  return value.toISOString();
}

function previewTimeline(title: string, status: string, description: string) {
  return {
    applicationId: `preview-${title.toLowerCase().replaceAll(" ", "-")}`,
    title,
    status,
    description,
    occurredAt: daysAgo(1)
  };
}
