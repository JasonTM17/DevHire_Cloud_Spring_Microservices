"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, BriefcaseBusiness, UserRoundCheck } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { api } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { UserProfile } from "@/types/domain";

const sampleProfile: UserProfile = {
  userId: "sample-candidate",
  email: "candidate@devhire.local",
  role: "CANDIDATE",
  name: "Linh Nguyen",
  title: "Senior Java Backend Engineer",
  skills: ["Java", "Spring Boot", "Kafka", "AWS", "OpenSearch"],
  experience: "7 years building production microservices, event-driven systems, and cloud reliability tooling.",
  education: "University of Science",
  expectedSalary: 5200
};

export default function CandidateProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(sampleProfile);
  const [profileMode, setProfileMode] = useState<"api" | "sample">("sample");

  useEffect(() => {
    if (!getSession()?.accessToken) {
      setProfile(sampleProfile);
      setProfileMode("sample");
      return;
    }
    api.userProfileMe()
      .then((value) => {
        setProfile({
          ...sampleProfile,
          ...value,
          name: value.name || sampleProfile.name,
          title: value.title || sampleProfile.title,
          skills: value.skills?.length ? value.skills : sampleProfile.skills,
          experience: value.experience || sampleProfile.experience,
          education: value.education || sampleProfile.education,
          expectedSalary: value.expectedSalary ?? sampleProfile.expectedSalary
        });
        setProfileMode("api");
      })
      .catch(() => {
        setProfile(sampleProfile);
        setProfileMode("sample");
      });
  }, []);

  return (
    <section className="page-stack" data-testid="candidate-profile-page">
      <div className="hero-strip">
        <div>
          <p className="eyebrow">My profile</p>
          <h1>{profile.name}</h1>
          <p>{profile.title}</p>
        </div>
        <div className="hero-actions">
          <span className={profileMode === "api" ? "badge live" : "badge"}>{profileMode === "api" ? "Live profile" : "Read-only sample"}</span>
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
