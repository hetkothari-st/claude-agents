---
name: ui-review
description: Use to review a project's current UI against domain reference UIs. Detects framework + styling stack, captures live screenshots via Playwright across three viewports, parses existing components into a contracts inventory, and writes structured gaps.json + plan.md with comparison findings. Caller must then present plan.md to the user for approval.
---

# UI Review

You are reviewing the user's current UI and producing a structured gap analysis vs. the domain reference UIs.

## Inputs
- `projectRoot` — absolute path to the project being reviewed.
- `domain` — slug under `knowledge/domains/` (e.g. `trading`, `saas-dashboard`, `ecommerce`).
- `routes` (optional) — comma-separated list. If omitted, infer from filesystem.

## Required outputs (in `<projectRoot>/.ui-master/`)
- `snapshots/current/<route>-<viewport>.png`
- `contracts.json` — exports/props/imports/consumers per UI file
- `gaps.json` — structured per spec section 6.1
- `plan.md` — human-readable plan per spec section 6.2

## Procedure

### 1. Detect

Read `package.json`. Determine framework:
- has `next` dep → Next.js
- has `vite` and `react` → Vite + React
- has `react-scripts` → CRA
- otherwise → halt and ask user

Determine styling:
- file `tailwind.config.{js,ts,mjs,cjs}` exists AND `globals.css` (or equivalent) imports tailwind directives → Tailwind detected
- otherwise → ask user: convert to Tailwind, proceed degraded, or abort

Read existing tokens from `tailwind.config.*` (theme.extend) and `globals.css` (CSS variables).

### 2. Routes

If user did not pass `--routes`:
- Next App Router: list `src/app/**/page.tsx`, derive route paths
- Next pages dir: list `src/pages/**/*.tsx` excluding `_*`
- Vite + React Router: read the router file (search for `<Route path=`)
- Fallback: ask user for the route list

### 3. Boot dev server

Run `pwsh scripts/boot-dev-server.ps1 -ProjectRoot <projectRoot>`.
Capture URL and PID from stdout. On non-zero exit:
- read tail of `<projectRoot>/.ui-master/dev-server.log`
- present to user; ask for manual screenshots in `<projectRoot>/.ui-master/snapshots/manual/` and skip to step 5 using those.

### 4. Capture

Run:
```
node scripts/playwright-shoot.mjs --baseUrl <url> --routes <csv> --out <projectRoot>/.ui-master/snapshots/current
```

If a route screenshot fails, log to `runlog.md` and continue.

After capture, kill the dev server: `Stop-Process -Id <PID> -Force`.

### 5. Contract inventory

For each `*.tsx` / `*.jsx` file under `src/components/`, `src/app/**/page.tsx`, `src/app/**/layout.tsx`:
- Use ripgrep / file read to extract:
  - `export (default|const|function) <Name>` → exports
  - `interface <Name>Props` or `type <Name>Props =` → props (capture field names)
  - imports (top of file)
- For each component, find consumers via `Grep` for `<ComponentName` across `src/`.
- Write to `<projectRoot>/.ui-master/contracts.json` per spec §7.1.

### 6. Compare

Load:
- `<plugin>/knowledge/domains/<domain>/README.md`
- `<plugin>/knowledge/domains/<domain>/tokens.json`
- All PNGs in `<plugin>/knowledge/domains/<domain>/refs/`
- All PNGs in `<projectRoot>/.ui-master/snapshots/current/`

Use vision (Read on each image) to compare. For each category in spec §6.1 (palette, typography, layout, components, patterns), produce findings.

Write `<projectRoot>/.ui-master/gaps.json` matching spec §6.1 schema.

### 7. Plan

Convert gaps.json into the phased plan.md per spec §6.2. Order:
1. Tokens
2. Primitives
3. Layouts
4. Domain components
5. Polish

Each task in plan.md must reference a target file or files, a reference screenshot when applicable, and a one-line reason.

### 8. Return

Stop after writing plan.md. Do NOT execute changes. Hand control back to the caller (the `ui-master` agent), which will present the plan to the user.

## Hard rules
- Do not edit any source file in this skill.
- Do not write outside `<projectRoot>/.ui-master/`.
- If any required input is missing, ask the user — do not invent.
