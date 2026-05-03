"use client";

import { useEffect, useState } from "react";
import { SendHorizonal } from "lucide-react";
import { useParams } from "next/navigation";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/lib/api";
import type { Job } from "@/types/domain";

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [cvUrl, setCvUrl] = useState("https://example.com/candidate-cv.pdf");
  const [coverLetter, setCoverLetter] = useState("I am interested in this role and available for interview.");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.job(params.id).then(setJob).catch((ex) => setMessage(ex instanceof Error ? ex.message : "Cannot load job"));
  }, [params.id]);

  async function apply() {
    setMessage("");
    try {
      await api.apply(params.id, cvUrl, coverLetter);
      setMessage("Application submitted.");
    } catch (ex) {
      setMessage(ex instanceof Error ? ex.message : "Cannot submit application");
    }
  }

  if (!job) {
    return <section className="panel">Loading job...</section>;
  }

  return (
    <section className="detail-layout" data-testid="job-detail-page">
      <article className="panel job-detail">
        <div className="job-card-top">
          <div className="company-mark large">{job.title.slice(0, 1)}</div>
          <StatusPill value={job.status} />
        </div>
        <h1>{job.title}</h1>
        <div className="job-meta">
          <span>{job.location}</span>
          <span>{job.level}</span>
          <span>{job.type}</span>
        </div>
        <h2>Description</h2>
        <p>{job.description}</p>
        <h2>Requirements</h2>
        <p>{job.requirements}</p>
        <h2>Benefits</h2>
        <p>{job.benefits}</p>
        <div className="tag-row">
          {job.skills.map((skill) => (
            <span className="tag" key={skill}>
              {skill}
            </span>
          ))}
        </div>
      </article>
      <aside className="panel apply-panel">
        <h2>Apply</h2>
        <label>
          CV URL
          <input value={cvUrl} onChange={(event) => setCvUrl(event.target.value)} />
        </label>
        <label>
          Cover letter
          <textarea value={coverLetter} onChange={(event) => setCoverLetter(event.target.value)} />
        </label>
        <button className="button primary" type="button" onClick={apply}>
          <SendHorizonal size={16} />
          Submit application
        </button>
        {message ? <p className={message.includes("submitted") ? "success" : "error"}>{message}</p> : null}
      </aside>
    </section>
  );
}
