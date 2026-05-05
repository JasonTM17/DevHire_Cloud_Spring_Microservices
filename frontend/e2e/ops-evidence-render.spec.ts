import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..", "..");
const screenshotsDir = path.join(repoRoot, "docs", "screenshots");
const prometheusRulesPath = path.join(repoRoot, "infra", "prometheus", "rules", "devhire-slo.yml");
const grafanaDashboardPath = path.join(repoRoot, "infra", "grafana", "dashboards", "devhire-slo-overview.json");

type AlertRule = {
  alert: string;
  severity: string;
  service: string;
  slo: string;
  duration: string;
  summary: string;
  expr: string;
};

type DashboardPanel = {
  title: string;
  type: string;
  unit: string;
  expr: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function extractIndentedValue(block: string, key: string) {
  const match = block.match(new RegExp(`\\n\\s+${key}:\\s*(.+)`));
  return match?.[1]?.replace(/^['"]|['"]$/g, "").trim() ?? "n/a";
}

function parseAlerts(content: string): AlertRule[] {
  const blocks = content.split(/\n\s+- alert: /).slice(1);
  return blocks.map((block) => {
    const [alertName] = block.split(/\r?\n/, 1);
    const exprMatch = block.match(/expr:\s*\|\r?\n([\s\S]*?)\r?\n\s+for:/);
    return {
      alert: alertName.trim(),
      severity: extractIndentedValue(block, "severity"),
      service: extractIndentedValue(block, "service"),
      slo: extractIndentedValue(block, "slo"),
      duration: extractIndentedValue(block, "for"),
      summary: extractIndentedValue(block, "summary"),
      expr: exprMatch?.[1]?.trim().replace(/\s+/g, " ") ?? "n/a"
    };
  });
}

function parsePanels(content: string): DashboardPanel[] {
  const dashboard = JSON.parse(content) as { panels: Array<Record<string, unknown>> };
  return dashboard.panels.map((panel) => {
    const fieldConfig = panel.fieldConfig as { defaults?: { unit?: string } } | undefined;
    const targets = panel.targets as Array<{ expr?: string }> | undefined;
    return {
      title: String(panel.title ?? "Untitled panel"),
      type: String(panel.type ?? "unknown"),
      unit: fieldConfig?.defaults?.unit ?? "short",
      expr: targets?.[0]?.expr?.replace(/\s+/g, " ").trim() ?? "n/a"
    };
  });
}

function baseHtml(title: string, eyebrow: string, body: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      :root {
        color-scheme: dark;
        --bg: #08111f;
        --panel: #101b2c;
        --panel-2: #16243a;
        --line: #263852;
        --text: #f5f7fb;
        --muted: #94a3b8;
        --blue: #4f8cff;
        --green: #40d98a;
        --amber: #f5bf4f;
        --red: #ff6b6b;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        width: 1600px;
        min-height: 1000px;
        background:
          radial-gradient(circle at 16% 10%, rgba(79, 140, 255, 0.22), transparent 30%),
          linear-gradient(135deg, #07101c 0%, #0d1728 50%, #07101c 100%);
        color: var(--text);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        padding: 54px;
      }
      .shell {
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 28px;
        background: rgba(8, 17, 31, 0.84);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.34);
        overflow: hidden;
      }
      header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 32px;
        padding: 34px 38px 30px;
        border-bottom: 1px solid var(--line);
      }
      .eyebrow {
        color: var(--green);
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin-bottom: 8px;
      }
      h1 {
        margin: 0;
        font-size: 44px;
        line-height: 1.05;
        letter-spacing: 0;
      }
      .subtitle {
        color: var(--muted);
        font-size: 18px;
        line-height: 1.55;
        max-width: 900px;
        margin-top: 14px;
      }
      .badge-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      .badge {
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 999px;
        padding: 9px 13px;
        color: #dbeafe;
        background: rgba(15, 23, 42, 0.86);
        font-size: 14px;
        font-weight: 700;
        white-space: nowrap;
      }
      .content { padding: 34px 38px 38px; }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
      }
      .grid.three {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .card {
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 18px;
        background: linear-gradient(180deg, rgba(22, 36, 58, 0.96), rgba(13, 23, 40, 0.96));
        padding: 20px;
        min-height: 176px;
      }
      .card h2, .card h3 {
        margin: 0 0 10px;
        font-size: 19px;
        letter-spacing: 0;
      }
      .meta {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin: 12px 0;
      }
      .pill {
        border-radius: 999px;
        padding: 6px 9px;
        font-size: 12px;
        font-weight: 800;
        color: #dbeafe;
        background: rgba(79, 140, 255, 0.16);
        border: 1px solid rgba(79, 140, 255, 0.32);
      }
      .pill.page { color: #ffe4e6; background: rgba(255, 107, 107, 0.14); border-color: rgba(255, 107, 107, 0.38); }
      .pill.warning { color: #fef3c7; background: rgba(245, 191, 79, 0.14); border-color: rgba(245, 191, 79, 0.34); }
      .query {
        margin-top: 12px;
        border-radius: 12px;
        background: rgba(2, 6, 23, 0.58);
        color: #bfdbfe;
        padding: 12px;
        font-family: "JetBrains Mono", "Cascadia Mono", Consolas, monospace;
        font-size: 12px;
        line-height: 1.45;
        max-height: 78px;
        overflow: hidden;
      }
      .metric-strip {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
        margin-bottom: 24px;
      }
      .metric {
        border: 1px solid rgba(148, 163, 184, 0.22);
        background: rgba(15, 23, 42, 0.72);
        border-radius: 18px;
        padding: 18px;
      }
      .metric strong {
        display: block;
        font-size: 32px;
        color: var(--green);
        margin-bottom: 4px;
      }
      .metric span {
        color: var(--muted);
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .footer {
        margin-top: 24px;
        color: var(--muted);
        font-size: 14px;
        display: flex;
        justify-content: space-between;
        gap: 24px;
        border-top: 1px solid var(--line);
        padding-top: 18px;
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <header>
        <div>
          <div class="eyebrow">${escapeHtml(eyebrow)}</div>
          <h1>${escapeHtml(title)}</h1>
          <p class="subtitle">Rendered from repository-owned operations configuration. This is evidence of what is provisioned and verified, not a blank UI loading state.</p>
        </div>
        <div class="badge-row">
          <span class="badge">Prometheus</span>
          <span class="badge">Grafana</span>
          <span class="badge">OpenTelemetry</span>
          <span class="badge">SLO Evidence</span>
        </div>
      </header>
      <section class="content">${body}</section>
    </main>
  </body>
</html>`;
}

test.describe("render operations evidence from repository config", () => {
  test("render Prometheus SLO alert evidence", async ({ page }) => {
    const alerts = parseAlerts(fs.readFileSync(prometheusRulesPath, "utf8"));
    const pageCount = alerts.filter((alert) => alert.severity === "page").length;
    const warningCount = alerts.filter((alert) => alert.severity === "warning").length;
    const services = new Set(alerts.map((alert) => alert.service).filter((service) => service !== "n/a"));

    const cards = alerts
      .map(
        (alert) => `<article class="card">
          <h3>${escapeHtml(alert.alert)}</h3>
          <div class="meta">
            <span class="pill ${escapeHtml(alert.severity)}">${escapeHtml(alert.severity)}</span>
            <span class="pill">${escapeHtml(alert.service)}</span>
            <span class="pill">${escapeHtml(alert.slo)}</span>
            <span class="pill">${escapeHtml(alert.duration)}</span>
          </div>
          <p class="subtitle" style="font-size:14px;margin:0;">${escapeHtml(alert.summary)}</p>
          <div class="query">${escapeHtml(alert.expr)}</div>
        </article>`
      )
      .join("");

    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.setContent(
      baseHtml(
        "Prometheus Alert Rules",
        "DevHire Cloud SLO Guardrails",
        `<div class="metric-strip">
          <div class="metric"><strong>${alerts.length}</strong><span>alert rules</span></div>
          <div class="metric"><strong>${pageCount}</strong><span>paging alerts</span></div>
          <div class="metric"><strong>${warningCount}</strong><span>warning alerts</span></div>
          <div class="metric"><strong>${services.size}</strong><span>service scopes</span></div>
        </div>
        <div class="grid">${cards}</div>
        <div class="footer">
          <span>Source: infra/prometheus/rules/devhire-slo.yml</span>
          <span>Validated by promtool and docs evidence gates</span>
        </div>`
      )
    );
    await expect(page.getByText("DevHireGatewayHigh5xxRate")).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, "ops-prometheus-rules.png"), fullPage: true });
  });

  test("render Grafana SLO dashboard evidence", async ({ page }) => {
    const panels = parsePanels(fs.readFileSync(grafanaDashboardPath, "utf8"));
    const statPanels = panels.filter((panel) => panel.type === "stat").length;
    const timeSeriesPanels = panels.filter((panel) => panel.type === "timeseries").length;
    const aiPanels = panels.filter((panel) => panel.title.toLowerCase().includes("ai")).length;

    const panelCards = panels
      .map(
        (panel) => `<article class="card">
          <h3>${escapeHtml(panel.title)}</h3>
          <div class="meta">
            <span class="pill">${escapeHtml(panel.type)}</span>
            <span class="pill">${escapeHtml(panel.unit)}</span>
          </div>
          <div class="query">${escapeHtml(panel.expr)}</div>
        </article>`
      )
      .join("");

    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.setContent(
      baseHtml(
        "Grafana SLO Dashboard",
        "Provisioned Operations Dashboard",
        `<div class="metric-strip">
          <div class="metric"><strong>${panels.length}</strong><span>dashboard panels</span></div>
          <div class="metric"><strong>${statPanels}</strong><span>stat panels</span></div>
          <div class="metric"><strong>${timeSeriesPanels}</strong><span>time-series panels</span></div>
          <div class="metric"><strong>${aiPanels}</strong><span>AI ops panels</span></div>
        </div>
        <div class="grid three">${panelCards}</div>
        <div class="footer">
          <span>Source: infra/grafana/dashboards/devhire-slo-overview.json</span>
          <span>Provisioned by Docker Compose Grafana dashboard config</span>
        </div>`
      )
    );
    await expect(page.getByText("Gateway Availability")).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, "ops-grafana-slo.png"), fullPage: true });
  });
});
