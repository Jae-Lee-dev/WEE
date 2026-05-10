# AGENTS.md

## Project

Wee Admin Web is the Next.js dashboard for academy managers who operate teaching-assistant schedules, attendance, work records, overtime, correction requests, payroll, handover docs, anomaly monitoring, and workspace settings.

This repo is standalone. The outer `WEE/` directory is a local orchestration workspace, not this repo's Git root.

Local product context docs live outside this repo:

- From `repos/admin-web/`: `../../docs/wee-srs-v2.0.md`, `../../docs/wee-admin-ia-v1.0.md`, and `../../docs/wee-design-tokens-v1.0.md`.
- From `worktrees/admin-web/<feature-name>/`: `../../../docs/wee-srs-v2.0.md`, `../../../docs/wee-admin-ia-v1.0.md`, and `../../../docs/wee-design-tokens-v1.0.md`.
- Current branch/worktree memory lives in outer `WIP.md` (`../../WIP.md` from `repos/admin-web/`, `../../../WIP.md` from feature worktrees).

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS v4 with CSS-first `@theme`
- TypeScript 5
- Storybook 10 with `@storybook/nextjs-vite`
- Vitest 4 browser mode via Playwright

<!-- BEGIN:nextjs-agent-rules -->

## Next.js 16 Rule

This is NOT the Next.js you know.

This version has breaking changes. APIs, conventions, and file structure may differ from training data. Before changing Next.js routing, metadata, config, server/client component boundaries, or framework APIs, read the relevant guide in `node_modules/next/dist/docs/` in the active repo/worktree and heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Working Rules

- This repo is the admin web only. The Flutter assistant app, Firebase Functions, and shared docs are separate follow-up surfaces unless explicitly added.
- Treat `repos/admin-web/` as the `develop` integration checkout. Do feature edits in `worktrees/admin-web/<feature-name>/`, not directly in `repos/admin-web/`, unless the user asks for a small integration-only change.
- Do not add `Co-Authored-By` trailers to commits.
- Prefer small, verifiable changes. Avoid speculative abstractions and unrelated cleanup.
- Check `git status --short --branch` before and after edits.
- Run `pnpm lint` before handing off code changes. Run `pnpm exec tsc --noEmit` for TypeScript-sensitive changes. Run `pnpm build-storybook` when Storybook stories or preview config change.

## Worktree And Branch Discipline

- At session start, read outer `WIP.md`, run `git worktree list` from `repos/admin-web/`, and inspect the target worktree status before editing.
- Start new feature branches from `develop` by default:
  - `cd repos/admin-web`
  - `git switch develop`
  - `git pull --ff-only` when a remote is configured and network is available
  - `git worktree add ../../worktrees/admin-web/<feature-name> -b feat/<feature-name> develop`
- Use one feature branch per worktree. Do not reuse an old worktree for a different task.
- Use slash-free kebab-case for `<feature-name>`: lowercase letters, numbers, and hyphens only. Example: `feat/button-typography` maps to `worktrees/admin-web/button-typography/`.
- Avoid stacked branches. Only branch from another feature branch when the new task truly depends on unmerged work.
- If a stacked branch is necessary, record it in outer `WIP.md` as `feat/child` depends on `feat/base`, and do not delete `feat/base` until the child branch has been rebased or merged onto `develop`.
- Worktree cleanup and branch cleanup are separate: remove the worktree after useful work is committed, merged, pushed, or preserved in a PR, but delete the branch only after it is merged into `develop`, no active branch depends on it, and it is no longer needed for review.
- Never remove, reset, or repurpose another session's active worktree unless the user explicitly asks or outer `WIP.md` marks it safe to clean.
- Before handing off, update outer `WIP.md` with the active worktree, merge/commit status, verification commands, branch dependencies, and dirty/stale worktrees.

## UI Rules

- Reuse existing tokens in `src/app/globals.css`; do not invent raw colors when a token exists.
- Match Figma-derived components before creating new variants.
- Base icon exports in `src/components/icons.tsx` use Figma-aligned inline SVGs; sidebar shell assets live under `public/admin-shell/*`.
- The root `/` route redirects to `/dashboard`; use `/design-system` for token/component showcase work.
- Storybook stories should document component states and use realistic Korean admin-domain labels.

## Product Notes

- MVP assumes one manager per workspace.
- Global admin IA has seven primary domains: dashboard, workers, duties/schedules, work records, payroll, handover, settings.
- `DSH-01` is the operational inbox for pending manager work.
- `REC-01` is the main work-record processing surface for anomaly flags, overtime, and correction-request context.
- `PAY-01` owns payroll decisions: confirm, reconfirm, mark paid.
- `PAY-02` is read-only payroll statement review.
