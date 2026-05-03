import type { Job, PageResponse } from "@/types/domain";

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
