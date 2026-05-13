"use client";

import { useEffect, useState } from "react";
import { Activity, Gauge, RadioTower, ScrollText } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { OperationsEvidencePanel } from "@/components/OperationsEvidencePanel";
import { api } from "@/lib/api";
import { previewOperationsSummary } from "@/lib/previewData";
import type { OperationsSummary } from "@/types/domain";

const RUNBOOKS = [
  "Gateway 5xx spike",
  "Outbox backlog",
  "Kafka consumer lag",
  "AI provider backup spike",
];

export default function PlatformObservabilityPage() {
  const [summary, setSummary] = useState<OperationsSummary>(previewOperationsSummary);
  const [source, setSource] = useState<"live" | "preview">("preview");

  useEffect(() => {
    let cancelled = false;

    api.operationsSummary()
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
          setSource("live");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(previewOperationsSummary);
          setSource("preview");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="page-stack" data-testid="platform-observability-page">
      <div className="hero-strip">
        <div>
          <p className="eyebrow">Observability & event streaming</p>
          <h1>Runtime operations cockpit</h1>
          <p>Domain KPIs, audit events, SLO targets, and runbook ownership in one operations view.</p>
        </div>
        <div className="hero-actions">
          <span className="badge live">{source === "live" ? "Live API" : "Preview data"}</span>
          <span className="badge">Grafana SLO</span>
        </div>
      </div>

      <div className="metrics-row">
        <MetricCard
          icon={ScrollText}
          label="Audit events"
          value={summary.auditEvents}
          helper="Event-driven evidence"
        />
        <MetricCard
          icon={Activity}
          label="Actors"
          value={summary.distinctActors}
          helper="Distinct platform users"
        />
        <MetricCard
          icon={RadioTower}
          label="Outbox"
          value="Scripted"
          helper="Backlog checks run in release smoke"
        />
        <MetricCard
          icon={Gauge}
          label="Gateway p95"
          value="SLO"
          helper="Tracked by Prometheus and Grafana"
        />
      </div>

      <div className="split-grid">
        <div className="panel">
          <h2>Top audit actions</h2>
          <div className="insight-list compact">
            {summary.topActions.map((item) => (
              <div className="insight-line" key={item.label}>
                <span>{item.label.toLowerCase().replaceAll("_", " ")}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Runbook map</h2>
          <div className="table-list">
            {RUNBOOKS.map((item) => (
              <div className="table-row" key={item}>
                <strong>{item}</strong>
                <span className="badge">Runbook linked</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <OperationsEvidencePanel
        title="Runtime observability evidence"
        items={[
          {
            label: "Domain metrics verification",
            status: "SCRIPTED",
            source: "scripts/runtime-observability-smoke.ps1",
            displaySource: "runtime observability verification script",
            ownerAction: "Platform ops reruns before release approval"
          },
          {
            label: "SLO rules",
            status: "CATALOGED",
            source: "infra/prometheus/rules/devhire-slo.yml",
            ownerAction: "SRE reviews burn-rate thresholds"
          },
          {
            label: "Grafana dashboard",
            status: "PROVISIONED",
            source: "infra/grafana/dashboards/devhire-slo-overview.json",
            ownerAction: "On-call checks panels after deploy"
          },
          {
            label: "Operations runbooks",
            status: "LINKED",
            source: "docs/runbooks/",
            ownerAction: "Incident commander follows linked playbook"
          }
        ]}
      />
    </section>
  );
}
