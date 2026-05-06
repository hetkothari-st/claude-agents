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
