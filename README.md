# Wee Admin Web

학원 강사·실장이 조교의 시간표·출퇴근·급여를 관리하는 SaaS — Wee의 관리자 대시보드.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind CSS v4 (CSS-first `@theme`)
- Pretendard (Variable, dynamic-subset)
- TypeScript 5
- Storybook 10 (`@storybook/nextjs-vite` + addon-a11y + addon-vitest)
- Vitest 4 (browser mode via Playwright)

## Getting Started

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm storybook        # http://localhost:6006
pnpm build
pnpm build-storybook
pnpm lint
```

## Design Tokens

디자인 토큰은 `src/app/globals.css`의 `@theme` 블록에 정의된다. 토큰 명세 reference 문서는 본 repo 밖 (`WEE/docs/wee-design-tokens-v1.0.md`) 에서 별도 공유된다.

루트(`/`) 페이지에 토큰 시안 (color · typography · components) 이 임시로 들어가 있다. 컴포넌트 스토리는 Storybook으로 후속 이전 예정.

## Project Notes

- 본 repo는 어드민 웹 단독. 조교 앱(Flutter), Cloud Functions 등은 별도 repo 또는 후속 디렉토리.
- SRS·IA 문서는 repo 외부에서 별도 공유.
- Next.js 16의 변경점은 `AGENTS.md` 및 `node_modules/next/dist/docs/` 참조.
