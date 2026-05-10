# AGENTS.md

## Project

Wee Admin Web is the Next.js dashboard for academy managers who operate teaching-assistant schedules, attendance, work records, overtime, correction requests, payroll, handover docs, anomaly monitoring, and workspace settings.

Authoritative product docs live outside this repo:

- `../docs/wee-srs-v2.0.md` for functional requirements and domain terms.
- `../docs/wee-admin-ia-v1.0.md` for admin navigation, screen IDs, and cross-links.
- `../docs/wee-design-tokens-v1.0.md` for design token references.
- `../WIP.md` for current branch/worktree status and next tasks.

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

This version has breaking changes. APIs, conventions, and file structure may differ from training data. Before changing Next.js routing, metadata, config, server/client component boundaries, or framework APIs, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Working Rules

- This repo is the admin web only. The Flutter assistant app, Firebase Functions, and shared docs are separate follow-up surfaces unless explicitly added.
- Keep feature work in worktrees from `develop`: `WEE/worktrees/<feature-name>/` for branch `feat/<feature-name>`.
- Do not add `Co-Authored-By` trailers to commits.
- Prefer small, verifiable changes. Avoid speculative abstractions and unrelated cleanup.
- Check `git status --short --branch` before and after edits.
- Run `pnpm lint` before handing off code changes. Run `pnpm build-storybook` when Storybook stories or preview config change.

## UI Rules

- Reuse existing tokens in `src/app/globals.css`; do not invent raw colors when a token exists.
- Match Figma-derived components before creating new variants.
- Current exact-Figma SVG extraction is still pending; `src/components/icons.tsx` contains temporary generic line icons.
- The root `/` page is a temporary token/component showcase until real app routes replace it.
- Storybook stories should document component states and use realistic Korean admin-domain labels.

## Product Notes

- MVP assumes one manager per workspace.
- Global admin IA has seven primary domains: dashboard, workers, duties/schedules, work records, payroll, handover, settings.
- `DSH-01` is the operational inbox for pending manager work.
- `REC-01` is the main work-record processing surface for anomaly flags, overtime, and correction-request context.
- `PAY-01` owns payroll decisions: confirm, reconfirm, mark paid.
- `PAY-02` is read-only payroll statement review.
