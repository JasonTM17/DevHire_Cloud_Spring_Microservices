import { StatusPill } from "@/components/StatusPill";
import type { CandidateOffer } from "@/types/domain";

export function OfferCard({ offer }: { offer: CandidateOffer }) {
  return (
    <article className="job-card">
      <div className="job-card-top">
        <div>
          <h2>{offer.jobTitle}</h2>
          <span className="muted">{offer.companyName}</span>
        </div>
        <StatusPill value={offer.status} />
      </div>
      <p>{offer.compensation}</p>
      <div className="tag-row">
        {offer.highlights.map((item) => (
          <span className="tag" key={item}>
            {item}
          </span>
        ))}
      </div>
      <span className="muted">
        Decision deadline {offer.expiresAt ? new Date(offer.expiresAt).toLocaleDateString() : "to be scheduled"}
      </span>
    </article>
  );
}
