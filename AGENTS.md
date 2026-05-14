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
- Completed feature work should normally be merged back into this `develop` checkout before handoff. The user usually runs the `develop` server, so a clean committed feature worktree is not enough for review unless the user explicitly asked for handoff-only work.
- Do not add `Co-Authored-By` trailers to commits.
- Prefer small, verifiable changes. Avoid speculative abstractions and unrelated cleanup.
- Check `git status --short --branch` before and after edits.
- Run `pnpm verify` before handing off app/runtime changes; in the current Figma-first phase it covers GitHub intake self-test/verification, the phase-scope guardrail self-test, phase-scope audit, lint, typecheck, and production build.
- Run `pnpm verify:ci` when you need to mirror the full GitHub Actions gate, including the Storybook build.
- For docs-only or instruction-only changes, run at least `git diff --check`.
- Run `pnpm build-storybook` when Storybook stories or preview config change.

## Worktree And Branch Discipline

- At session start, read outer `WIP.md`, run `git worktree list` from `repos/admin-web/`, and inspect the target worktree status before editing.
- Start new feature branches from `develop` by default:
  - `cd repos/admin-web`
  - `git switch develop`
  - `git pull --ff-only` when a remote is configured and network is available
  - `git worktree add ../../worktrees/admin-web/<feature-name> -b feat/<feature-name> develop`
- After creating a feature worktree, add a root `.env.local` symlink back to the integration checkout env file when the LLM session needs to run that worktree against live Firebase:
  - `cd ../../worktrees/admin-web/<feature-name>`
  - `ln -s /Users/juni/Desktop/Personal/project/eduU/WEE/repos/admin-web/.env.local .env.local`
  - If `.env.local` already exists in the worktree, inspect it first and do not overwrite it without explicit user confirmation.
  - Restart `pnpm dev` after adding or changing the symlink. Next.js reads `.env.local`; regular shell commands only see those variables if their script loads dotenv or exports them explicitly.
  - This gives that LLM session access to the real Firebase project configured by the integration checkout. Avoid seed, approval/rejection, destructive, or broad write operations against shared Firebase data unless the task explicitly calls for them.
- Use one feature branch per worktree. Do not reuse an old worktree for a different task.
- Use slash-free kebab-case for `<feature-name>`: lowercase letters, numbers, and hyphens only. Example: `feat/button-typography` maps to `worktrees/admin-web/button-typography/`.
- Avoid stacked branches. Only branch from another feature branch when the new task truly depends on unmerged work.
- If a stacked branch is necessary, record it in outer `WIP.md` as `feat/child` depends on `feat/base`, and do not delete `feat/base` until the child branch has been rebased or merged onto `develop`.
- Worktree cleanup and branch cleanup are separate: remove the worktree after useful work is committed, merged, pushed, or preserved in a PR, but delete the branch only after it is merged into `develop`, no active branch depends on it, and it is no longer needed for review.
- Never remove, reset, or repurpose another session's active worktree unless the user explicitly asks or outer `WIP.md` marks it safe to clean.
- Before handing off, update outer `WIP.md` with the active worktree, merge/commit status, verification commands, branch dependencies, and dirty/stale worktrees.

## Develop Merge Closeout

- For merge/closeout policy, the outer root `AGENTS.md` and current outer `WIP.md` supersede stale `AGENTS.md` copies inside existing feature worktrees.
- Default closeout for a finished feature is:
  - verify in the feature worktree,
  - commit the useful changes,
  - fast-forward merge `feat/<feature-name>` into `repos/admin-web` `develop`,
  - run the appropriate post-merge check on `develop`,
  - update outer `WIP.md` with the final commit, merge status, verification, cleanup, and any remaining active worktrees.
- Use `git merge --ff-only feat/<feature-name>` from `repos/admin-web` `develop` whenever possible. If `develop` moved and fast-forward fails, the feature owner updates the feature branch from current `develop`, resolves any conflicts using their task context, reruns the relevant verification, then merges.
- A dirty `repos/admin-web` checkout is a coordination signal, not an automatic merge blocker. Compare `git diff --name-only` in `develop` with the feature branch diff. If there is no path overlap, preserve the dirty files untouched and proceed with the fast-forward merge when Git allows it.
- If dirty `develop` changes overlap the feature diff, or Git refuses the merge because local changes would be overwritten, stop and hand the blocker to the context owner: the session/worktree that made or is actively carrying the overlapping change. If unknown, record exact paths in outer `WIP.md` and ask the user to assign ownership.
- Do not leave verified feature work only in `worktrees/admin-web/<feature-name>/` as the final answer unless the user explicitly asked not to merge or a blocker prevents a safe merge.
- Merge blockers: failed or skipped required feature verification, dirty or partly uncommitted feature worktree, unresolved conflicts, unclear overlapping ownership, stacked dependency on an unmerged branch, or a user request for PR-only/handoff-only work. Record the blocker and responsible context owner in outer `WIP.md`.
- Rollbacks from `develop` should normally be done with `git revert <commit>`, not history rewrites. Call out external side effects separately for Firestore rules, seed data, migrations, or deployed resources.

## UI Rules

- Reuse existing tokens in `src/app/styles/globals.css`; do not invent raw colors when a token exists.
- Match Figma-derived components before creating new variants.
- Base icon exports in `src/shared/ui/icons.tsx` use Figma-aligned inline SVGs; sidebar shell assets live under `public/admin-shell/*`.
- The root `/` route redirects to `/dashboard`; use `/design-system` for token/component showcase work.
- Storybook stories should document component states and use realistic Korean admin-domain labels.

## Product Notes

- MVP assumes one manager per workspace.
- Global admin IA has seven primary domains: dashboard, workers, duties/schedules, work records, payroll, handover, settings.
- `DSH-01` is the operational inbox for pending manager work.
- `REC-01` is the main work-record processing surface for anomaly flags, overtime, and correction-request context.
- `PAY-01` owns payroll decisions: confirm, reconfirm, mark paid.
- `PAY-02` is read-only payroll statement review.
