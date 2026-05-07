import { getSession } from "@/lib/session";
import type {
  Application,
  AiChatResponse,
  AiProviderStatus,
  AiReindexResponse,
  AuditLog,
  AuthResponse,
  CandidateApplicationsSummary,
  CandidateAssessment,
  CodeAssessment,
  CodeAssessmentSummary,
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
  SkillAnalytics,
  UserProfile,
  UserRole
} from "@/types/domain";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

type ApiEnvelope<T> = {
  timestamp: string;
  success: boolean;
  data: T;
};

type RegisterPayload = {
  email: string;
  password: string;
  role: UserRole;
};

type LoginPayload = {
  email: string;
  password: string;
};

type CompanyPayload = {
  name: string;
  website?: string;
  size?: string;
  industry?: string;
  description?: string;
};

type JobPayload = {
  companyId: string;
  title: string;
  description: string;
  requirements?: string;
  benefits?: string;
  salaryMin?: number;
  salaryMax?: number;
  location?: string;
  level?: string;
  type?: string;
  skills: string[];
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getSession();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers
  });
  if (response.status === 204) {
    return undefined as T;
  }
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message ?? `Request failed with ${response.status}`);
  }
  return (body as ApiEnvelope<T>).data;
}

export const api = {
  baseUrl: API_BASE_URL,
  register: (payload: RegisterPayload) =>
    request<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: LoginPayload) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/api/auth/me"),
  jobs: (params: URLSearchParams) => request<PageResponse<Job>>(`/api/jobs?${params}`),
  job: (id: string) => request<Job>(`/api/jobs/${id}`),
  apply: (jobId: string, cvUrl: string, coverLetter: string) =>
    request<Application>(`/api/jobs/${jobId}/applications`, {
      method: "POST",
      body: JSON.stringify({ cvUrl, coverLetter })
    }),
  myApplications: () => request<PageResponse<Application>>("/api/applications/me"),
  candidateDashboardSummary: () => request<CandidateDashboardSummary>("/api/candidate/dashboard/summary"),
  candidateApplicationsSummary: () => request<CandidateApplicationsSummary>("/api/candidate/applications/summary"),
  candidateOffers: () => request<CandidateOffer[]>("/api/candidate/offers"),
  candidateAssessments: () => request<CandidateAssessment[]>("/api/candidate/assessments"),
  candidateCodeAssessments: () => request<CodeAssessment[]>("/api/candidate/code-assessments"),
  candidateCodeAssessment: (id: string) => request<CodeAssessment>(`/api/candidate/code-assessments/${id}`),
  submitCodeAssessment: (id: string, language: string, code: string, notes?: string) =>
    request<CodeAssessment>(`/api/candidate/code-assessments/${id}/submissions`, {
      method: "POST",
      body: JSON.stringify({ language, code, notes })
    }),
  candidateRoadmap: () => request<CandidateRoadmap>("/api/candidate/roadmap"),
  candidateInterviewPrep: () => request<InterviewPrep[]>("/api/candidate/interview-prep"),
  candidateSkillAnalytics: () => request<SkillAnalytics>("/api/candidate/skill-analytics"),
  notifications: () => request<PageResponse<Notification>>("/api/notifications"),
  readAllNotifications: () => request<Notification[]>("/api/notifications/read-all", { method: "PATCH" }),
  companies: () => request<PageResponse<Company>>("/api/companies"),
  adminCompanies: (status = "PENDING") => request<PageResponse<Company>>(`/api/companies?status=${encodeURIComponent(status)}`),
  employerCompanies: () => request<PageResponse<Company>>("/api/employer/companies"),
  companyBySlug: (slug: string) => request<Company>(`/api/companies/slug/${encodeURIComponent(slug)}`),
  createCompany: (payload: CompanyPayload) =>
    request<Company>("/api/companies", { method: "POST", body: JSON.stringify(payload) }),
  approveCompany: (id: string) => request<Company>(`/api/admin/companies/${id}/approve`, { method: "PATCH" }),
  rejectCompany: (id: string, reason: string) =>
    request<Company>(`/api/admin/companies/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reason })
    }),
  createJob: (payload: JobPayload) =>
    request<Job>("/api/jobs", { method: "POST", body: JSON.stringify(payload) }),
  submitJobReview: (id: string) => request<Job>(`/api/jobs/${id}/submit-review`, { method: "PATCH" }),
  adminJobs: (status = "PENDING_REVIEW") => request<PageResponse<Job>>(`/api/admin/jobs?status=${encodeURIComponent(status)}`),
  approveJob: (id: string) => request<Job>(`/api/admin/jobs/${id}/approve`, { method: "PATCH" }),
  applicationsForJob: (jobId: string) =>
    request<PageResponse<Application>>(`/api/employer/jobs/${jobId}/applications`),
  employerPipelineSummary: () => request<EmployerPipelineSummary>("/api/employer/pipeline/summary"),
  employerCodeAssessments: (params = new URLSearchParams()) =>
    request<CodeAssessment[]>(`/api/employer/code-assessments${params.toString() ? `?${params}` : ""}`),
  employerCodeAssessment: (id: string) =>
    request<CodeAssessment>(`/api/employer/code-assessments/${id}`),
  reviewCodeAssessment: (id: string, decision: string, note: string, finalScore?: number) =>
    request<CodeAssessment>(`/api/employer/code-assessments/${id}/review`, {
      method: "PATCH",
      body: JSON.stringify({ decision, note, finalScore })
    }),
  userProfileMe: () => request<UserProfile>("/api/users/me"),
  updateApplicationStatus: (id: string, status: string) =>
    request<Application>(`/api/applications/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    }),
  auditLogs: () => request<PageResponse<AuditLog>>("/api/admin/audit-logs"),
  operationsSummary: () => request<OperationsSummary>("/api/admin/operations/summary"),
  codeAssessmentSummary: () => request<CodeAssessmentSummary>("/api/admin/code-assessments/summary"),
  aiProviderStatus: () => request<AiProviderStatus>("/api/admin/ai/provider/status"),
  reindexAiKnowledge: () =>
    request<AiReindexResponse>("/api/admin/ai/knowledge/reindex", { method: "POST" }),
  aiChat: (message: string, conversationId?: string) =>
    request<AiChatResponse>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, conversationId })
    })
};
