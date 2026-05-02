import { getSession } from "@/lib/session";
import type {
  Application,
  AuditLog,
  AuthResponse,
  Company,
  Job,
  Notification,
  PageResponse,
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
  notifications: () => request<PageResponse<Notification>>("/api/notifications"),
  readAllNotifications: () => request<Notification[]>("/api/notifications/read-all", { method: "PATCH" }),
  companies: () => request<PageResponse<Company>>("/api/companies"),
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
  approveJob: (id: string) => request<Job>(`/api/admin/jobs/${id}/approve`, { method: "PATCH" }),
  applicationsForJob: (jobId: string) =>
    request<PageResponse<Application>>(`/api/employer/jobs/${jobId}/applications`),
  updateApplicationStatus: (id: string, status: string) =>
    request<Application>(`/api/applications/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    }),
  auditLogs: () => request<PageResponse<AuditLog>>("/api/admin/audit-logs")
};
