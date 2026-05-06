"use client";

import { BadgeCheck, BriefcaseBusiness, UserRoundCheck } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";

type Profile = {
  name?: string;
  title?: string;
  skills?: string[];
  experience?: string;
  education?: string;
  expectedSalary?: number;
  avatarUrl?: string;
};

export default function CandidateProfilePage() {
  const profile: Profile = {
    name: "Linh Nguyen",
    title: "Senior Java Backend Engineer",
    skills: ["Java", "Spring Boot", "Kafka", "AWS", "OpenSearch"],
    experience: "7 years building production microservices, event-driven systems, and cloud reliability tooling.",
    education: "University of Science",
    expectedSalary: 5200
  };

  return (
    <section className="page-stack" data-testid="candidate-profile-page">
      <div className="hero-strip">
        <div>
          <p className="eyebrow">My profile</p>
          <h1>{profile.name}</h1>
          <p>{profile.title}</p>
        </div>
        <div className="hero-actions">
          <span className="badge live">Candidate profile</span>
          <span className="badge">Private by default</span>
        </div>
      </div>
      <div className="metrics-row">
        <MetricCard icon={UserRoundCheck} label="Role" value="Candidate" helper="RBAC scoped" />
        <MetricCard icon={BadgeCheck} label="Skills" value={profile.skills?.length ?? 0} helper="Search matching" />
        <MetricCard icon={BriefcaseBusiness} label="Target" value={`$${profile.expectedSalary ?? 0}`} helper="Expected monthly salary" />
      </div>
      <div className="split-grid">
        <div className="panel">
          <h2>Professional summary</h2>
          <p>{profile.experience}</p>
          <div className="tag-row">
            {(profile.skills ?? []).map((skill) => <span className="tag" key={skill}>{skill}</span>)}
          </div>
        </div>
        <div className="panel">
          <h2>Preferences</h2>
          <div className="insight-list compact">
            <div className="insight-line"><span>Education</span><strong>{profile.education}</strong></div>
            <div className="insight-line"><span>Work mode</span><strong>Remote / Hybrid</strong></div>
            <div className="insight-line"><span>Availability</span><strong>30 days</strong></div>
          </div>
        </div>
      </div>
    </section>
  );
}
