---
name: DevHire Hybrid Recruitment Experience
colors:
  rail: "#0b1220"
  workspace: "#f4f7fb"
  panel: "#ffffff"
  border: "#d8e1ec"
  text: "#101828"
  muted: "#667085"
  client-primary: "#ED1B2F"
  client-primary-dark: "#A70F22"
  client-primary-soft: "#FFF0F1"
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

# DevHire Hybrid Recruitment Design System

DevHire Cloud has two intentional UI modes. Client-facing candidate/job discovery pages should feel like a polished Vietnamese IT job marketplace inspired by ITViec's clarity: search first, red call-to-action accents, salary/location/company prominence, and fast-scanning job cards. Employer, admin, and platform pages stay in the Stitch "Cloud Operations" control-plane style: dark rail, light workspace, dense evidence panels, compact tables, and operational metrics.

The product must not copy ITViec branding, assets, logos, or page layouts. The accepted direction is marketplace-inspired UX, not brand imitation.

## Principles

- Dense but breathable information architecture.
- Client pages prioritize search, filters, job cards, company credibility, salary clarity, and mobile readability.
- Ops pages prioritize control-plane density, runner health, evidence trails, and reviewer confidence.
- No decorative blobs, oversized marketing-only sections, or single-hue theme.
- Use compact buttons with icons for commands.
- Cards and panels use 8px radius maximum, 1px borders, and low-shadow hover states.
- Company imagery should use crisp logo marks with fallback initials.
- Production and DevOps credibility should be visible through small operational signals: API gateway, outbox, OpenSearch, Kafka, CI/CD, observability, assessment runner queue, sandbox failure rate, integrity risk, and similarity posture.

## Component Notes

- Client marketplace: red `#ED1B2F` primary actions, dark red `#A70F22` hero/header bands, white search surfaces, neutral job cards, and salary text in primary red.
- Navigation: dark rail `#0b1220`, active item with emerald indicator on employer/admin/platform routes.
- Workspace: `#f4f7fb` page background, white panels.
- Primary action: emerald `#0f766e`.
- Secondary action: cobalt `#2563eb`.
- Status chips: small, high-contrast, semantic colors.
- Tables: fixed row rhythm, subtle background, clear right-aligned actions.
- Reusable workflow components should carry the design language across routes: status distributions, candidate timelines, offer cards, assessment cards, roadmap milestones, and operations panels.
- Navigation is organized into four Stitch product regions: Candidate, Employer, Admin/Ops, and Platform. Avoid mixing candidate journeys with platform evidence links.
- Platform evidence panels must show the proof path, verification state, and owner action where relevant instead of static marketing copy.
- Company routes must render company name, industry, website, status, and open jobs from route-scoped data instead of generic list defaults.
- Candidate profile routes must prefer user-service data and only fall back to a read-only sample when no session is available.

## v0.6 Stitch Redesign Direction

The v0.6 product surface follows the latest Stitch project `projects/5421325194779586117`.
The canvas now separates three product regions:

- Admin/Ops: dense control-plane views for operations, pipelines, observability, cloud, releases, and AI operations.
- Employer/Company: company profile and hiring pipeline workflows.
- Client/Candidate: mobile-first candidate flows for job discovery, applications, profile, assessments, offers, interview prep, career roadmap, skill analytics, and community.

Candidate screens should feel guided and focused. Job discovery uses marketplace patterns, while Code Interview Studio exposes visible cases and run feedback without leaking hidden tests. Admin and platform screens should stay compact, operational, and evidence-heavy. Primary portfolio screenshots must not show raw IDs, `UNKNOWN`, loading-only panels, fallback/offline warnings, smoke labels, mojibake, or hidden assessment payloads.

## Repository Facade Decision

This document used to live under `.stitch/DESIGN.md`. It is now a normal portfolio document under `docs/` so the GitHub root presents as an engineering repository rather than a tool workspace export.

## Stitch Usage Policy

- Treat Stitch project `projects/5421325194779586117` as visual reference, not as generated source committed into the repo.
- Do not reintroduce `.stitch/` baton, exported HTML, or generated workspace files unless a reviewer explicitly asks for design iteration artifacts.
- When implementing UI, translate Stitch direction into production React components, route-matrix screenshots, and browser/E2E evidence.
- Keep client marketplace work ITViec-inspired only: red/white job-search patterns, salary clarity, compact cards, and mobile usability without copying ITViec assets, logos, or layouts.
