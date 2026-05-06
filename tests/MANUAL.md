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
