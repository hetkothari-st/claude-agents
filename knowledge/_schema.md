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
