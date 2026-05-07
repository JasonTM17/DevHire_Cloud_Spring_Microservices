import type {
  AiProviderStatus,
  Application,
  AuditLog,
  CandidateApplicationsSummary,
  CandidateAssessment,
  CandidateDashboardSummary,
  CandidateOffer,
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
  checkedAt: new Date().toISOString()
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
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
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
  const value = new Date();
  value.setDate(value.getDate() - days);
  return value.toISOString();
}

function daysFromNow(days: number) {
  const value = new Date();
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
