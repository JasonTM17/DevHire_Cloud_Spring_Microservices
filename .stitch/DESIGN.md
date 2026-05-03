---
name: DevHire Cloud Operations
colors:
  rail: "#0b1220"
  workspace: "#f4f7fb"
  panel: "#ffffff"
  border: "#d8e1ec"
  text: "#101828"
  muted: "#667085"
  primary: "#0f766e"
  secondary: "#2563eb"
  warning: "#f59e0b"
  insight: "#7c3aed"
radius:
  panel: "8px"
  control: "8px"
typography:
  family: "Inter, ui-sans-serif, system-ui"
  body: "14px"
  small: "13px"
  pageTitle: "30px"
---

# DevHire Cloud Operations Design System

DevHire Cloud should read as a production SaaS recruitment operations platform, not as a marketing landing page or classroom demo. The frontend uses a fixed dark navigation rail, a light operational workspace, compact cards, polished table rows, and status chips that make backend workflow states easy to scan.

## Principles

- Dense but breathable information architecture.
- No decorative blobs, oversized hero sections, or single-hue theme.
- Use compact buttons with icons for commands.
- Cards and panels use 8px radius maximum, 1px borders, and low-shadow hover states.
- Company imagery should use crisp logo marks with fallback initials.
- Production/DevOps credibility should be visible through small operational signals: API gateway, outbox, OpenSearch, Kafka, CI/CD, observability.

## Component Notes

- Navigation: dark rail `#0b1220`, active item with emerald indicator.
- Workspace: `#f4f7fb` page background, white panels.
- Primary action: emerald `#0f766e`.
- Secondary action: cobalt `#2563eb`.
- Status chips: small, high-contrast, semantic colors.
- Tables: fixed row rhythm, subtle background, clear right-aligned actions.
