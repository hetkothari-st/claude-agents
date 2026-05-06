# UI-Master Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `ui-master` private Claude Code plugin that ships a domain-aware UI specialist agent which reviews, plans, and applies UI improvements to React/Next + Tailwind projects without breaking existing functionality.

**Architecture:** Plugin lives in its own git repo. A `ui-master` orchestrator subagent owns the flow and delegates to three plugin-local skills (`ui-review`, `ui-research`, `ui-execute`) plus existing skills (`frontend-design`). Domain knowledge ships as Markdown + JSON + reference screenshots under `knowledge/domains/<domain>/`. Project-side state stored in `.ui-master/`.

**Tech Stack:** Markdown (agent/skill/command definitions), JSON (plugin manifest, tokens, contracts), PowerShell (dev-server boot script, test runner), Node.js ESM (.mjs) for Playwright screenshot helper and knowledge linter, Playwright MCP, Next.js + Tailwind (fixtures), Vitest (lint script tests).

**Working dir:** `C:\Users\HP\Desktop\claude-agents` becomes the plugin repo root. The `docs/` subtree (specs and this plan) is committed alongside plugin source. The plan assumes Windows + PowerShell (project is Windows 11, shell is PowerShell). Bash equivalents are noted where relevant.

**Spec:** `docs/superpowers/specs/2026-05-06-ui-master-agent-design.md`

---

## File Structure

Plugin tree to be built:

```
claude-agents/                              # plugin repo root (this dir)
├── .claude-plugin/
│   └── plugin.json
├── .gitignore
├── README.md
├── agents/
│   └── ui-master.md
├── commands/
│   └── ui-master.md
├── skills/
│   ├── ui-review/
│   │   └── SKILL.md
│   ├── ui-research/
│   │   └── SKILL.md
│   └── ui-execute/
│       └── SKILL.md
├── knowledge/
│   ├── _schema.md
│   └── domains/
│       ├── trading/
│       │   ├── README.md
│       │   ├── tokens.json
│       │   └── refs/                       # screenshots, captured manually
│       ├── saas-dashboard/
│       │   ├── README.md
│       │   ├── tokens.json
│       │   └── refs/
│       └── ecommerce/
│           ├── README.md
│           ├── tokens.json
│           └── refs/
├── scripts/
│   ├── boot-dev-server.ps1
│   └── playwright-shoot.mjs
├── tests/
│   ├── run.ps1
│   ├── lint-knowledge.mjs
│   ├── lint-knowledge.test.mjs
│   ├── MANUAL.md
│   └── fixtures/
│       ├── trading-bare/
│       ├── saas-bare/
│       ├── ecom-bare/
│       ├── mixed-stack/
│       └── dirty-tree/
├── docs/
│   ├── superpowers/
│   │   ├── specs/2026-05-06-ui-master-agent-design.md   # already exists
│   │   └── plans/2026-05-06-ui-master-agent.md          # this file
│   └── ...
└── package.json                            # for Node deps used by scripts/tests
```

---

## Task 1: Initialize repo and scaffold

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `README.md`
- Create: `.claude-plugin/plugin.json`

- [ ] **Step 1: Initialize git repo**

Run:
```powershell
git init
git add docs
git commit -m "chore: import design spec and plan"
```

Expected: clean commit on `main` containing only `docs/`.

- [ ] **Step 2: Write `.gitignore`**

Create `.gitignore`:
```
node_modules/
.ui-master/
tests/fixtures/**/.next/
tests/fixtures/**/dist/
tests/fixtures/**/node_modules/
*.log
.DS_Store
```

- [ ] **Step 3: Write `package.json`**

Create `package.json`:
```json
{
  "name": "ui-master",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "lint:knowledge": "node tests/lint-knowledge.mjs",
    "test": "node --test tests/lint-knowledge.test.mjs",
    "test:plugin": "powershell -ExecutionPolicy Bypass -File tests/run.ps1"
  },
  "devDependencies": {
    "playwright": "^1.49.0"
  }
}
```

- [ ] **Step 4: Write top-level `README.md`**

Create `README.md`:
````markdown
# ui-master

Private Claude Code plugin: a domain-aware UI specialist agent.

## Install

```bash
/plugin install <repo-url>
```

## Use

In any web project:
```bash
/ui-master
```

The agent will detect framework + domain, capture current UI via Playwright, compare to seeded references, plan changes, and execute them on approval — without breaking existing component contracts.

See `docs/superpowers/specs/2026-05-06-ui-master-agent-design.md` for the full spec.

## Seeded domains (v1)

- Trading / Stock Market
- SaaS Dashboard
- E-commerce

New domains can be added under `knowledge/domains/<name>/` following `knowledge/_schema.md`.
````

- [ ] **Step 5: Write `.claude-plugin/plugin.json`**

Create `.claude-plugin/plugin.json`:
```json
{
  "name": "ui-master",
  "version": "0.1.0",
  "description": "Domain-aware UI specialist agent for React/Next + Tailwind projects.",
  "author": "ainaman2512@gmail.com"
}
```

- [ ] **Step 6: Commit**

Run:
```powershell
git add .gitignore package.json README.md .claude-plugin
git commit -m "chore: scaffold plugin repo"
```

---

## Task 2: Install Playwright dependency

**Files:**
- Modify: `package.json` (already lists Playwright)
- Create: `package-lock.json` (generated)

- [ ] **Step 1: Install dependency and Playwright browsers**

Run:
```powershell
npm install
npx playwright install chromium
```

Expected: `node_modules/` populated; Chromium installed.

- [ ] **Step 2: Verify install**

Run:
```powershell
node -e "import('playwright').then(p => console.log('ok', !!p.chromium))"
```

Expected: `ok true`

- [ ] **Step 3: Commit lockfile**

Run:
```powershell
git add package-lock.json
git commit -m "chore: lock playwright dependency"
```

---

## Task 3: Build `boot-dev-server.ps1`

**Files:**
- Create: `scripts/boot-dev-server.ps1`
- Test: manual smoke (no Pester); validated end-to-end in Task 22.

This script reads `package.json`, picks the `dev` script, starts it in the background, polls until the URL responds, and writes the URL to stdout.

- [ ] **Step 1: Write `scripts/boot-dev-server.ps1`**

Create `scripts/boot-dev-server.ps1`:
```powershell
<#
.SYNOPSIS
  Boot a project's dev server and return its URL.
.PARAMETER ProjectRoot
  Project directory (must contain package.json with a `dev` script).
.PARAMETER PortHint
  Preferred port to probe first (default 3000).
.PARAMETER TimeoutSec
  How long to wait for the server to respond (default 60).
.OUTPUTS
  On success: writes URL on stdout (e.g. http://localhost:3000) and the PID
  on the second line.
  On failure: exits non-zero with stderr describing the cause.
#>
param(
  [Parameter(Mandatory)] [string] $ProjectRoot,
  [int] $PortHint = 3000,
  [int] $TimeoutSec = 60
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path (Join-Path $ProjectRoot 'package.json'))) {
  Write-Error "No package.json in $ProjectRoot"
  exit 2
}

$pkg = Get-Content (Join-Path $ProjectRoot 'package.json') -Raw | ConvertFrom-Json
if (-not $pkg.scripts.dev) {
  Write-Error "package.json has no 'dev' script"
  exit 3
}

$pkgManager = 'npm'
if (Test-Path (Join-Path $ProjectRoot 'pnpm-lock.yaml')) { $pkgManager = 'pnpm' }
elseif (Test-Path (Join-Path $ProjectRoot 'yarn.lock')) { $pkgManager = 'yarn' }

$logFile = Join-Path $ProjectRoot '.ui-master/dev-server.log'
New-Item -ItemType Directory -Force -Path (Split-Path $logFile) | Out-Null

$proc = Start-Process -FilePath $pkgManager `
  -ArgumentList 'run','dev' `
  -WorkingDirectory $ProjectRoot `
  -RedirectStandardOutput $logFile `
  -RedirectStandardError "$logFile.err" `
  -PassThru -WindowStyle Hidden

$candidatePorts = @($PortHint, 3000, 3001, 5173, 4173, 8080) | Select-Object -Unique
$deadline = (Get-Date).AddSeconds($TimeoutSec)
$resolvedUrl = $null

while ((Get-Date) -lt $deadline -and -not $resolvedUrl) {
  foreach ($port in $candidatePorts) {
    $url = "http://localhost:$port"
    try {
      $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
      if ($r.StatusCode -lt 500) { $resolvedUrl = $url; break }
    } catch { }
  }
  if (-not $resolvedUrl) { Start-Sleep -Milliseconds 500 }
}

if (-not $resolvedUrl) {
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  $tail = Get-Content $logFile -Tail 30 -ErrorAction SilentlyContinue
  Write-Error "Dev server did not respond within $TimeoutSec s. Tail of log:`n$($tail -join "`n")"
  exit 4
}

Write-Output $resolvedUrl
Write-Output $proc.Id
```

- [ ] **Step 2: Manual smoke**

Defer full smoke until Task 15 (trading-bare fixture exists). For now, run `pwsh -Command "Get-Help scripts/boot-dev-server.ps1"` to verify parsing.

Expected: help block prints, no parse errors.

- [ ] **Step 3: Commit**

Run:
```powershell
git add scripts/boot-dev-server.ps1
git commit -m "feat(scripts): add boot-dev-server.ps1"
```

---

## Task 4: Build `playwright-shoot.mjs`

**Files:**
- Create: `scripts/playwright-shoot.mjs`
- Create: `scripts/playwright-shoot.test.mjs`

This script takes a base URL, a list of routes, and an output dir; screenshots each route at three viewports and writes PNGs.

- [ ] **Step 1: Write the failing test**

Create `scripts/playwright-shoot.test.mjs`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';

function startStaticServer() {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(`<!doctype html><html><body><h1>Path: ${req.url}</h1></body></html>`);
  });
  return new Promise(resolve => {
    server.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

test('shoots three viewports per route', async () => {
  const { server, port } = await startStaticServer();
  const out = mkdtempSync(join(tmpdir(), 'shoot-'));
  try {
    const baseUrl = `http://localhost:${port}`;
    const routes = ['/', '/about'];
    const child = spawn(process.execPath, [
      'scripts/playwright-shoot.mjs',
      '--baseUrl', baseUrl,
      '--routes', routes.join(','),
      '--out', out,
    ], { stdio: 'inherit' });
    const exitCode = await new Promise(r => child.on('exit', r));
    assert.equal(exitCode, 0);

    const files = readdirSync(out).sort();
    assert.deepEqual(files, [
      'about-desktop.png',
      'about-mobile.png',
      'about-tablet.png',
      'root-desktop.png',
      'root-mobile.png',
      'root-tablet.png',
    ]);
  } finally {
    server.close();
    rmSync(out, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
node --test scripts/playwright-shoot.test.mjs
```

Expected: FAIL — `Cannot find module 'scripts/playwright-shoot.mjs'`

- [ ] **Step 3: Write `scripts/playwright-shoot.mjs`**

Create `scripts/playwright-shoot.mjs`:
```javascript
#!/usr/bin/env node
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

const VIEWPORTS = {
  mobile:  { width: 375,  height: 812 },
  tablet:  { width: 768,  height: 1024 },
  desktop: { width: 1440, height: 900 },
};

const { values } = parseArgs({
  options: {
    baseUrl: { type: 'string' },
    routes:  { type: 'string' },
    out:     { type: 'string' },
  },
});

if (!values.baseUrl || !values.routes || !values.out) {
  console.error('Usage: playwright-shoot.mjs --baseUrl <url> --routes <a,b,c> --out <dir>');
  process.exit(2);
}

await mkdir(values.out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const route of values.routes.split(',')) {
    const slug = route === '/' ? 'root' : route.replace(/^\//, '').replace(/\//g, '-');
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      const ctx = await browser.newContext({ viewport: vp });
      const page = await ctx.newPage();
      await page.goto(values.baseUrl + route, { waitUntil: 'load', timeout: 15000 });
      await page.screenshot({ path: join(values.out, `${slug}-${vpName}.png`), fullPage: true });
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
node --test scripts/playwright-shoot.test.mjs
```

Expected: PASS

- [ ] **Step 5: Commit**

Run:
```powershell
git add scripts/playwright-shoot.mjs scripts/playwright-shoot.test.mjs
git commit -m "feat(scripts): add playwright-shoot.mjs with viewport batch"
```

---

## Task 5: Knowledge schema doc

**Files:**
- Create: `knowledge/_schema.md`

- [ ] **Step 1: Write `knowledge/_schema.md`**

Create `knowledge/_schema.md`:
````markdown
# Domain knowledge schema

Each domain lives at `knowledge/domains/<slug>/` and contains:

- `README.md` — narrative description (sections below required, in this order).
- `tokens.json` — design tokens drop-in for Tailwind config extension.
- `refs/` — reference screenshots (PNG, ≤ 800 KB each, ≥ 600 px wide).

## Required README sections

```markdown
# <Domain name>

## Reference apps
| Name | URL | Why included |
| ---- | --- | ------------ |
| ...  | ... | ...          |

## Palette
- Base / surface / accent / semantic (success/danger/warn) with hex values.

## Typography
- Display, heading, body, mono families. Scale and weights.

## Layout archetype
- Grid density, sidebar/topbar pattern, panel composition.

## Key UX patterns
- Domain-specific bullet list. Each bullet should reference a `refs/<file>.png`.

## Anti-patterns
- Common mistakes the agent should flag in the user's UI.
```

## `tokens.json` shape

```json
{
  "colors": {
    "primary": "#0ea5e9",
    "success": "#10b981",
    "danger":  "#ef4444",
    "warn":    "#f59e0b",
    "surface": { "0": "#0b0d10", "1": "#13171c", "2": "#1b2027" }
  },
  "fontFamily": {
    "sans": ["Inter", "ui-sans-serif", "system-ui"],
    "mono": ["JetBrains Mono", "ui-monospace"]
  },
  "fontSize": {
    "tabular-sm": ["12px", { "lineHeight": "16px", "fontVariantNumeric": "tabular-nums" }]
  },
  "borderRadius": { "panel": "6px" }
}
```

## Adding a new domain

1. Create `knowledge/domains/<slug>/` with `README.md`, `tokens.json`, `refs/`.
2. Capture 3–7 screenshots of reference apps per the README's Reference apps table.
3. Run `npm run lint:knowledge` — fix any reported errors.
4. Add the domain to the README seed-list in the plugin root.
````

- [ ] **Step 2: Commit**

Run:
```powershell
git add knowledge/_schema.md
git commit -m "docs(knowledge): add domain schema"
```

---

## Task 6: Seed Trading domain

**Files:**
- Create: `knowledge/domains/trading/README.md`
- Create: `knowledge/domains/trading/tokens.json`
- Create: `knowledge/domains/trading/refs/.gitkeep`
- Create: `knowledge/domains/trading/refs/MANUAL_CAPTURE.md`

Reference apps to capture: TradingView, Bloomberg Terminal (web), ThinkOrSwim, Robinhood, IBKR, Zerodha Kite, Groww. Target ~25 screenshots total. Screenshots are captured manually by the human — the plan documents the URLs and view targets.

- [ ] **Step 1: Write `knowledge/domains/trading/README.md`**

Create `knowledge/domains/trading/README.md`:
````markdown
# Trading / Stock Market

## Reference apps
| Name | URL | Why included |
| ---- | --- | ------------ |
| TradingView | https://www.tradingview.com/chart | Charting density gold standard; multi-pane layouts. |
| Bloomberg Terminal (web) | https://www.bloomberg.com/professional | Order book, ticker tape conventions. |
| ThinkOrSwim | https://www.schwab.com/trading/thinkorswim | Pro retail UI; option chains. |
| Robinhood | https://robinhood.com | Consumer-friendly trading; clean defaults. |
| IBKR (Client Portal) | https://www.interactivebrokers.com/portal | Pro multi-account workflows. |
| Zerodha Kite | https://kite.zerodha.com | Indian markets reference; minimal density. |
| Groww | https://groww.in | Mobile-first retail; warm palette deviation. |

## Palette
- Base/surface: dark stack `#0b0d10` → `#13171c` → `#1b2027`. Light variant: `#ffffff` → `#f7f8fa` → `#eef0f3`.
- Accent: cyan/teal `#0ea5e9` (TradingView lineage).
- Semantic: success green `#10b981`, danger red `#ef4444`, warn amber `#f59e0b`.
- Neutral text: `#e6e8eb` on dark; `#1b2027` on light.

## Typography
- Sans display + body: Inter (or Inter UI).
- Mono for all numerics, prices, IDs: JetBrains Mono with `font-variant-numeric: tabular-nums`.
- Scale: 11/12/13 px for table cells; 14 for body; 16 for section heads; 20+ for hero numbers.
- Weights: 400 body, 500 emphasis, 600 numerics.

## Layout archetype
- Default: dense 3-pane on desktop — left rail (watchlist 240–320 px), center (chart / detail 1fr), right rail (order entry / depth 280–360 px).
- Top bar: account context + global search; height 44–48 px.
- Bottom strip optional: portfolio summary or news ticker.
- Panels share thin borders (`#1b2027` on dark) and 6 px corner radius.

## Key UX patterns
- Order book row layout (`refs/bloomberg-orderbook.png`): bid/ask split, depth-bar background, hover highlight, monospace prices right-aligned.
- Watchlist density (`refs/tradingview-watchlist.png`): sticky header, sortable cols, sparkline column, color-coded delta.
- Candlestick legend (`refs/tradingview-chart.png`): O/H/L/C in mono, color delta, indicator stack with toggleable visibility.
- Ticker formatting (`refs/robinhood-ticker.png`): symbol + name on stacked rows; price right-aligned with mono; delta with semantic color and `+`/`-` sign.
- Order panel (`refs/thinkorswim-orderpad.png`): segmented buy/sell, market/limit toggle, qty stepper, est-cost line, confirm with explicit summary.
- Empty/skeleton (`refs/kite-skeleton.png`): grey row shimmers — never show 0.00 placeholders that look like real prices.
- Numerics never use proportional fonts. Negative numbers never lose their sign through CSS truncation.

## Anti-patterns
- Royal blue `#3b82f6` as primary — reads SaaS, not finance. Use cyan/teal lineage.
- Proportional digits in price columns — eyes can't compare across rows.
- Decorative gradients on price-bearing surfaces — masks semantic colors.
- Modal-only order entry — pros need persistent side panel.
- Centered prices in tables — always right-align.
- Light theme as the only option — pro users default to dark.
````

- [ ] **Step 2: Write `knowledge/domains/trading/tokens.json`**

Create `knowledge/domains/trading/tokens.json`:
```json
{
  "colors": {
    "primary": "#0ea5e9",
    "primary-fg": "#001b29",
    "success": "#10b981",
    "danger":  "#ef4444",
    "warn":    "#f59e0b",
    "surface": {
      "0": "#0b0d10",
      "1": "#13171c",
      "2": "#1b2027",
      "3": "#252b33"
    },
    "border": "#1b2027",
    "text":   { "primary": "#e6e8eb", "muted": "#9aa0a6" }
  },
  "fontFamily": {
    "sans": ["Inter", "ui-sans-serif", "system-ui"],
    "mono": ["JetBrains Mono", "ui-monospace", "SFMono-Regular"]
  },
  "fontSize": {
    "num-xs": ["11px", { "lineHeight": "14px", "fontVariantNumeric": "tabular-nums" }],
    "num-sm": ["12px", { "lineHeight": "16px", "fontVariantNumeric": "tabular-nums" }],
    "num-md": ["13px", { "lineHeight": "18px", "fontVariantNumeric": "tabular-nums" }],
    "hero":   ["28px", { "lineHeight": "32px", "fontVariantNumeric": "tabular-nums", "fontWeight": "600" }]
  },
  "borderRadius": { "panel": "6px", "control": "4px" }
}
```

- [ ] **Step 3: Write `knowledge/domains/trading/refs/MANUAL_CAPTURE.md`**

Create `knowledge/domains/trading/refs/MANUAL_CAPTURE.md`:
```markdown
# Manual reference capture — Trading

Capture the views below as PNG (≤ 800 KB, ≥ 1280 px wide; mobile shots 375 px wide).
Save into this folder using the exact filenames listed.

| Filename | Source | View |
| -------- | ------ | ---- |
| tradingview-chart.png | TradingView | Default chart layout, 1 ticker, default indicators. |
| tradingview-watchlist.png | TradingView | Watchlist panel with sparklines and delta column. |
| tradingview-multi.png | TradingView | Multi-chart 2x2 layout. |
| bloomberg-orderbook.png | Bloomberg.com / public order-book screenshot | Depth-of-market with bid/ask split. |
| bloomberg-ticker.png | Bloomberg.com | Ticker tape strip. |
| thinkorswim-orderpad.png | ThinkOrSwim screenshot | Order entry side panel. |
| thinkorswim-chains.png | ThinkOrSwim | Option chain table. |
| robinhood-home.png | robinhood.com | Logged-out marketing or sample dashboard image. |
| robinhood-ticker.png | robinhood.com | Single ticker page. |
| robinhood-mobile.png | robinhood.com (375 px) | Mobile portfolio screen. |
| ibkr-portal.png | interactivebrokers.com Client Portal screenshots | Multi-account dashboard. |
| ibkr-orders.png | IBKR | Order history table. |
| kite-watchlist.png | kite.zerodha.com | Watchlist + market depth. |
| kite-orderpad.png | kite.zerodha.com | Order entry modal. |
| kite-skeleton.png | kite.zerodha.com | Loading skeleton state. |
| groww-home.png | groww.in | Stocks home dashboard. |
| groww-ticker.png | groww.in | Stock detail page. |
| groww-mobile.png | groww.in (375 px) | Mobile dashboard. |

After capture, run `npm run lint:knowledge` to validate.
```

- [ ] **Step 4: Add gitkeep**

Create `knowledge/domains/trading/refs/.gitkeep` (empty file) so the directory commits before screenshots arrive.

- [ ] **Step 5: Commit**

Run:
```powershell
git add knowledge/domains/trading
git commit -m "feat(knowledge): seed trading domain (README, tokens, capture list)"
```

---

## Task 7: Seed SaaS Dashboard domain

**Files:**
- Create: `knowledge/domains/saas-dashboard/README.md`
- Create: `knowledge/domains/saas-dashboard/tokens.json`
- Create: `knowledge/domains/saas-dashboard/refs/.gitkeep`
- Create: `knowledge/domains/saas-dashboard/refs/MANUAL_CAPTURE.md`

Reference apps: Linear, Notion, Vercel, Stripe Dashboard. Target ~12 screenshots.

- [ ] **Step 1: Write `knowledge/domains/saas-dashboard/README.md`**

Create `knowledge/domains/saas-dashboard/README.md`:
````markdown
# SaaS Dashboard

## Reference apps
| Name | URL | Why included |
| ---- | --- | ------------ |
| Linear | https://linear.app | Crisp, opinionated keyboard-first SaaS. |
| Notion | https://notion.so | Generous whitespace, soft hierarchy. |
| Vercel | https://vercel.com/dashboard | Black/white minimalism with subtle motion. |
| Stripe Dashboard | https://dashboard.stripe.com | Data-dense yet calm; muted blues. |

## Palette
- Base: near-white `#ffffff` / dark `#0a0a0a`. Surface accents `#fafafa` and `#171717`.
- Accent: muted indigo `#6366f1` or brand-neutral; never saturated primary.
- Semantic: success `#16a34a`, danger `#dc2626`, warn `#d97706`, info `#2563eb`.
- Heavy reliance on neutral grays for hierarchy (`#e5e7eb`, `#9ca3af`, `#374151`).

## Typography
- Sans family throughout: Inter or Geist.
- Scale: 13/14 body, 15/16 section heads, 20–28 page titles.
- Mono for code/IDs only.
- Weights: 400 body, 500 buttons, 600 titles.

## Layout archetype
- Left sidebar (240–280 px) with sections, search at top.
- Main content with breadcrumb header, generous 24–32 px padding.
- Optional right rail for context (activity, AI assist).
- Tables: 40–48 px row height; zebra optional; sticky header.

## Key UX patterns
- Command palette (`refs/linear-cmdk.png`): `Cmd+K`, fuzzy results grouped by category.
- Breadcrumb navigation (`refs/stripe-breadcrumb.png`): always lead the page header.
- Empty states (`refs/notion-empty.png`): illustration + one primary action; no dead pages.
- Status pills (`refs/linear-status.png`): rounded, monochrome dots, label right of dot.
- Inline edit affordance (`refs/notion-inline.png`): hover reveals controls; no modal for trivial edits.
- Toast feedback (`refs/vercel-toast.png`): bottom-right; auto-dismiss; minimal text.

## Anti-patterns
- Saturated primary buttons everywhere — pick one moment for the brand color.
- Ornamental icons in dense table rows.
- Multi-step modals when a side panel would do.
- Heavy borders on every cell.
````

- [ ] **Step 2: Write `knowledge/domains/saas-dashboard/tokens.json`**

Create `knowledge/domains/saas-dashboard/tokens.json`:
```json
{
  "colors": {
    "primary": "#6366f1",
    "primary-fg": "#ffffff",
    "success": "#16a34a",
    "danger":  "#dc2626",
    "warn":    "#d97706",
    "info":    "#2563eb",
    "surface": {
      "0": "#ffffff",
      "1": "#fafafa",
      "2": "#f4f4f5",
      "3": "#e5e7eb"
    },
    "border": "#e5e7eb",
    "text":   { "primary": "#0a0a0a", "muted": "#6b7280" }
  },
  "fontFamily": {
    "sans": ["Inter", "Geist", "ui-sans-serif"],
    "mono": ["JetBrains Mono", "ui-monospace"]
  },
  "fontSize": {
    "label-xs": ["11px", { "lineHeight": "14px", "letterSpacing": "0.04em" }],
    "body-sm":  ["13px", { "lineHeight": "18px" }],
    "body":     ["14px", { "lineHeight": "20px" }],
    "h-md":     ["16px", { "lineHeight": "22px", "fontWeight": "600" }],
    "h-lg":     ["20px", { "lineHeight": "28px", "fontWeight": "600" }]
  },
  "borderRadius": { "panel": "8px", "control": "6px" }
}
```

- [ ] **Step 3: Write `knowledge/domains/saas-dashboard/refs/MANUAL_CAPTURE.md`**

Create `knowledge/domains/saas-dashboard/refs/MANUAL_CAPTURE.md`:
```markdown
# Manual reference capture — SaaS Dashboard

| Filename | Source | View |
| -------- | ------ | ---- |
| linear-cmdk.png | linear.app | Command palette open. |
| linear-status.png | linear.app | Issue list with status pills. |
| linear-detail.png | linear.app | Issue detail with right rail. |
| notion-empty.png | notion.so | Empty database state. |
| notion-inline.png | notion.so | Inline edit on a row. |
| notion-sidebar.png | notion.so | Sidebar with nested pages. |
| vercel-deploy.png | vercel.com | Deployment list. |
| vercel-toast.png | vercel.com | Toast confirmation. |
| vercel-mobile.png | vercel.com (375 px) | Mobile dashboard. |
| stripe-breadcrumb.png | dashboard.stripe.com | Page with breadcrumb. |
| stripe-table.png | dashboard.stripe.com | Payments table. |
| stripe-detail.png | dashboard.stripe.com | Payment detail side drawer. |
```

- [ ] **Step 4: Add gitkeep**

Create `knowledge/domains/saas-dashboard/refs/.gitkeep`.

- [ ] **Step 5: Commit**

Run:
```powershell
git add knowledge/domains/saas-dashboard
git commit -m "feat(knowledge): seed saas-dashboard domain"
```

---

## Task 8: Seed E-commerce domain

**Files:**
- Create: `knowledge/domains/ecommerce/README.md`
- Create: `knowledge/domains/ecommerce/tokens.json`
- Create: `knowledge/domains/ecommerce/refs/.gitkeep`
- Create: `knowledge/domains/ecommerce/refs/MANUAL_CAPTURE.md`

Reference apps: Apple, Allbirds, Shopify storefront sample. Target ~9 screenshots.

- [ ] **Step 1: Write `knowledge/domains/ecommerce/README.md`**

Create `knowledge/domains/ecommerce/README.md`:
````markdown
# E-commerce

## Reference apps
| Name | URL | Why included |
| ---- | --- | ------------ |
| Apple | https://apple.com | Premium product storytelling, quiet typography. |
| Allbirds | https://allbirds.com | Modern DTC; warm neutrals; clear PDP rhythm. |
| Shopify Dawn (sample) | https://dawn-theme.myshopify.com | Reference storefront layout. |

## Palette
- Base: white `#ffffff` with off-white `#f7f5f1` for surface alternation.
- Accent: brand-driven; default to charcoal `#1d1d1f` (Apple-like).
- Semantic: success `#15803d`, danger `#b91c1c`, warn `#a16207`.
- Reserve color for badges (sale, new, low stock); never saturate the page.

## Typography
- Display: large-and-light for hero (28–48 px, 400–500 weight).
- Body: 14–16 px, generous line-height (1.6).
- Use serif accent only when brand calls for it; default sans.
- Numerics for prices: tabular sans; do not use mono.

## Layout archetype
- Sticky slim header with logo, nav, search, cart count.
- Hero section + 12-col responsive grid below.
- PLP: 3-up grid desktop, 2-up tablet, 1-up mobile; lazy-load images.
- PDP: image gallery left, info column right with price + variant pickers + add-to-cart sticky on mobile.
- Cart drawer (right slide-over) preferred over full cart page.

## Key UX patterns
- Product card (`refs/allbirds-card.png`): image-first, title beneath, price + delta, swatch row.
- Filter rail (`refs/dawn-filter.png`): facets with counts; sticky on desktop; sheet on mobile.
- Sticky add-to-cart (`refs/allbirds-pdp-mobile.png`): bottom sheet on mobile with price + CTA.
- Cart drawer (`refs/dawn-cart-drawer.png`): line items, subtotal, primary CTA at bottom.
- Image hover variant swap (`refs/apple-card.png`): on color change, swap hero image.

## Anti-patterns
- Discount stickers on every card — desensitizes the user; reserve for true sale.
- Cluttered hero with 4+ CTAs.
- Tiny mobile add-to-cart that scrolls away.
- Carousels without pause control.
````

- [ ] **Step 2: Write `knowledge/domains/ecommerce/tokens.json`**

Create `knowledge/domains/ecommerce/tokens.json`:
```json
{
  "colors": {
    "primary": "#1d1d1f",
    "primary-fg": "#ffffff",
    "success": "#15803d",
    "danger":  "#b91c1c",
    "warn":    "#a16207",
    "surface": {
      "0": "#ffffff",
      "1": "#f7f5f1",
      "2": "#efece6",
      "3": "#e6e2db"
    },
    "border": "#e5e1da",
    "text":   { "primary": "#1d1d1f", "muted": "#6b6b6b" }
  },
  "fontFamily": {
    "sans": ["Inter", "ui-sans-serif", "system-ui"],
    "display": ["Inter", "ui-sans-serif"]
  },
  "fontSize": {
    "body":   ["15px", { "lineHeight": "24px" }],
    "price":  ["16px", { "lineHeight": "20px", "fontWeight": "500" }],
    "h-sm":   ["18px", { "lineHeight": "26px" }],
    "h-md":   ["24px", { "lineHeight": "32px", "fontWeight": "500" }],
    "hero":   ["44px", { "lineHeight": "48px", "fontWeight": "500", "letterSpacing": "-0.02em" }]
  },
  "borderRadius": { "panel": "12px", "control": "999px" }
}
```

- [ ] **Step 3: Write `knowledge/domains/ecommerce/refs/MANUAL_CAPTURE.md`**

Create `knowledge/domains/ecommerce/refs/MANUAL_CAPTURE.md`:
```markdown
# Manual reference capture — E-commerce

| Filename | Source | View |
| -------- | ------ | ---- |
| apple-home.png | apple.com | Home with hero. |
| apple-card.png | apple.com/shop | Buy-page product card. |
| apple-pdp.png | apple.com | Product detail page. |
| allbirds-card.png | allbirds.com | PLP product card. |
| allbirds-pdp.png | allbirds.com | PDP with variants. |
| allbirds-pdp-mobile.png | allbirds.com (375 px) | Mobile PDP with sticky CTA. |
| dawn-home.png | dawn-theme.myshopify.com | Sample storefront home. |
| dawn-filter.png | dawn-theme.myshopify.com | Collection page with filters. |
| dawn-cart-drawer.png | dawn-theme.myshopify.com | Cart drawer open. |
```

- [ ] **Step 4: Add gitkeep**

Create `knowledge/domains/ecommerce/refs/.gitkeep`.

- [ ] **Step 5: Commit**

Run:
```powershell
git add knowledge/domains/ecommerce
git commit -m "feat(knowledge): seed ecommerce domain"
```

---

## Task 9: Build `lint-knowledge.mjs`

**Files:**
- Create: `tests/lint-knowledge.mjs`
- Create: `tests/lint-knowledge.test.mjs`

Validates each domain has the required README sections, valid `tokens.json`, and a non-empty `refs/` dir (allowing `.gitkeep` + `MANUAL_CAPTURE.md` placeholder during seed phase, but warning if no PNGs).

- [ ] **Step 1: Write the failing test**

Create `tests/lint-knowledge.test.mjs`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function makeFakeDomain(root, slug, { readme, tokens, addPng = false } = {}) {
  const dir = join(root, 'knowledge/domains', slug);
  mkdirSync(join(dir, 'refs'), { recursive: true });
  if (readme !== null) writeFileSync(join(dir, 'README.md'), readme);
  if (tokens !== null) writeFileSync(join(dir, 'tokens.json'), tokens);
  writeFileSync(join(dir, 'refs/.gitkeep'), '');
  if (addPng) writeFileSync(join(dir, 'refs/sample.png'), 'fake-png-content');
}

const VALID_README = [
  '# X', '',
  '## Reference apps', 'table',
  '## Palette', 'p',
  '## Typography', 't',
  '## Layout archetype', 'l',
  '## Key UX patterns', 'k',
  '## Anti-patterns', 'a',
].join('\n');

const VALID_TOKENS = JSON.stringify({
  colors: { primary: '#000000' },
  fontFamily: { sans: ['Inter'] },
  fontSize: {},
  borderRadius: {}
});

function runLint(cwd) {
  return spawnSync(process.execPath, ['tests/lint-knowledge.mjs'], {
    cwd, encoding: 'utf8',
  });
}

test('passes on a valid domain with refs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-'));
  try {
    makeFakeDomain(dir, 'good', { readme: VALID_README, tokens: VALID_TOKENS, addPng: true });
    // copy the lint script into a sibling tests/ in tempdir
    mkdirSync(join(dir, 'tests'), { recursive: true });
    writeFileSync(join(dir, 'tests/lint-knowledge.mjs'), readScript());
    const r = runLint(dir);
    assert.equal(r.status, 0, r.stderr || r.stdout);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('fails when README missing a required section', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-'));
  try {
    const broken = VALID_README.replace('## Anti-patterns', '## Other');
    makeFakeDomain(dir, 'bad-readme', { readme: broken, tokens: VALID_TOKENS, addPng: true });
    mkdirSync(join(dir, 'tests'), { recursive: true });
    writeFileSync(join(dir, 'tests/lint-knowledge.mjs'), readScript());
    const r = runLint(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /Anti-patterns/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('fails when tokens.json invalid JSON', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-'));
  try {
    makeFakeDomain(dir, 'bad-tokens', { readme: VALID_README, tokens: '{ not json', addPng: true });
    mkdirSync(join(dir, 'tests'), { recursive: true });
    writeFileSync(join(dir, 'tests/lint-knowledge.mjs'), readScript());
    const r = runLint(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /tokens\.json/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('warns but exits 0 when refs dir has no PNGs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-'));
  try {
    makeFakeDomain(dir, 'no-refs', { readme: VALID_README, tokens: VALID_TOKENS, addPng: false });
    mkdirSync(join(dir, 'tests'), { recursive: true });
    writeFileSync(join(dir, 'tests/lint-knowledge.mjs'), readScript());
    const r = runLint(dir);
    assert.equal(r.status, 0);
    assert.match(r.stderr + r.stdout, /warn.*no PNG/i);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
function readScript() {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(resolve(here, 'lint-knowledge.mjs'), 'utf8');
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
node --test tests/lint-knowledge.test.mjs
```

Expected: FAIL — `lint-knowledge.mjs` does not exist yet.

- [ ] **Step 3: Write `tests/lint-knowledge.mjs`**

Create `tests/lint-knowledge.mjs`:
```javascript
#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REQUIRED_SECTIONS = [
  '## Reference apps',
  '## Palette',
  '## Typography',
  '## Layout archetype',
  '## Key UX patterns',
  '## Anti-patterns',
];

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const root = process.cwd();
const domainsRoot = join(root, 'knowledge/domains');

let errors = 0;
let warnings = 0;
const log  = (msg) => console.log(msg);
const err  = (msg) => { console.error(`ERROR: ${msg}`); errors++; };
const warn = (msg) => { console.log(`warn: ${msg}`); warnings++; };

let domains;
try {
  domains = readdirSync(domainsRoot).filter(d =>
    statSync(join(domainsRoot, d)).isDirectory()
  );
} catch {
  err(`No knowledge/domains directory at ${domainsRoot}`);
  process.exit(1);
}

for (const slug of domains) {
  const dir = join(domainsRoot, slug);
  const readmePath = join(dir, 'README.md');
  const tokensPath = join(dir, 'tokens.json');
  const refsDir    = join(dir, 'refs');

  // README
  let readme = '';
  try { readme = readFileSync(readmePath, 'utf8'); }
  catch { err(`${slug}: missing README.md`); continue; }
  for (const sec of REQUIRED_SECTIONS) {
    if (!readme.includes(sec)) err(`${slug}: README.md missing section "${sec}"`);
  }

  // tokens.json
  let tokens;
  try { tokens = JSON.parse(readFileSync(tokensPath, 'utf8')); }
  catch (e) { err(`${slug}: tokens.json invalid JSON (${e.message})`); continue; }
  if (!tokens.colors || typeof tokens.colors !== 'object') {
    err(`${slug}: tokens.json missing "colors" object`);
  } else {
    walkColors(slug, tokens.colors);
  }

  // refs
  let refs = [];
  try { refs = readdirSync(refsDir); }
  catch { err(`${slug}: missing refs/ directory`); continue; }
  const pngs = refs.filter(f => f.toLowerCase().endsWith('.png'));
  if (pngs.length === 0) {
    warn(`${slug}: refs/ has no PNG screenshots yet (capture pending)`);
  } else {
    for (const f of pngs) {
      const s = statSync(join(refsDir, f));
      if (s.size === 0) err(`${slug}: refs/${f} is zero bytes`);
      if (s.size > 800 * 1024) warn(`${slug}: refs/${f} > 800 KB (${(s.size/1024).toFixed(0)} KB)`);
    }
  }
}

function walkColors(slug, obj, path = '') {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      if (!HEX_RE.test(v)) err(`${slug}: tokens.colors${path}.${k} not a valid hex: ${v}`);
    } else if (v && typeof v === 'object') {
      walkColors(slug, v, `${path}.${k}`);
    }
  }
}

log(`\nDomains scanned: ${domains.length}. errors=${errors} warnings=${warnings}`);
process.exit(errors > 0 ? 1 : 0);
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
node --test tests/lint-knowledge.test.mjs
```

Expected: PASS (4 sub-tests).

- [ ] **Step 5: Run lint against real seeds**

Run:
```powershell
npm run lint:knowledge
```

Expected: exit 0; warnings about missing PNGs in `trading`, `saas-dashboard`, `ecommerce` (since refs are pending manual capture).

- [ ] **Step 6: Commit**

Run:
```powershell
git add tests/lint-knowledge.mjs tests/lint-knowledge.test.mjs
git commit -m "feat(tests): add knowledge linter"
```

---

## Task 10: Write `ui-review` skill

**Files:**
- Create: `skills/ui-review/SKILL.md`

This is a Markdown skill definition, no code. Defines the review workflow the agent invokes.

- [ ] **Step 1: Write `skills/ui-review/SKILL.md`**

Create `skills/ui-review/SKILL.md`:
````markdown
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
````

- [ ] **Step 2: Commit**

Run:
```powershell
git add skills/ui-review
git commit -m "feat(skills): add ui-review"
```

---

## Task 11: Write `ui-research` skill

**Files:**
- Create: `skills/ui-research/SKILL.md`

- [ ] **Step 1: Write `skills/ui-research/SKILL.md`**

Create `skills/ui-research/SKILL.md`:
````markdown
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
````

- [ ] **Step 2: Commit**

Run:
```powershell
git add skills/ui-research
git commit -m "feat(skills): add ui-research"
```

---

## Task 12: Write `ui-execute` skill

**Files:**
- Create: `skills/ui-execute/SKILL.md`

- [ ] **Step 1: Write `skills/ui-execute/SKILL.md`**

Create `skills/ui-execute/SKILL.md`:
````markdown
---
name: ui-execute
description: Use after the user has approved a plan.md to apply the planned UI changes phase-by-phase. Enforces functional preservation rules from the spec (contract checks, scope wall, type/test gates, per-phase commits) and reverts any phase that breaks the existing component contracts or test suite.
---

# UI Execute

You are applying an approved plan from `<projectRoot>/.ui-master/plan.md` to the project.

## Inputs
- `projectRoot`
- `domain`

## Pre-flight (HARD)

1. Read `<projectRoot>/.ui-master/plan.md`. If absent, halt — caller must run `ui-review` first.
2. Read `<projectRoot>/.ui-master/contracts.json`. If absent, halt — caller must run `ui-review` first.
3. Run `git -C <projectRoot> status --porcelain`. If non-empty, halt; ask user to commit/stash.
4. Run `git -C <projectRoot> rev-parse --abbrev-ref HEAD`. Save as `originalBranch`.
5. Create branch: `git -C <projectRoot> checkout -b ui-master/<UTC-timestamp>`.
6. Detect availability of:
   - typecheck command: `tsc --noEmit` if `tsconfig.json` exists
   - lint: `npm run lint` if package.json has `lint` script
   - test:  `npm test` if package.json has `test` script

## Phases

For each phase (1–5) in plan.md:

### a. Apply edits

For each `- [ ]` task in the phase:
- Identify target files from the task line.
- Apply minimal Edits to satisfy the task. Use the `frontend-design` skill for component composition decisions. Use direct Edit for token files (tailwind.config, globals.css).
- After applying, mark task `- [x]` in plan.md.

### b. Contract check

Re-extract exports/props/imports/consumers for changed files. Diff against `contracts.json`:
- Removed export → revert phase, halt.
- Renamed prop → revert phase, halt.
- Narrowed prop type → revert phase, halt.
- Removed event handler call → revert phase, halt.

Allowed deltas: added internal helper components, renamed CSS classes, added new optional props.

### c. Type / lint / test gates

Run available checks. On any failure:
- Capture stderr to `runlog.md`.
- Revert phase: `git -C <projectRoot> reset --hard HEAD`.
- Halt and present failure to user.

### d. Visual verify

Re-screenshot changed routes via `playwright-shoot.mjs` to `.ui-master/snapshots/phase-<n>/`.
Vision-compare:
- Required UI elements (buttons, inputs, key labels) still present.
- No content accidentally hidden behind layout changes.

If a regression is detected, revert phase and halt.

### e. Commit phase

```
git -C <projectRoot> add -A
git -C <projectRoot> commit -m "ui-master: phase <n> — <phase title>"
git -C <projectRoot> tag ui-master/phase-<n>
```

## Scope wall

Allowed write paths only:
- `src/components/**`
- `src/app/**/page.tsx`, `src/app/**/layout.tsx`
- `src/pages/**` (Next pages dir)
- `src/styles/**`
- `tailwind.config.*`
- `app/globals.css`, `src/index.css`, `src/app/globals.css`

Any other path requires user approval per file. Server / API / data-fetching code is never modified.

## Final report

After all phases complete:
- Write `<projectRoot>/.ui-master/report.md` with:
  - Before/after screenshot pairs (links to snapshot files).
  - Closed gaps from `gaps.json`.
  - Residual gaps not addressed (and why).
  - Branch name + per-phase tags.

## Resume

If invoked with `--resume`:
- Read plan.md, find first phase with any unchecked `- [ ]`. Continue from there.
- Verify the current branch matches the one recorded in `runlog.md`. If not, halt.
````

- [ ] **Step 2: Commit**

Run:
```powershell
git add skills/ui-execute
git commit -m "feat(skills): add ui-execute"
```

---

## Task 13: Write `ui-master` agent

**Files:**
- Create: `agents/ui-master.md`

- [ ] **Step 1: Write `agents/ui-master.md`**

Create `agents/ui-master.md`:
````markdown
---
name: ui-master
description: Domain-aware UI specialist. Reviews a React/Next + Tailwind project's current UI, compares it to seeded reference UIs for the project's domain, produces an approval-gated plan, and applies the changes phase-by-phase without breaking existing component contracts. Use when the user invokes /ui-master in any web project.
tools: Read, Grep, Glob, Edit, Write, Bash, WebFetch
---

# UI Master Agent

You are the orchestrator for end-to-end UI improvement of a web project. You own the flow; the heavy work is delegated to skills.

## Flow

1. **Detect framework + styling stack** by reading `package.json` and styling configs in the cwd.
   - If not React/Next + Tailwind: ask user to (a) convert, (b) proceed degraded, or (c) abort.
2. **Identify domain.** Try in order:
   - `--domain` arg.
   - Heuristic from package name, README, route names (e.g. `/portfolio`, `/watchlist` → trading).
   - Confirm with user.
   - If none of the seeded domains match, invoke the `ui-research` skill.
3. **Confirm git safety.**
   - If not a git repo, offer `git init` then halt if declined.
   - If working tree dirty, ask user to commit/stash. Halt until clean.
4. **Run review.** Invoke the `ui-review` skill with `projectRoot`, `domain`. It writes `.ui-master/plan.md` and `.ui-master/contracts.json`.
5. **Present plan.** Show plan.md inline. Ask: approve / edit / cancel. Wait for user.
6. **Execute on approval.** Invoke the `ui-execute` skill. After each phase, surface a brief status and pause for user input only on regression / halt.
7. **Final report.** Show `.ui-master/report.md` with before/after summary and branch name.

## Resume mode

If invoked with `--resume`:
- Skip detect/research; read existing `.ui-master/plan.md`.
- Jump straight to step 6 with the resume flag.

## Fresh mode

If invoked with `--fresh`:
- Delete existing `.ui-master/` (after confirming with user).
- Start from step 1.

## Hard rules

- Never edit non-UI files (server, API, data-fetching) without explicit user permission per file.
- Never proceed past the approval gate without explicit user "approve".
- Never amend a previous commit. Each phase = its own commit.
- Speak plainly. When you ask the user to choose, give them options A/B/C with one-line consequences each.

## Delegation map

| Step | Skill |
| ---- | ----- |
| 4    | ui-review |
| 2    | ui-research (only if domain unknown) |
| 6    | ui-execute |
| 6 (component design decisions) | frontend-design (already on user's machine) |
````

- [ ] **Step 2: Commit**

Run:
```powershell
git add agents/ui-master.md
git commit -m "feat(agents): add ui-master orchestrator"
```

---

## Task 14: `/ui-master` slash command

**Files:**
- Create: `commands/ui-master.md`

- [ ] **Step 1: Write `commands/ui-master.md`**

Create `commands/ui-master.md`:
````markdown
---
name: ui-master
description: Run the UI Master agent on the current project. Reviews the UI vs. domain references and applies approved changes safely.
---

# /ui-master

Dispatch the `ui-master` subagent in the current project. Pass any flags through (`--domain <slug>`, `--resume`, `--fresh`).

You MUST invoke the `ui-master` agent via the Skill tool — do not attempt the workflow inline.
````

- [ ] **Step 2: Commit**

Run:
```powershell
git add commands/ui-master.md
git commit -m "feat(commands): add /ui-master slash command"
```

---

## Task 15: Build `trading-bare` fixture

**Files:**
- Create: `tests/fixtures/trading-bare/package.json`
- Create: `tests/fixtures/trading-bare/next.config.mjs`
- Create: `tests/fixtures/trading-bare/tsconfig.json`
- Create: `tests/fixtures/trading-bare/tailwind.config.ts`
- Create: `tests/fixtures/trading-bare/postcss.config.mjs`
- Create: `tests/fixtures/trading-bare/src/app/layout.tsx`
- Create: `tests/fixtures/trading-bare/src/app/page.tsx`
- Create: `tests/fixtures/trading-bare/src/app/dashboard/page.tsx`
- Create: `tests/fixtures/trading-bare/src/app/globals.css`
- Create: `tests/fixtures/trading-bare/src/components/Watchlist.tsx`
- Create: `tests/fixtures/trading-bare/src/components/PriceCell.tsx`

A minimal Next + Tailwind app with intentionally weak UI: royal-blue primary, no semantic colors, proportional digits on prices, single-column dashboard. The agent should be able to flag all of these.

- [ ] **Step 1: Write `tests/fixtures/trading-bare/package.json`**

Create `tests/fixtures/trading-bare/package.json`:
```json
{
  "name": "trading-bare",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Write `next.config.mjs`**

Create `tests/fixtures/trading-bare/next.config.mjs`:
```javascript
export default { reactStrictMode: true };
```

- [ ] **Step 3: Write `tsconfig.json`**

Create `tests/fixtures/trading-bare/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write `tailwind.config.ts`**

Create `tests/fixtures/trading-bare/tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
      },
    },
  },
} satisfies Config;
```

- [ ] **Step 5: Write `postcss.config.mjs`**

Create `tests/fixtures/trading-bare/postcss.config.mjs`:
```javascript
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 6: Write `globals.css`**

Create `tests/fixtures/trading-bare/src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 7: Write `layout.tsx`**

Create `tests/fixtures/trading-bare/src/app/layout.tsx`:
```typescript
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Write `page.tsx`**

Create `tests/fixtures/trading-bare/src/app/page.tsx`:
```typescript
export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold text-primary">Trading App</h1>
      <a href="/dashboard" className="text-primary underline">Go to dashboard</a>
    </main>
  );
}
```

- [ ] **Step 9: Write `dashboard/page.tsx`**

Create `tests/fixtures/trading-bare/src/app/dashboard/page.tsx`:
```typescript
import { Watchlist } from '@/components/Watchlist';

export default function Dashboard() {
  return (
    <main className="p-8">
      <h1 className="text-xl">Dashboard</h1>
      <Watchlist />
    </main>
  );
}
```

- [ ] **Step 10: Write `Watchlist.tsx`**

Create `tests/fixtures/trading-bare/src/components/Watchlist.tsx`:
```typescript
import { PriceCell } from './PriceCell';

const ROWS = [
  { symbol: 'AAPL', price: 230.12, delta: -1.23 },
  { symbol: 'MSFT', price: 412.55, delta:  2.04 },
  { symbol: 'NVDA', price: 145.81, delta:  0.51 },
];

export interface WatchlistProps {
  onSelect?: (symbol: string) => void;
}

export function Watchlist({ onSelect }: WatchlistProps) {
  return (
    <table>
      <thead>
        <tr><th>Symbol</th><th>Price</th><th>Delta</th></tr>
      </thead>
      <tbody>
        {ROWS.map(r => (
          <tr key={r.symbol} onClick={() => onSelect?.(r.symbol)}>
            <td>{r.symbol}</td>
            <td><PriceCell value={r.price} /></td>
            <td><PriceCell value={r.delta} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 11: Write `PriceCell.tsx`**

Create `tests/fixtures/trading-bare/src/components/PriceCell.tsx`:
```typescript
export interface PriceCellProps {
  value: number;
}

export function PriceCell({ value }: PriceCellProps) {
  return <span>{value.toFixed(2)}</span>;
}
```

- [ ] **Step 12: Install + smoke**

Run:
```powershell
cd tests/fixtures/trading-bare
npm install
npm run typecheck
cd ../../..
```

Expected: typecheck passes (0 errors).

- [ ] **Step 13: Smoke `boot-dev-server.ps1`**

Run:
```powershell
pwsh scripts/boot-dev-server.ps1 -ProjectRoot "tests/fixtures/trading-bare"
```

Expected: prints a URL on first stdout line, PID on second. Then run `Stop-Process -Id <PID>` to kill it.

- [ ] **Step 14: Add fixture `node_modules` to gitignore (already covered)**

Verify `tests/fixtures/**/node_modules/` glob in root `.gitignore` is honored:
```powershell
git check-ignore -v tests/fixtures/trading-bare/node_modules/next
```

Expected: prints the matching `.gitignore` line.

- [ ] **Step 15: Commit fixture**

Run:
```powershell
git add tests/fixtures/trading-bare
git commit -m "test(fixtures): add trading-bare Next+Tailwind app"
```

---

## Task 16: Build `saas-bare` fixture

**Files:**
- Mirror Task 15 structure with these distinctions: only one route (`/`), one component, default Tailwind config (no token customization). Purpose: baseline for SaaS-domain review.

- [ ] **Step 1: Copy Next/Tailwind scaffold (steps 1–7 of Task 15)**

Repeat Task 15 steps 1–7 inside `tests/fixtures/saas-bare/` with:
- `package.json.name`: `"saas-bare"`
- `tailwind.config.ts` `colors` extension: drop the `primary` override (use defaults).

- [ ] **Step 2: Write `src/app/page.tsx`**

Create `tests/fixtures/saas-bare/src/app/page.tsx`:
```typescript
import { ProjectList } from '@/components/ProjectList';

export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Projects</h1>
      <ProjectList />
    </main>
  );
}
```

- [ ] **Step 3: Write `src/components/ProjectList.tsx`**

Create `tests/fixtures/saas-bare/src/components/ProjectList.tsx`:
```typescript
const PROJECTS = [
  { id: 'p1', name: 'Onboarding', status: 'active' },
  { id: 'p2', name: 'Migration',  status: 'paused' },
];

export interface ProjectListProps {
  onOpen?: (id: string) => void;
}

export function ProjectList({ onOpen }: ProjectListProps) {
  return (
    <ul>
      {PROJECTS.map(p => (
        <li key={p.id} onClick={() => onOpen?.(p.id)}>
          {p.name} — {p.status}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Install + typecheck**

Run:
```powershell
cd tests/fixtures/saas-bare
npm install
npm run typecheck
cd ../../..
```

Expected: typecheck passes.

- [ ] **Step 5: Commit**

Run:
```powershell
git add tests/fixtures/saas-bare
git commit -m "test(fixtures): add saas-bare app"
```

---

## Task 17: Build `ecom-bare` fixture

- [ ] **Step 1: Copy scaffold per Task 15 (steps 1–7)** with name `ecom-bare`.

- [ ] **Step 2: Write `src/app/page.tsx`**

Create `tests/fixtures/ecom-bare/src/app/page.tsx`:
```typescript
import { ProductGrid } from '@/components/ProductGrid';

export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-3xl font-light">Shop</h1>
      <ProductGrid />
    </main>
  );
}
```

- [ ] **Step 3: Write `src/components/ProductGrid.tsx`**

Create `tests/fixtures/ecom-bare/src/components/ProductGrid.tsx`:
```typescript
const PRODUCTS = [
  { id: 'a', name: 'Wool Runner', price: 110 },
  { id: 'b', name: 'Tree Dasher', price: 135 },
];

export interface ProductGridProps {
  onSelect?: (id: string) => void;
}

export function ProductGrid({ onSelect }: ProductGridProps) {
  return (
    <div>
      {PRODUCTS.map(p => (
        <div key={p.id} onClick={() => onSelect?.(p.id)}>
          <strong>{p.name}</strong> ${p.price}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Install + typecheck**

Run:
```powershell
cd tests/fixtures/ecom-bare
npm install
npm run typecheck
cd ../../..
```

Expected: typecheck passes.

- [ ] **Step 5: Commit**

Run:
```powershell
git add tests/fixtures/ecom-bare
git commit -m "test(fixtures): add ecom-bare app"
```

---

## Task 18: Build `mixed-stack` fixture (stack-guard test)

- [ ] **Step 1: Write `tests/fixtures/mixed-stack/package.json`**

Create `tests/fixtures/mixed-stack/package.json`:
```json
{
  "name": "mixed-stack",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "vite"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "styled-components": "^6.1.0"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.0"
  }
}
```

- [ ] **Step 2: Write `tests/fixtures/mixed-stack/vite.config.js`**

Create `tests/fixtures/mixed-stack/vite.config.js`:
```javascript
import react from '@vitejs/plugin-react';
export default { plugins: [react()] };
```

- [ ] **Step 3: Write `index.html` and `src/main.jsx`**

Create `tests/fixtures/mixed-stack/index.html`:
```html
<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>
```

Create `tests/fixtures/mixed-stack/src/main.jsx`:
```javascript
import { createRoot } from 'react-dom/client';
import styled from 'styled-components';

const Title = styled.h1`color: tomato;`;
createRoot(document.getElementById('root')).render(<Title>Mixed</Title>);
```

- [ ] **Step 4: Commit (no install — exists only to trip stack guard)**

Run:
```powershell
git add tests/fixtures/mixed-stack
git commit -m "test(fixtures): add mixed-stack (Vite+styled-components)"
```

---

## Task 19: Build `dirty-tree` fixture (git-guard test)

- [ ] **Step 1: Copy `trading-bare` skeleton minimally**

Create `tests/fixtures/dirty-tree/package.json` with the same content as `trading-bare/package.json` but `name`: `"dirty-tree"`.

Create `tests/fixtures/dirty-tree/src/app/page.tsx`:
```typescript
export default function Home() {
  return <main>Dirty tree fixture</main>;
}
```

Create the rest of the Next+Tailwind boilerplate files identical to Task 15 steps 2–7 inside `tests/fixtures/dirty-tree/`.

- [ ] **Step 2: Initialize sub-repo at runtime via test setup**

This fixture is _used_ by `tests/run.ps1` which `git init`s the directory at test time and creates an uncommitted modification. The fixture as committed in our plugin repo is the clean baseline.

- [ ] **Step 3: Commit**

Run:
```powershell
git add tests/fixtures/dirty-tree
git commit -m "test(fixtures): add dirty-tree baseline"
```

---

## Task 20: Build `tests/run.ps1`

**Files:**
- Create: `tests/run.ps1`
- Create: `tests/MANUAL.md`

The PowerShell test runner exercises the surface that can be tested without invoking Claude end-to-end: scaffold integrity, knowledge lint, dev-server boot, screenshot batch, fixture typechecks, and stack-guard / git-guard inputs as readable preconditions.

- [ ] **Step 1: Write `tests/run.ps1`**

Create `tests/run.ps1`:
```powershell
<#
.SYNOPSIS Plugin self-tests.
#>
$ErrorActionPreference = 'Stop'

$root = Resolve-Path "$PSScriptRoot/.."
Push-Location $root
try {
  $failures = @()

  function Test-Step($name, [scriptblock]$body) {
    Write-Host "▶ $name" -ForegroundColor Cyan
    try { & $body; Write-Host "  ✓ $name" -ForegroundColor Green }
    catch {
      Write-Host "  ✗ $name : $_" -ForegroundColor Red
      $script:failures += $name
    }
  }

  Test-Step 'plugin manifest valid' {
    $m = Get-Content '.claude-plugin/plugin.json' -Raw | ConvertFrom-Json
    if (-not $m.name) { throw 'plugin.json missing name' }
  }

  Test-Step 'knowledge lint passes' {
    & node tests/lint-knowledge.mjs
    if ($LASTEXITCODE -ne 0) { throw "lint exit $LASTEXITCODE" }
  }

  Test-Step 'lint-knowledge unit tests pass' {
    & node --test tests/lint-knowledge.test.mjs
    if ($LASTEXITCODE -ne 0) { throw "test exit $LASTEXITCODE" }
  }

  Test-Step 'playwright-shoot unit tests pass' {
    & node --test scripts/playwright-shoot.test.mjs
    if ($LASTEXITCODE -ne 0) { throw "test exit $LASTEXITCODE" }
  }

  Test-Step 'fixtures typecheck' {
    foreach ($f in @('trading-bare','saas-bare','ecom-bare')) {
      Push-Location "tests/fixtures/$f"
      try {
        if (-not (Test-Path 'node_modules')) { & npm install --silent }
        & npm run typecheck --silent
        if ($LASTEXITCODE -ne 0) { throw "$f typecheck failed" }
      } finally { Pop-Location }
    }
  }

  Test-Step 'stack-guard fixture parses as non-React/Next+Tailwind' {
    $pkg = Get-Content 'tests/fixtures/mixed-stack/package.json' -Raw | ConvertFrom-Json
    if ($pkg.dependencies.next) { throw 'mixed-stack should not declare next' }
    if (-not $pkg.dependencies.'styled-components') { throw 'mixed-stack should declare styled-components' }
  }

  Test-Step 'dirty-tree fixture exists' {
    if (-not (Test-Path 'tests/fixtures/dirty-tree/package.json')) {
      throw 'dirty-tree fixture missing'
    }
  }

  if ($failures.Count -gt 0) {
    Write-Host "`n$($failures.Count) failure(s):" -ForegroundColor Red
    $failures | ForEach-Object { Write-Host "  - $_" }
    exit 1
  } else {
    Write-Host "`nAll tests passed." -ForegroundColor Green
  }
} finally { Pop-Location }
```

- [ ] **Step 2: Write `tests/MANUAL.md`**

Create `tests/MANUAL.md`:
````markdown
# Manual smoke tests

These cannot be automated without a live Claude session. Run them when you change the agent prompt or skill prompts.

## 1. Trading happy path

1. `cd tests/fixtures/trading-bare`
2. Start a fresh Claude Code session in this dir.
3. Run `/ui-master`.
4. Verify:
   - Domain detected as trading (or asked then confirmed).
   - Dev server boots, screenshots written under `.ui-master/snapshots/current/`.
   - `plan.md` references `#3b82f6` → cyan replacement and tabular-num typography for `PriceCell`.
   - `contracts.json` contains `Watchlist.props = ["onSelect"]` and `PriceCell.props = ["value"]`.
5. Approve the plan.
6. After execution: `npm run typecheck` still passes, `Watchlist` and `PriceCell` exports unchanged, branch `ui-master/<ts>` exists.

## 2. Stack guard

1. `cd tests/fixtures/mixed-stack`
2. Run `/ui-master`.
3. Verify the agent halts and offers convert / proceed-degraded / abort. Choose abort. Verify no `.ui-master/` written.

## 3. Dirty git tree

1. `cd tests/fixtures/dirty-tree`
2. `git init && git add . && git commit -m init`
3. Edit `src/app/page.tsx` to add a comment, do not commit.
4. Run `/ui-master`.
5. Verify the agent halts asking you to commit/stash before proceeding.

## 4. Unknown domain

1. Create a tiny Next+Tailwind project unrelated to seeded domains (e.g. fitness tracker).
2. Run `/ui-master`.
3. Verify the agent invokes `ui-research`, fetches references, writes a runtime knowledge doc, then proceeds.
````

- [ ] **Step 3: Run the tests**

Run:
```powershell
npm run test:plugin
```

Expected: all steps pass. (Fixture installs may take a few minutes the first time.)

- [ ] **Step 4: Commit**

Run:
```powershell
git add tests/run.ps1 tests/MANUAL.md
git commit -m "test: add plugin self-test runner and manual checklist"
```

---

## Task 21: Top-level README polish

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace `README.md` content**

Open `README.md` and replace its content with:
````markdown
# ui-master

Private Claude Code plugin: a domain-aware UI specialist agent for React/Next + Tailwind projects.

## What it does

Run `/ui-master` in any web project. The agent will:
1. Detect framework + Tailwind setup.
2. Identify the project's domain (trading, SaaS dashboard, e-commerce — or research a new one).
3. Boot the dev server and screenshot every route at three viewports.
4. Compare to seeded reference UIs (TradingView, Linear, Apple, etc.).
5. Write a phased plan to `.ui-master/plan.md` and wait for your approval.
6. On approval, apply the changes phase-by-phase, with type/test/contract checks between phases. Reverts any phase that breaks something.

Existing component contracts (exports, prop names, prop types, event handlers) are preserved. Server / API / data-fetching files are never touched without explicit per-file permission.

## Install

```bash
/plugin install <repo-url>
```

## Use

```bash
/ui-master                        # full review + execute
/ui-master --domain trading       # force domain
/ui-master --resume               # continue an interrupted run
/ui-master --fresh                # discard prior .ui-master/ and start over
```

## Seeded domains

- Trading / Stock Market
- SaaS Dashboard
- E-commerce

Add new domains under `knowledge/domains/<slug>/` per `knowledge/_schema.md`. Run `npm run lint:knowledge` to validate.

## Plugin layout

| Path | Purpose |
| ---- | ------- |
| `agents/ui-master.md` | Orchestrator subagent. |
| `skills/ui-review/`   | Detect, capture, compare. |
| `skills/ui-research/` | WebFetch fallback for unknown domains. |
| `skills/ui-execute/`  | Apply approved plan with safety gates. |
| `commands/ui-master.md` | `/ui-master` slash command. |
| `knowledge/domains/`  | Per-domain reference docs, tokens, screenshots. |
| `scripts/`            | Dev-server boot + Playwright screenshot helpers. |
| `tests/`              | Self-tests + fixture projects. |

## Tests

```bash
npm run lint:knowledge      # validate knowledge docs
npm test                    # node:test unit tests
npm run test:plugin         # full plugin self-tests (PowerShell)
```

Manual smoke tests (require a live Claude session): `tests/MANUAL.md`.

## Spec & plan

- Spec: `docs/superpowers/specs/2026-05-06-ui-master-agent-design.md`
- Plan: `docs/superpowers/plans/2026-05-06-ui-master-agent.md`
````

- [ ] **Step 2: Commit**

Run:
```powershell
git add README.md
git commit -m "docs: expand top-level README"
```

---

## Task 22: End-to-end smoke against `trading-bare`

**Files:** none — verification only.

- [ ] **Step 1: Capture at least 3 trading reference screenshots**

Open `knowledge/domains/trading/refs/MANUAL_CAPTURE.md`. Capture at minimum:
- `tradingview-chart.png`
- `tradingview-watchlist.png`
- `bloomberg-orderbook.png`

Save into `knowledge/domains/trading/refs/`.

Run:
```powershell
npm run lint:knowledge
```

Expected: trading domain no longer warns about missing PNGs.

- [ ] **Step 2: Run plugin self-tests**

Run:
```powershell
npm run test:plugin
```

Expected: all green.

- [ ] **Step 3: Manual run on `trading-bare`**

Follow `tests/MANUAL.md` §1.

- [ ] **Step 4: Commit captured refs**

Run:
```powershell
git add knowledge/domains/trading/refs/*.png
git commit -m "feat(knowledge): seed initial trading reference screenshots"
```

---

## Self-Review

**Spec coverage:**
- §1 Goal — covered by Tasks 13 (orchestrator), 10–12 (skills), 15+22 (smoke).
- §2 Distribution — Task 1 (plugin manifest, scaffold). README in Task 21.
- §3 Scope (React/Next+Tailwind, 3 domains, no native) — fixtures (Tasks 15–17), domain seeds (Tasks 6–8), stack guard (Task 18 + agent rules in Task 13).
- §4 Architecture — directory tree exists across all tasks; mapped in plan File Structure section.
- §5 Components — Tasks 13, 10, 11, 12, 14, 5, 6–8, 3, 4, 9.
- §6 Data flow + plan format — captured in `skills/ui-review` (Task 10) and `skills/ui-execute` (Task 12).
- §7 Functional preservation — codified in `ui-execute` Pre-flight + Phases (Task 12) and contracts capture in `ui-review` (Task 10).
- §8 Error handling — embedded in skill procedures (Tasks 10–12) and agent flow (Task 13).
- §9 Testing — Tasks 9, 15–20.
- §10 Knowledge seed plan — Tasks 6–8 + Task 22.
- §11 Open questions — out of scope for v1; surfaced in spec, no plan tasks (intentional).
- §12 Deliverables checklist — covered by Tasks 1–22 in aggregate.

**Placeholder scan:** plan contains no "TBD/TODO/implement later/handle edge cases/similar to Task N" markers; every code-bearing step shows full code.

**Type consistency:**
- `gaps.json` schema is defined once in spec §6.1 and referenced (not re-redefined) in skill prompts.
- `contracts.json` shape defined in spec §7.1 and referenced consistently in `ui-review` and `ui-execute`.
- `Watchlist`/`PriceCell` props match between `Watchlist.tsx` and `PriceCell.tsx` (Task 15) and the manual smoke expectations (Task 20 step 2).
- Skill names (`ui-review`, `ui-research`, `ui-execute`) match across plugin manifest (`name` field), agent delegation map, and skill SKILL.md frontmatter.

No issues to fix.
