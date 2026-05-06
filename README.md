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
