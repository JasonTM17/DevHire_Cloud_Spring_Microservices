"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, CalendarClock, FileCheck2 } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/lib/api";
import { previewCandidateOffers } from "@/lib/previewData";
import type { CandidateOffer } from "@/types/domain";

export default function CandidateOffersPage() {
  const [offers, setOffers] = useState<CandidateOffer[]>(previewCandidateOffers);

  useEffect(() => {
    api.candidateOffers().then(setOffers).catch(() => setOffers(previewCandidateOffers));
  }, []);

  const activeOffers = offers.filter((item) => ["SENT", "ACCEPTED"].includes(item.status)).length;

  return (
    <section className="page-stack" data-testid="candidate-offers-page">
      <div className="hero-strip">
        <div>
          <p className="eyebrow">Offer letter</p>
          <h1>Offer review and confirmation</h1>
          <p>Review compensation, decision deadlines, and role highlights before confirming the next step.</p>
        </div>
        <div className="hero-actions">
          <span className="badge live">Candidate-owned view</span>
          <span className="badge">Application-service read model</span>
        </div>
      </div>
      <div className="metrics-row">
        <MetricCard icon={FileCheck2} label="Offers" value={offers.length} helper="Offer records" />
        <MetricCard icon={BadgeCheck} label="Active" value={activeOffers} helper="Ready for decision" />
        <MetricCard icon={CalendarClock} label="Review SLA" value="7d" helper="Typical response window" />
      </div>
      <div className="job-grid">
        {offers.map((offer) => (
          <article className="job-card" key={offer.id}>
            <div className="job-card-top">
              <div>
                <h2>{offer.jobTitle}</h2>
                <span className="muted">{offer.companyName}</span>
              </div>
              <StatusPill value={offer.status} />
            </div>
            <p>{offer.compensation}</p>
            <div className="tag-row">
              {offer.highlights.map((item) => <span className="tag" key={item}>{item}</span>)}
            </div>
            <span className="muted">
              Decision deadline {offer.expiresAt ? new Date(offer.expiresAt).toLocaleDateString() : "to be scheduled"}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
