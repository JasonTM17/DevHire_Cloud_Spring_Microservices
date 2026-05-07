import { StatusPill } from "@/components/StatusPill";
import type { CandidateTimelineItem } from "@/types/domain";

export function CandidateTimeline({ items }: { items: CandidateTimelineItem[] }) {
  if (items.length === 0) {
    return <div className="empty-state compact">No application movement recorded yet.</div>;
  }

  return (
    <div className="table-list">
      {items.map((item) => (
        <div className="table-row" key={`${item.applicationId}-${item.occurredAt}`}>
          <span>
            <strong>{item.title}</strong>
            <small>{item.description}</small>
          </span>
          <StatusPill value={item.status} />
        </div>
      ))}
    </div>
  );
}
