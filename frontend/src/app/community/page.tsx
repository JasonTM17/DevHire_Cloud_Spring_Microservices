import Link from "next/link";
import { BookOpen, Bot, Cloud, UsersRound } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";

const tracks = [
  "Java microservices architecture reviews",
  "Kafka outbox and idempotency failure stories",
  "AWS EKS/RDS/MSK/OpenSearch apply-readiness drills",
  "Observability, SLOs, and incident response practice"
];

export default function CommunityPage() {
  return (
    <section className="page-stack" data-testid="community-page">
      <div className="hero-strip">
        <div>
          <p className="eyebrow">Engineering community</p>
          <h1>Cloud backend interview lab</h1>
          <p>A curated client-facing hub for learning paths, reviewer proof, and production engineering practice.</p>
        </div>
        <div className="hero-actions">
          <Link className="button primary" href="/candidate/interview-prep">
            <Bot size={16} />
            Start practice
          </Link>
        </div>
      </div>
      <div className="metrics-row">
        <MetricCard icon={UsersRound} label="Tracks" value={tracks.length} helper="Portfolio learning paths" />
        <MetricCard icon={Cloud} label="Cloud focus" value="AWS" helper="Blueprint-ready" />
        <MetricCard icon={BookOpen} label="Evidence" value="v0.6" helper="Reviewer-grade docs" />
      </div>
      <div className="job-grid">
        {tracks.map((track) => (
          <article className="job-card" key={track}>
            <h2>{track}</h2>
            <p>Practice with deterministic data, production runbooks, and Claude-backed interview prompts.</p>
            <Link className="button outline" href="/candidate/roadmap">Open roadmap</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
