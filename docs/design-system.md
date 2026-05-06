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
- Production and DevOps credibility should be visible through small operational signals: API gateway, outbox, OpenSearch, Kafka, CI/CD, observability.

## Component Notes

- Navigation: dark rail `#0b1220`, active item with emerald indicator.
- Workspace: `#f4f7fb` page background, white panels.
- Primary action: emerald `#0f766e`.
- Secondary action: cobalt `#2563eb`.
- Status chips: small, high-contrast, semantic colors.
- Tables: fixed row rhythm, subtle background, clear right-aligned actions.

## v0.6 Stitch Redesign Direction

The v0.6 product surface follows the latest Stitch project `projects/5421325194779586117`.
The canvas now separates three product regions:

- Admin/Ops: dense control-plane views for operations, pipelines, observability, cloud, releases, and AI operations.
- Employer/Company: company profile and hiring pipeline workflows.
- Client/Candidate: mobile-first candidate flows for job discovery, applications, profile, assessments, offers, interview prep, career roadmap, skill analytics, and community.

Candidate screens should feel guided and focused. Admin and platform screens should stay compact, operational, and evidence-heavy. Primary portfolio screenshots must not show raw IDs, `UNKNOWN`, loading-only panels, fallback/offline warnings, or smoke labels.

## Repository Facade Decision

This document used to live under `.stitch/DESIGN.md`. It is now a normal portfolio document under `docs/` so the GitHub root presents as an engineering repository rather than a tool workspace export.
