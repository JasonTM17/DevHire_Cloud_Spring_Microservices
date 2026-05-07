import type { StatusCount } from "@/types/domain";

export function StatusDistributionList({ items }: { items: StatusCount[] }) {
  if (items.length === 0) {
    return <div className="empty-state compact">No status movement recorded yet.</div>;
  }

  return (
    <div className="insight-list compact">
      {items.map(({ status, count }) => (
        <div className="insight-line" key={status}>
          <span>{humanStatus(status)}</span>
          <strong>{count}</strong>
        </div>
      ))}
    </div>
  );
}

function humanStatus(status: string) {
  return status.toLowerCase().replaceAll("_", " ");
}
