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

export type UserProfile = {
  userId: string;
  email: string;
  role: UserRole;
  name?: string;
  title?: string;
  skills?: string[];
  experience?: string;
  education?: string;
  expectedSalary?: number;
  companyPosition?: string;
  contactInfo?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
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

export type AiCitation = {
  title: string;
  sourceType: string;
  sourcePath: string;
  snippet: string;
};

export type AiToolTrace = {
  name: string;
  status: string;
  summary: string;
};

export type AiChatResponse = {
  conversationId: string;
  answer: string;
  citations: AiCitation[];
  toolTraces: AiToolTrace[];
  model: string;
  fallback: boolean;
  createdAt: string;
};

export type AiProviderStatus = {
  provider: string;
  model: string;
  baseUrlHost: string;
  anthropicVersion: string;
  maxTokens: number;
  apiKeyConfigured: boolean;
  demoFallbackEnabled: boolean;
  mode: string;
  circuitBreakerState: "OPEN" | "CLOSED";
  consecutiveFailures: number;
  circuitOpenUntil?: string;
  lastFailureAt?: string;
  lastFailureReason?: string;
  checkedAt: string;
};

export type AiReindexResponse = {
  documents: number;
  chunks: number;
};

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export type StatusCount = {
  status: string;
  count: number;
};

export type CandidateTimelineItem = {
  applicationId: string;
  title: string;
  status: string;
  description: string;
  occurredAt: string;
};

export type CandidateDashboardSummary = {
  applications: number;
  activeApplications: number;
  interviews: number;
  offers: number;
  statusDistribution: StatusCount[];
  timeline: CandidateTimelineItem[];
};

export type CandidateApplicationsSummary = {
  totalApplications: number;
  duplicateProtectedJobs: number;
  statusDistribution: StatusCount[];
  recentActivity: CandidateTimelineItem[];
};

export type CandidateOffer = {
  id: string;
  applicationId: string;
  jobTitle: string;
  companyName: string;
  compensation: string;
  status: string;
  highlights: string[];
  expiresAt?: string;
  createdAt: string;
};

export type CandidateAssessment = {
  id: string;
  title: string;
  provider: string;
  score: number;
  maxScore: number;
  status: string;
  skills: string[];
  completedAt?: string;
};

export type RubricScore = {
  category: string;
  score: number;
  maxScore: number;
  evidence: string;
};

export type CodeIntegrityEvent = {
  type: string;
  count: number;
  metadata?: string;
};

export type CodeTestCase = {
  id: string;
  name: string;
  visibility: "VISIBLE" | "HIDDEN";
  input: string;
  weight: number;
};

export type CodeRunCaseResult = {
  caseId: string;
  name: string;
  visibility: "VISIBLE" | "HIDDEN";
  passed: boolean;
  verdict: string;
  output?: string;
  stdout?: string;
  stderr?: string;
  compileOutput?: string;
  error?: string;
  executionTimeMs: number;
  memoryKb: number;
  timeLimitMs: number;
  memoryLimitKb: number;
};

export type CodeRun = {
  id: string;
  status: string;
  sandboxStatus: string;
  verdict: string;
  visiblePassed: number;
  visibleTotal: number;
  hiddenPassed: number;
  hiddenTotal: number;
  executionTimeMs: number;
  memoryKb: number;
  failureReason?: string;
  compileOutput?: string;
  stdout?: string;
  stderr?: string;
  timeLimitMs: number;
  memoryLimitKb: number;
  runnerVersion?: string;
  integrityRiskScore: number;
  similarityScore: number;
  results: CodeRunCaseResult[];
  createdAt: string;
  completedAt?: string;
};

export type CodeAssessment = {
  id: string;
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  challengeTitle: string;
  challengeVersion: number;
  level: string;
  language: string;
  prompt: string;
  constraints: string;
  starterCode: string;
  status: string;
  maxScore: number;
  latestScore?: number;
  latestDecision?: string;
  skills: string[];
  rubric: RubricScore[];
  riskFlags: string[];
  feedback?: string;
  aiFeedbackFallback: boolean;
  submittedCode?: string;
  attemptNumber?: number;
  codeHash?: string;
  graderVersion?: string;
  rubricVersion?: string;
  submittedCodePreview?: string;
  hasSubmittedCode: boolean;
  visibleTestCases?: CodeTestCase[];
  latestRun?: CodeRun;
  integrityRiskScore?: number;
  similarityScore?: number;
  sandboxStatus?: string;
  dueAt: string;
  assignedAt: string;
  submittedAt?: string;
};

export type CodeSubmissionSummary = {
  id: string;
  assignmentId: string;
  runId?: string;
  language: string;
  finalScore?: number;
  decision?: string;
  rubric: RubricScore[];
  riskFlags: string[];
  feedback?: string;
  attemptNumber?: number;
  codeHash?: string;
  graderVersion?: string;
  rubricVersion?: string;
  submittedCode?: string;
  submittedCodePreview?: string;
  hasSubmittedCode: boolean;
  verdict?: string;
  visiblePassed: number;
  visibleTotal: number;
  hiddenPassed: number;
  hiddenTotal: number;
  executionTimeMs: number;
  memoryKb: number;
  submittedAt: string;
};

export type CodeChallenge = {
  id: string;
  slug: string;
  title: string;
  version: number;
  level: string;
  language: string;
  prompt: string;
  constraints: string;
  starterCode: string;
  skills: string[];
  requiredSignals: string[];
  maxScore: number;
  active: boolean;
  referenceSolution?: string;
  visibleCaseCount: number;
  hiddenCaseCount: number;
  testCases: CodeChallengeTestCase[];
  createdAt: string;
};

export type CodeChallengeTestCase = {
  id?: string;
  name: string;
  visibility: "VISIBLE" | "HIDDEN" | string;
  stdin: string;
  expectedOutput: string;
  weight: number;
  ordinal: number;
  setupSql?: string;
  expectedRowsJson?: string;
};

export type CodeAssessmentRunnerHealth = {
  status: string;
  mode: string;
  runnerVersion: string;
  judge0Configured: boolean;
  failClosed: boolean;
  networkDisabled: boolean;
  queueDepth: number;
  failClosedReason?: string;
  checkedAt: string;
  lastSmokeAt?: string;
  lastSmokeStatus?: string;
  lastSmokeMessage?: string;
};

export type CodeAssessmentSummary = {
  totalAssignments: number;
  submitted: number;
  autoReviewed: number;
  employerReviewed: number;
  passed: number;
  failed: number;
  averageScore: number;
  riskySubmissions: number;
  runQueueDepth: number;
  sandboxFailureRate: number;
  acceptedRate: number;
  wrongAnswerRate: number;
  compileErrorRate: number;
  timeoutRate: number;
  runnerUnavailableRate: number;
  policyBlockedRate: number;
  averageRuntimeMs: number;
  p95ExecutionMs: number;
  averageIntegrityRisk: number;
  averageSimilarityScore: number;
  statusDistribution: StatusCount[];
  runnerHealth: CodeAssessmentRunnerHealth;
};

export type EmployerPipelineSummary = {
  totalApplications: number;
  activeCandidates: number;
  interviewReady: number;
  offers: number;
  statusDistribution: StatusCount[];
  recentActivity: CandidateTimelineItem[];
};

export type SkillDemand = {
  skill: string;
  jobs: number;
};

export type LocationDemand = {
  location: string;
  jobs: number;
};

export type LevelDemand = {
  level: string;
  jobs: number;
};

export type SkillAnalytics = {
  publishedJobs: number;
  averageSalaryMin: number;
  averageSalaryMax: number;
  topSkills: SkillDemand[];
  topLocations: LocationDemand[];
  levelDistribution: LevelDemand[];
};

export type RoadmapMilestone = {
  title: string;
  status: string;
  evidence: string;
  nextAction: string;
};

export type CandidateRoadmap = {
  title: string;
  currentTrack: string;
  readinessScore: number;
  milestones: RoadmapMilestone[];
  recommendedPrompts: string[];
};

export type InterviewPrep = {
  conversationId: string;
  title: string;
  model: string;
  fallback: boolean;
  lastMessageAt: string;
  focusAreas: string[];
};

export type OperationsSummary = {
  auditEvents: number;
  distinctActors: number;
  latestEventAt?: string;
  topActions: { label: string; count: number }[];
  actorRoles: { label: string; count: number }[];
};
