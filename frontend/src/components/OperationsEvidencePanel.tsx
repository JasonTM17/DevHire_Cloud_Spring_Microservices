import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";

export type OperationsEvidenceItem = {
  label: string;
  status: string;
  source: string;
  displaySource?: string;
  ownerAction?: string;
  href?: string;
};

type OperationsEvidencePanelProps = {
  title: string;
  items: OperationsEvidenceItem[];
};

export function OperationsEvidencePanel({ title, items }: OperationsEvidencePanelProps) {
  return (
    <div className="panel">
      <div className="section-title">
        <FileCheck2 size={20} />
        <h2>{title}</h2>
      </div>
      <div className="table-list">
        {items.map((item) => (
          <div className="table-row" key={item.label}>
            <span>
              <strong>{item.label}</strong>
              <small title={item.source}>{item.displaySource ?? item.source}</small>
              {item.ownerAction ? <small className="evidence-owner">Owner action: {item.ownerAction}</small> : null}
            </span>
            {item.href ? (
              <Link className="button ghost" href={item.href}>
                <StatusPill value={item.status} />
              </Link>
            ) : (
              <StatusPill value={item.status} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
