import type { AiProviderStatus, Application, AuditLog, Company, Job, Notification, PageResponse } from "@/types/domain";

export const previewJobs: PageResponse<Job> = {
  content: [
    previewJob("preview-java-platform", "Senior Java Platform Engineer", "Build event-driven Spring Boot services for high-volume hiring workflows.", "Ho Chi Minh City / Remote", "Senior", ["Java", "Spring Boot", "Kafka", "PostgreSQL"]),
    previewJob("preview-cloud-search", "Search Platform Engineer", "Own OpenSearch relevance, indexing pipelines, and recruitment search latency targets.", "Singapore / Hybrid", "Senior", ["OpenSearch", "Java", "Kubernetes", "Terraform"]),
    previewJob("preview-sre", "Backend SRE Engineer", "Improve gateway reliability, outbox delivery, tracing, and production SLO operations.", "Remote APAC", "Mid-Senior", ["Prometheus", "Grafana", "Kafka", "AWS"]),
    previewJob("preview-ai-platform", "AI Platform Backend Engineer", "Build Claude assistant guardrails, citations, tool traces, and deterministic fallback flows.", "Tokyo / Remote", "Senior", ["Claude", "RAG", "Java", "Security"]),
    previewJob("preview-cloud-apply", "Cloud Infrastructure Engineer", "Prepare EKS, RDS, Redis, MSK, OpenSearch, Helm, and GitOps delivery for AWS staging.", "Bangkok / Hybrid", "Lead", ["AWS", "Terraform", "EKS", "Helm"]),
    previewJob("preview-security-gateway", "Gateway Security Engineer", "Harden JWT validation, Redis rate limiting, CORS, security headers, and audit evidence.", "Hanoi", "Senior", ["Gateway", "JWT", "Redis", "Security"]),
    previewJob("preview-observability", "Observability Platform Engineer", "Own SLO dashboards, Prometheus rules, tracing, logs, and runtime evidence automation.", "Da Nang", "Senior", ["Prometheus", "Grafana", "Tempo", "Loki"]),
    previewJob("preview-data-platform", "Recruitment Data Platform Engineer", "Operate search indexing, analytics events, job recommendations, and reporting pipelines.", "Remote Vietnam", "Middle", ["PostgreSQL", "OpenSearch", "Kafka", "Analytics"])
  ],
  totalElements: 188,
  totalPages: 1,
  number: 0,
  size: 8
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
