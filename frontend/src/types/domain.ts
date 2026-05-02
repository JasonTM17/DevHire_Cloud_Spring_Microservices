export type UserRole = "ADMIN" | "EMPLOYER" | "CANDIDATE";

export type AuthResponse = {
  userId: string;
  email: string;
  role: UserRole;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
};

export type CurrentUser = {
  id: string;
  email: string;
  role: UserRole;
};

export type Job = {
  id: string;
  companyId: string;
  employerId: string;
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
  status: string;
  rejectionReason?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type Company = {
  id: string;
  employerId: string;
  name: string;
  slug: string;
  logoUrl?: string;
  website?: string;
  size?: string;
  industry?: string;
  description?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string;
};

export type Application = {
  id: string;
  jobId: string;
  candidateId: string;
  employerId: string;
  status: string;
  cvUrl?: string;
  coverLetter?: string;
  createdAt: string;
  updatedAt: string;
};

export type Notification = {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  readAt?: string;
  emailStatus?: string;
  emailRecipient?: string;
  emailSentAt?: string;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};
