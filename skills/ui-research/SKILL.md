---
name: ui-research
description: Use when the project's domain has no seed under knowledge/domains/. Performs lightweight WebFetch research to identify 3-5 reference apps and distill a runtime knowledge file the agent can use for the current session. Optionally promotes the result to a permanent seeded domain on user opt-in.
---

# UI Research

Triggered when `ui-review` cannot match a project to any seeded domain.

## Inputs
- `domainHint` — short user-supplied descriptor (e.g. "fitness tracking app", "law firm CRM").
- `projectRoot` — for writing runtime knowledge.

## Outputs
- `<plugin>/knowledge/_runtime/<slug>.md` — ephemeral domain doc, same schema as `_schema.md` (minus `tokens.json` which can be optional at first).

## Procedure

### 1. Identify reference apps

Use WebFetch / WebSearch with queries like:
- "best <domainHint> app UI 2025"
- "<domainHint> design system showcase"
- "leading <domainHint> apps screenshots"

Collect 3–5 candidate apps. For each, capture:
- Name
- URL
- One-line "why included"

### 2. Distill patterns

For each app, fetch a public page and read it. Extract:
- Dominant palette (rough hex inferences acceptable)
- Typography choices visible in computed styles
- Layout archetype (top-bar/sidebar/grid/etc.)

### 3. Write runtime knowledge

Write `<plugin>/knowledge/_runtime/<slug>.md` with the README schema sections. Mark as `Status: runtime — not yet seeded`.

### 4. Offer promotion

After review completes successfully, ask the user:
> Promote `<slug>` to a permanent seeded domain? This will move the runtime doc to `knowledge/domains/<slug>/` and prompt you to capture reference screenshots.

If yes:
- Move file
- Create empty `refs/` with `MANUAL_CAPTURE.md` listing the candidate apps
- Run `npm run lint:knowledge` and surface warnings

## Hard rules
- Do not invent design tokens you cannot justify from a fetched page.
- Always include URLs in the runtime doc so claims are auditable.
- Never promote without explicit user confirmation.
