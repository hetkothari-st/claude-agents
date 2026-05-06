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
