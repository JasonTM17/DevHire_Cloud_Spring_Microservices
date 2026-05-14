"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Briefcase, Clock, Calendar, Building2, Users, ExternalLink } from "lucide-react";
import { SkillTag } from "@/components/ui/SkillTag";
import { JobCard } from "@/components/JobCard";
import { api } from "@/lib/api";
import { getSession } from "@/lib/session";
import { formatSalaryRange } from "@/lib/salaryFormat";
import type { Job, Company } from "@/types/domain";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getCompanyInitial(name?: string): string {
  return name ? name.charAt(0).toUpperCase() : "C";
}

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [similarJobs, setSimilarJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // Application modal state
  const [showModal, setShowModal] = useState(false);
  const [cvUrl, setCvUrl] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const jobData = await api.job(params.id);
        setJob(jobData);

        // Fetch company info
        try {
          const companiesRes = await api.companies();
          const found = companiesRes.content.find((c) => c.id === jobData.companyId);
          if (found) setCompany(found);
        } catch {
          // Company fetch is optional
        }

        // Fetch similar jobs (same skills)
        try {
          const allJobsRes = await api.jobs(new URLSearchParams({ size: "50" }));
          const similar = allJobsRes.content
            .filter(
              (j) =>
                j.id !== jobData.id &&
                j.status === "PUBLISHED" &&
                j.skills.some((s) => jobData.skills.includes(s))
            )
            .slice(0, 4);
          setSimilarJobs(similar);
        } catch {
          // Similar jobs fetch is optional
        }
      } catch {
        setJob(null);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [params.id]);

  function handleApplyClick() {
    const session = getSession();
    if (!session?.accessToken) {
      router.push(`/login?returnUrl=${encodeURIComponent(`/jobs/${params.id}`)}`);
      return;
    }
    setShowModal(true);
    setMessage("");
    setCvUrl("");
    setCoverLetter("");
  }

  async function handleSubmitApplication() {
    const trimmedCv = cvUrl.trim();
    if (!trimmedCv) {
      setMessageTone("error");
      setMessage("Vui lòng nhập đường dẫn CV của bạn.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      await api.apply(params.id, trimmedCv, coverLetter.trim());
      setMessageTone("success");
      setMessage("Ứng tuyển thành công! Nhà tuyển dụng sẽ liên hệ bạn sớm.");
      setTimeout(() => setShowModal(false), 2000);
    } catch (ex) {
      setMessageTone("error");
      const msg = ex instanceof Error ? ex.message : "Có lỗi xảy ra. Vui lòng thử lại.";
      if (msg.toLowerCase().includes("already")) {
        setMessage("Bạn đã ứng tuyển vị trí này rồi.");
      } else {
        setMessage(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="job-detail-page__loading">
        <span>Đang tải thông tin việc làm...</span>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="job-detail-page__loading">
        <span>Không tìm thấy việc làm này.</span>
      </div>
    );
  }

  const isExpired = job.status !== "PUBLISHED";
  const postedDate = job.publishedAt || job.createdAt;

  return (
    <div className="job-detail-page" data-testid="job-detail-page">
      {/* Main Content */}
      <div className="job-detail-page__main">
        {/* Expired Banner */}
        {isExpired && (
          <div className="job-detail-page__expired">
            Việc làm này đã hết hạn
          </div>
        )}

        {/* Job Header */}
        <div className="job-detail-page__header">
          <h1 className="job-detail-page__title">{job.title}</h1>
          <div className="job-detail-page__salary">
            {formatSalaryRange(job.salaryMin, job.salaryMax)}
          </div>
          <div className="job-detail-page__meta">
            {job.location && (
              <span className="job-detail-page__meta-item">
                <MapPin size={14} />
                {job.location}
              </span>
            )}
            {job.level && (
              <span className="job-detail-page__meta-item">
                <Briefcase size={14} />
                {job.level}
              </span>
            )}
            {job.type && (
              <span className="job-detail-page__meta-item">
                <Clock size={14} />
                {job.type}
              </span>
            )}
            <span className="job-detail-page__meta-item">
              <Calendar size={14} />
              {formatDate(postedDate)}
            </span>
          </div>
          <div className="job-detail-page__skills">
            {job.skills.map((skill) => (
              <SkillTag key={skill} skill={skill} />
            ))}
          </div>
        </div>

        {/* Description */}
        {job.description && (
          <div className="job-detail-page__section">
            <h2>Mô tả công việc</h2>
            <div className="job-detail-page__section-content">
              {job.description}
            </div>
          </div>
        )}

        {/* Requirements */}
        {job.requirements && (
          <div className="job-detail-page__section">
            <h2>Yêu cầu ứng viên</h2>
            <div className="job-detail-page__section-content">
              {job.requirements}
            </div>
          </div>
        )}

        {/* Benefits */}
        {job.benefits && (
          <div className="job-detail-page__section">
            <h2>Quyền lợi</h2>
            <div className="job-detail-page__section-content">
              {job.benefits}
            </div>
          </div>
        )}

        {/* Similar Jobs */}
        {similarJobs.length > 0 && (
          <div className="job-detail-page__similar">
            <h2>Việc làm tương tự</h2>
            <div className="job-detail-page__similar-grid">
              {similarJobs.map((sJob) => (
                <JobCard key={sJob.id} job={sJob} />
              ))}
            </div>
          </div>
        )}

        {/* Sticky Apply Button (mobile-friendly) */}
        {!isExpired && (
          <button
            className="job-detail-page__apply-btn"
            onClick={handleApplyClick}
            type="button"
          >
            Ứng tuyển ngay
          </button>
        )}
      </div>

      {/* Sidebar */}
      <aside className="job-detail-page__sidebar">
        <div className="job-detail-page__company-card">
          <div className="job-detail-page__company-logo">
            {company?.logoUrl ? (
              <Image src={company.logoUrl} alt={company.name} width={64} height={64} unoptimized />
            ) : (
              <span>{getCompanyInitial(company?.name)}</span>
            )}
          </div>
          <div className="job-detail-page__company-name">
            {company?.name || "Công ty"}
          </div>
          <div className="job-detail-page__company-info">
            {company?.industry && (
              <span>
                <Building2 size={14} style={{ display: "inline", marginRight: 4 }} />
                {company.industry}
              </span>
            )}
            {company?.size && (
              <span>
                <Users size={14} style={{ display: "inline", marginRight: 4 }} />
                {company.size}
              </span>
            )}
          </div>
          {company?.slug && (
            <Link
              href={`/companies/${company.slug}`}
              className="job-detail-page__company-link"
            >
              <ExternalLink size={14} />
              Xem công ty
            </Link>
          )}
        </div>

        {/* Sidebar Apply Button */}
        {!isExpired && (
          <button
            className="job-detail-page__apply-btn"
            onClick={handleApplyClick}
            type="button"
            style={{ marginTop: "var(--space-4)" }}
          >
            Ứng tuyển ngay
          </button>
        )}
      </aside>

      {/* Application Modal */}
      {showModal && (
        <div
          className="job-detail-page__modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="job-detail-page__modal">
            <h2>Ứng tuyển - {job.title}</h2>

            <div className="job-detail-page__modal-field">
              <label htmlFor="cv-url">Đường dẫn CV (URL)</label>
              <input
                id="cv-url"
                type="url"
                placeholder="https://example.com/cv.pdf"
                value={cvUrl}
                onChange={(e) => setCvUrl(e.target.value)}
              />
            </div>

            <div className="job-detail-page__modal-field">
              <label htmlFor="cover-letter">Thư giới thiệu</label>
              <textarea
                id="cover-letter"
                placeholder="Giới thiệu bản thân và lý do bạn phù hợp với vị trí này..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
            </div>

            {message && (
              <div
                className={`job-detail-page__modal-message job-detail-page__modal-message--${messageTone}`}
              >
                {message}
              </div>
            )}

            <div className="job-detail-page__modal-actions">
              <button
                className="job-detail-page__modal-cancel"
                onClick={() => setShowModal(false)}
                type="button"
              >
                Hủy
              </button>
              <button
                className="job-detail-page__modal-submit"
                onClick={handleSubmitApplication}
                disabled={submitting}
                type="button"
              >
                {submitting ? "Đang gửi..." : "Gửi ứng tuyển"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
