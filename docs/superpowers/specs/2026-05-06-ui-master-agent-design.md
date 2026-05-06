# UI-Master Agent — Design Spec

**Date:** 2026-05-06
**Owner:** ainaman2512@gmail.com
**Status:** Draft, pending user review

---

## 1. Goal

A Claude Code plugin (`ui-master`) that ships a domain-aware UI specialist agent. When invoked inside any web project, the agent:

1. Reviews the project's current UI (code + live screenshots).
2. Compares it to curated reference UIs from the project's domain (e.g. trading, SaaS dashboard, e-commerce).
3. Produces an approval-gated plan of changes.
4. On user approval, applies the changes itself, using its own skills plus existing skills (e.g. `frontend-design`).
5. Verifies after each phase that nothing broke functionally.

The end goal is a professional, aesthetic, functionally intact application — without the user having to re-describe their UI taste each time, and without disrupting working components.

## 2. Distribution

Private Claude Code plugin in its own git repo. Installed per-project via `/plugin install <repo>`. Works on any machine running Claude Code (local or remote). Knowledge assets (screenshots, tokens, docs) ship inside the plugin so a single install gives the agent everything.

## 3. Scope

**In scope (v1):**
- Web stacks: React / Next.js + Tailwind primarily. Other web stacks: agent asks user whether to convert or proceed with degraded fidelity.
- Seeded domain knowledge for: **Trading / Stock Market** (deepest), **SaaS Dashboard**, **E-commerce**.
- Live UI capture via Playwright; vision-based comparison to reference screenshots.
- Approval-gated plan; phased execution with per-phase verification.
- New-domain fallback via WebFetch research, optionally promotable to a seeded domain.

**Out of scope (v1):**
- Native mobile (React Native, Flutter), desktop (Electron beyond web view), email templates.
- Healthcare, social/chat domains (deferred — easy to add later via the same domain schema).
- Backend / data layer changes. Agent must not touch API, server, data-fetching, or DB code.
- Routing or business-logic restructuring.
- Public marketplace publication. Private only.

## 4. High-level architecture

```
ui-master/                              # plugin repo root
├── .claude-plugin/
│   └── plugin.json                     # plugin manifest
├── agents/
│   └── ui-master.md                    # main subagent definition
├── skills/
│   ├── ui-review/                      # detect, capture, compare
│   ├── ui-research/                    # WebFetch fallback for unknown domains
│   └── ui-execute/                     # apply changes loop
├── commands/
│   └── ui-master.md                    # /ui-master slash command entry
├── knowledge/
│   ├── domains/
│   │   ├── trading/
│   │   │   ├── README.md               # palette, typography, layout, UX patterns
│   │   │   ├── refs/                   # screenshots: TradingView, Bloomberg,
│   │   │   │                           # ThinkOrSwim, Robinhood, IBKR, Zerodha,
│   │   │   │                           # Groww
│   │   │   └── tokens.json             # design tokens distilled from refs
│   │   ├── saas-dashboard/             # Linear, Notion, Vercel, Stripe Dashboard
│   │   └── ecommerce/                  # Apple, Allbirds, Shopify storefronts
│   └── _schema.md                      # how to add a new domain
├── scripts/
│   ├── boot-dev-server.ps1             # detect + start npm/pnpm dev in bg
│   └── playwright-shoot.mjs            # screenshot batch helper
├── tests/
│   ├── fixtures/                       # bare projects per domain
│   ├── run.ps1                         # plugin self-tests
│   └── lint-knowledge.mjs              # validate knowledge docs
└── README.md
```

**Trigger:** user runs `/ui-master` in a project. The slash command dispatches the `ui-master` subagent. The agent owns the full pipeline; it delegates to its own skills and to existing skills like `frontend-design`.

**Project-side state:** the agent writes only to `.ui-master/` in the project (gitignored), holding `snapshots/`, `gaps.json`, `plan.md`, `contracts.json`, `runlog.md`. This state makes runs resumable.

## 5. Components & responsibilities

### 5.1 `agents/ui-master.md` (orchestrator)
- Owns the whole flow: detect → review → plan → approve → execute → verify.
- Tools allowed: Read, Glob, Grep, Bash (dev server), Edit, Write, WebFetch, Playwright MCP, vision (image read), Skill (delegate to `frontend-design`, `ui-review`, `ui-research`, `ui-execute`).
- Inputs: project root (cwd); optional `--domain <name>`, `--resume`.
- Outputs: `plan.md`, diffs, before/after snapshots, final report.

### 5.2 `skills/ui-review`
- Parse `package.json` to detect framework + styling stack.
- Read `tailwind.config.*` + `globals.css` to capture current tokens.
- Walk routes (Next App Router / pages dir / Vite route file).
- Boot dev server via `scripts/boot-dev-server.ps1` (background); poll until URL responds.
- Playwright screenshot each route at 3 viewports: mobile 375, tablet 768, desktop 1440.
- Load `knowledge/domains/<domain>/`.
- Vision-compare current vs refs → write structured `gaps.json` and human `plan.md`.

### 5.3 `skills/ui-research` (unknown-domain fallback)
- WebFetch curated articles ("best <domain> apps UI 2025", design-system showcases).
- Pull 3–5 reference app names + public screenshot URLs where available.
- Distill into ephemeral `knowledge/_runtime/<domain>.md` (session-only).
- Offer to promote to a permanent seeded domain on user opt-in.

### 5.4 `skills/ui-execute`
- Consume approved `plan.md`.
- Phased ordering: tokens → primitives → layouts → domain components → polish.
- Per task: invoke `frontend-design` skill or Edit directly for token changes.
- After each phase: re-screenshot affected routes, run type-check / lint / tests if present, vision-verify, contract-check.
- On regression: revert phase via git, log to `runlog.md`, halt for user input.

### 5.5 `commands/ui-master.md`
One-line slash command that dispatches the `ui-master` agent with current cwd and optional flags.

### 5.6 `knowledge/domains/<domain>/README.md` schema

Required sections:

- `## Reference apps` — name, URL, why included.
- `## Palette` — base, surface, accent, semantic (success/danger/warn) with hex.
- `## Typography` — display/heading/body/mono families, scale, weights.
- `## Layout archetype` — grid density, sidebar/topbar pattern, panel composition.
- `## Key UX patterns` — domain-specific patterns. Trading example: order book row layout, candlestick legend, watchlist density, ticker formatting, P/L color semantics. SaaS example: command palette, breadcrumbs, empty states. E-commerce example: product card composition, filter rail, cart drawer.
- `## Anti-patterns` — common mistakes to flag in the user's UI.

### 5.7 `knowledge/domains/<domain>/tokens.json`

Distilled tokens drop-in for Tailwind config extension: `colors`, `fontFamily`, `fontSize`, `spacing` extras, `borderRadius`. JSON-validated by `tests/lint-knowledge.mjs`.

### 5.8 `scripts/`
- `boot-dev-server.ps1` — read package.json, pick `dev` script, start in background, return URL.
- `playwright-shoot.mjs` — wrap Playwright MCP calls for batch screenshotting at 3 viewports.

## 6. Data flow

```
user runs `/ui-master` in project
  │
  ▼
[1] DETECT
  ├─ package.json → framework (next/vite/cra), styling (tailwind?)
  ├─ tailwind.config + globals.css → current tokens
  ├─ src/app | pages | routes → route list
  └─ if non-React/Next+Tailwind → ASK user (convert? proceed?)
  │
  ▼
[2] DOMAIN IDENTIFY
  ├─ infer from package name, README, top-level routes
  ├─ confirm with user
  └─ if unknown → skills/ui-research → seed runtime knowledge
  │
  ▼
[3] CAPTURE
  ├─ scripts/boot-dev-server.ps1 → start dev server in bg, get URL
  ├─ Playwright: each route × 3 viewports → .ui-master/snapshots/current/
  └─ on dev-server fail → fall back to user-supplied screenshots
                           in .ui-master/snapshots/manual/
  │
  ▼
[4] COMPARE
  ├─ load knowledge/domains/<domain>/{README.md, refs/*.png, tokens.json}
  ├─ vision-read current snapshots + reference screenshots
  ├─ produce structured gaps.json (palette, typography, layout, components,
  │  patterns)
  └─ write .ui-master/gaps.json
  │
  ▼
[5] PLAN  → write .ui-master/plan.md
  │
  ▼
[6] APPROVAL GATE  → present plan.md inline, await user approve / edits
  │
  ▼
[7] EXECUTE  → skills/ui-execute consumes plan.md
  ├─ phase 1: tokens (tailwind.config + globals.css from tokens.json)
  ├─ phase 2: primitives (Button, Card, Input, NumericCell, …)
  ├─ phase 3: layouts (per-route shells)
  ├─ phase 4: domain components (OrderBook, Watchlist, Candle legend, …)
  ├─ phase 5: polish (motion, focus states, empty states)
  └─ after each phase: re-screenshot affected routes, run checks, log
  │
  ▼
[8] VERIFY  → final report: before/after screenshots, gaps closed, residuals
```

### 6.1 `gaps.json` shape

```json
{
  "palette": [
    {
      "current": "#3b82f6",
      "suggested": "#0ea5e9",
      "reason": "trading domain leans cyan/teal accent + green/red semantic; current royal blue reads SaaS not finance"
    }
  ],
  "typography": [
    {
      "current": "Inter 16/24",
      "suggested": "Inter UI + JetBrains Mono for numerics",
      "reason": "numerics need tabular mono in trading"
    }
  ],
  "layout": [
    {
      "route": "/dashboard",
      "issue": "low density, single-column",
      "suggested": "3-pane: watchlist | chart | order panel",
      "refs": ["tradingview-main.png"]
    }
  ],
  "components": [
    {
      "name": "OrderRow",
      "issue": "missing",
      "refs": ["bloomberg-orderbook.png"]
    }
  ],
  "patterns": [
    {
      "issue": "no semantic green/red on price deltas",
      "impact": "high"
    }
  ]
}
```

### 6.2 `plan.md` format

```markdown
# UI Master Plan — <project> (<domain>)
Generated: 2026-05-06 14:32

## Summary
3 token shifts, 5 primitives to upgrade, 2 layout rebuilds, 4 missing domain
components. Estimated phases: 5. Approve to execute.

## Phase 1 — Design tokens
- [ ] Replace primary `#3b82f6` → `#0ea5e9` (cyan-500). Reason: trading accent.
- [ ] Add semantic tokens: `success: #10b981`, `danger: #ef4444`,
      `warn: #f59e0b`.
- [ ] Add `font-mono: "JetBrains Mono"` for numeric cells.
- Files: `tailwind.config.ts`, `src/app/globals.css`

## Phase 2 — Primitives
- [ ] `<NumericCell>` new: tabular-nums, mono, color by sign.
      Ref: bloomberg-orderbook.png:row.
- [ ] `<Button>` revise: tighter padding (px-3 py-1.5), neutral default,
      accent for primary CTA.

## Phase 3 — Layouts
- [ ] `/dashboard` rebuild → 3-pane grid (watchlist 280px | chart 1fr |
      order 320px). Ref: tradingview-main.png.

## Phase 4 — Domain components
- [ ] `<OrderBook>` new. Bid/ask split, depth bars, hover row.
      Ref: bloomberg-orderbook.png.
- [ ] `<Watchlist>` upgrade. Sticky header, sortable cols, sparkline.
      Ref: tradingview-watchlist.png.

## Phase 5 — Polish
- [ ] Skeleton loaders on data panels.
- [ ] Empty state for /portfolio.

## Out of scope (flagged, not changing)
- Backend / data fetching.
- Routing structure.
- Auth pages (no domain ref applicable).
```

### 6.3 Resumability

Re-running `/ui-master --resume` reads `.ui-master/plan.md` and `runlog.md`, picks up at the first incomplete phase. `--fresh` discards prior state.

## 7. Functional preservation (HARD constraint)

UI changes must not break component behavior, props contracts, event handlers, data flow, or routing. Visual ≠ behavioral.

### 7.1 Pre-flight inventory

Before any edit, `skills/ui-review` runs a static scan and saves `.ui-master/contracts.json`:

```json
{
  "src/components/OrderRow.tsx": {
    "exports": ["OrderRow"],
    "props": ["price", "qty", "side", "onClick"],
    "imports": ["@/lib/format", "react"],
    "consumers": ["src/app/dashboard/page.tsx"]
  }
}
```

This freezes the public API surface. The agent is forbidden from changing exports, prop names, prop types (except widening), or handler signatures.

### 7.2 Edit policy in `skills/ui-execute`

**Allowed:** change JSX structure, classNames, internal markup, add internal helper components, add new props with defaults.

**Forbidden without explicit user override:**
- Rename or remove exports.
- Rename or remove props.
- Narrow prop types.
- Remove event handler invocations.
- Delete files imported elsewhere.
- Touch non-UI files (`api/`, `lib/data/`, `server/`, hooks that fetch data).

The agent self-checks each diff against `contracts.json` before writing. Violations are skipped and logged to `runlog.md`.

### 7.3 Post-edit verification

After each phase:
1. Re-run static scan, diff against `contracts.json`. Any contract drift → revert phase, halt, ask user.
2. If project has type-check (`tsc --noEmit`) or lint script: run it. Fail → revert phase.
3. If project has tests (`npm test` or `pnpm test`): run them. Fail → revert phase.
4. Visual regression: re-screenshot, vision-compare. Required functional UI elements still present (buttons, inputs, key labels)? If missing → revert.

### 7.4 Scope wall

Agent only edits files under:
- `src/components/`
- `src/app/**/page.tsx`, `src/app/**/layout.tsx` (and `pages/` equivalents)
- `src/styles/`
- `tailwind.config.*`
- `app/globals.css` / Vite equivalents

Touching `src/lib/`, `src/server/`, `src/api/`, data-fetching hooks, `prisma/`, or `*.config.{server,db}.*` requires explicit user permission per file.

### 7.5 Backup & rollback

Before phase 1: agent runs `git status`. If dirty → asks user to commit or stash. If clean → agent creates branch `ui-master/<timestamp>` and commits per phase. Rollback = `git reset --hard <phase-tag>`.

If the project is not a git repo, agent offers to `git init` first; if the user declines, agent halts (no rollback safety = no edits).

## 8. Error handling

| Failure | Detection | Response |
|---|---|---|
| Dev server won't start | Bash exit non-zero / port not responding in 60s | Surface stderr; offer manual screenshot fallback |
| Playwright screenshot fail | Status code / console errors | Skip route, log; if all routes fail → halt, surface |
| Domain unknown | No match in `knowledge/domains/` | Run `ui-research`; if still uncertain → ask user |
| Vision compare ambiguous | Low-confidence diff | Ask user rather than guess |
| Type-check / test fail mid-execute | Hook output | Revert phase, log, halt |
| Contract drift detected | Static scan diff | Revert phase, log violation, halt |
| Stack non-React/Next+Tailwind | package.json scan | Ask: convert / proceed degraded / abort |
| Git working tree dirty | `git status` | Halt; ask user to commit or stash |
| `.ui-master/plan.md` exists from prior run | File check | Offer: resume / overwrite / cancel |
| Project not a git repo | `git rev-parse` fail | Offer `git init`; halt if user declines |

## 9. Testing the plugin itself

### 9.1 Fixture projects (`tests/fixtures/`)
- `trading-bare/` — minimal Next + Tailwind app, simple watchlist + chart placeholder, intentionally weak UI.
- `saas-bare/` — minimal dashboard.
- `ecom-bare/` — minimal product grid.
- `mixed-stack/` — Vite + styled-components (for stack-guard test).
- `dirty-tree/` — fixture with uncommitted changes (for git-guard test).

### 9.2 Test runner (`tests/run.ps1`)
For each fixture:
1. `plan.md` produced.
2. `contracts.json` captured.
3. On auto-approve, edits respect scope wall.
4. Type-check still passes.
5. Exports / props unchanged in `contracts.json` post-run.
6. Snapshots saved.
7. Snapshot baseline: stored reference `plan.md` per fixture; new vs baseline diffed (drift allowed but flagged).

### 9.3 Knowledge-doc lint (`tests/lint-knowledge.mjs`)
- Every `domains/<x>/README.md` has all required sections.
- `tokens.json` valid JSON, hex colors valid.
- `refs/*.png` exist and are non-zero size.

### 9.4 Manual smoke test (`tests/MANUAL.md`)
Checklist for each new seeded domain.

## 10. Knowledge seed plan (v1 deliverable)

| Domain | Reference apps | Refs to capture | tokens.json | README.md sections |
|---|---|---|---|---|
| Trading / Stock Market | TradingView, Bloomberg Terminal, ThinkOrSwim, Robinhood, IBKR, Zerodha Kite, Groww | 7 apps × 3–4 views = ~25 screenshots | yes | all required |
| SaaS Dashboard | Linear, Notion, Vercel, Stripe Dashboard | 4 apps × 3 views = ~12 screenshots | yes | all required |
| E-commerce | Apple, Allbirds, Shopify storefront sample | 3 apps × 3 views = ~9 screenshots | yes | all required |

Each seeded domain ships in v1. Healthcare, Social/Chat, Dev Tools, Analytics/BI deferred.

## 11. Open questions / future work

- Auto-promote a researched domain to a seeded domain after N successful uses.
- Per-component "freeze" annotation — let the user mark specific files off-limits via `.ui-master/freeze.txt`.
- Multi-theme support (light/dark, brand variants) per domain.
- A11y check pass after polish phase (axe-core via Playwright).
- Mobile / native stacks in v2.

## 12. Deliverables checklist

- [ ] Plugin scaffold: `.claude-plugin/plugin.json`, `agents/`, `skills/`, `commands/`, `knowledge/`, `scripts/`, `tests/`, `README.md`.
- [ ] Three seeded domains (trading, saas-dashboard, ecommerce) with refs + tokens + README.
- [ ] `ui-master` agent definition with full flow.
- [ ] `ui-review`, `ui-research`, `ui-execute` skills.
- [ ] `boot-dev-server.ps1` and `playwright-shoot.mjs` scripts.
- [ ] Fixture projects + test runner + knowledge lint.
- [ ] Top-level README with install + usage instructions.
