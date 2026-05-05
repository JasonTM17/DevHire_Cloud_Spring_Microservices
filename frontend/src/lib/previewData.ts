import type { AiProviderStatus, Application, AuditLog, Company, Job, Notification, PageResponse } from "@/types/domain";

export const previewJobs: PageResponse<Job> = {
  content: [
    previewJob("preview-java-platform", "Senior Java Platform Engineer", "Build event-driven Spring Boot services for high-volume hiring workflows.", "Ho Chi Minh City / Remote", "Senior", ["Java", "Spring Boot", "Kafka", "PostgreSQL"]),
    previewJob("preview-cloud-search", "Search Platform Engineer", "Own OpenSearch relevance, indexing pipelines, and recruitment search latency targets.", "Singapore / Hybrid", "Senior", ["OpenSearch", "Java", "Kubernetes", "Terraform"]),
    previewJob("preview-sre", "Backend SRE Engineer", "Improve gateway reliability, outbox delivery, tracing, and production SLO operations.", "Remote APAC", "Mid-Senior", ["Prometheus", "Grafana", "Kafka", "AWS"])
  ],
  totalElements: 3,
  totalPages: 1,
  number: 0,
  size: 3
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
    }
  ],
  totalElements: 2,
  totalPages: 1,
  number: 0,
  size: 2
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
    }
  ],
  totalElements: 2,
  totalPages: 1,
  number: 0,
  size: 2
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
    }
  ],
  totalElements: 2,
  totalPages: 1,
  number: 0,
  size: 2
};

export const previewAuditLogs: PageResponse<AuditLog> = {
  content: [
    previewAudit("AI_TOOL_EXECUTED", "AI_ASSISTANT", "preview-ai"),
    previewAudit("APPROVE_JOB", "JOB", "preview-java-platform"),
    previewAudit("CHANGE_APPLICATION_STATUS", "APPLICATION", "preview-application-java"),
    previewAudit("APPROVE_COMPANY", "COMPANY", "preview-company-portfolio-labs")
  ],
  totalElements: 4,
  totalPages: 1,
  number: 0,
  size: 4
};

export const previewAiProviderStatus: AiProviderStatus = {
  provider: "anthropic",
  model: "claude-haiku-4-5-20251001",
  baseUrlHost: "api.anthropic.com",
  anthropicVersion: "2023-06-01",
  maxTokens: 900,
  apiKeyConfigured: false,
  demoFallbackEnabled: true,
  mode: "FALLBACK",
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
