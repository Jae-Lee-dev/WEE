# Wee Admin Web

학원 강사·실장이 조교의 시간표·출퇴근·급여를 관리하는 SaaS — Wee의 관리자 대시보드.

## Stack

- Next.js 16 (App Router; local dev uses Webpack via `pnpm dev`)
- React 19
- Tailwind CSS v4 (CSS-first `@theme`)
- Pretendard (Variable, dynamic-subset)
- TypeScript 5
- Storybook 10 (`@storybook/nextjs-vite` + addon-a11y + addon-vitest)
- Vitest 4 (browser mode via Playwright)

## Getting Started

Recommended runtime:

- Node.js 22 (`.nvmrc`)
- pnpm 10.28.2 (`packageManager`)

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm dev:turbo        # Turbopack dev server, kept for explicit reproduction/debugging
pnpm storybook        # http://localhost:6006
pnpm lint
pnpm typecheck
pnpm build
pnpm verify:intake:self-test
pnpm verify:intake
pnpm verify:phase-scope:self-test
pnpm verify:phase-scope
pnpm verify           # intake self-test + intake + phase-scope self-test + audit + lint + typecheck + build
pnpm build-storybook
```

## Design Tokens

디자인 토큰은 `src/app/globals.css`의 `@theme` 블록에 정의된다. 토큰 명세 reference 문서는 본 repo 밖 (`WEE/docs/wee-design-tokens-v1.0.md`) 에서 별도 공유된다.

루트(`/`)는 `/dashboard`로 redirect된다. 토큰·컴포넌트 쇼케이스는 `/design-system`과 Storybook에서 확인한다.

## CI

GitHub Actions workflow는 `.github/workflows/ci.yml`에 있으며 `develop`/`main` push와 pull request에서 실행된다.

```bash
pnpm install --frozen-lockfile
pnpm verify
```

During the current Figma-first static UI phase, `pnpm verify` starts with GitHub intake self-test/verification, the phase-scope guardrail self-test, and `pnpm verify:phase-scope` to fail on unstructured process changes or accidental Firebase/backend/server/data-access additions before lint, typecheck, and build.

## Project Notes

- 본 repo는 어드민 웹 단독. 조교 앱(Flutter), Cloud Functions 등은 별도 repo 또는 후속 디렉토리.
- SRS·IA 문서는 repo 외부에서 별도 공유.
- Next.js 16의 변경점은 `AGENTS.md` 및 `node_modules/next/dist/docs/` 참조.
- 현재 화면 구현 phase는 Figma-first static UI에 집중한다. Firebase, CRUD, 승인/반려/확정 같은 실제 상태 전이는 후속 phase에서 다룬다.
