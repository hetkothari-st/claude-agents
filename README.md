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
