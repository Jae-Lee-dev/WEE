# Playwright Button/SRS Audit - 2026-05-15

## Scope

- 대상: 로그인 이후 관리자 화면 28개 라우트.
- 기준 문서: `../../../docs/wee-srs-v2.0.md`, `../../../docs/wee-admin-ia-v1.0.md`.
- 실행 기준: `feat/button-srs-audit` worktree, develop base `0363889`, production server `http://127.0.0.1:3112`.
- 로그인 이후 상태는 Playwright init script로 `visual-admin` / `workspace_visual` / `setup-complete` localStorage를 주입했다. 이 값은 앱의 fixture data source를 사용하므로 공유 Firebase 쓰기는 발생하지 않는다.

## Evidence

| Artifact | 내용 |
| --- | --- |
| `../../../artifacts/admin-button-srs-audit-full/button-click-summary.md` | 28개 라우트 full pass. 644 click sequences, raw errors 4. |
| `../../../artifacts/admin-button-srs-audit-handover/button-click-summary.md` | HO-01 focused pass. 45 click sequences, errors 0. |
| `../../../artifacts/admin-button-srs-audit-settings/button-click-summary.md` | SET-01~05 focused pass. 171 click sequences, raw errors 5. |

실행 명령:

```bash
pnpm build
pnpm start --hostname 127.0.0.1 --port 3112
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3112 ARTIFACT_ROOT=/Users/juni/Desktop/Personal/project/eduU/WEE/artifacts/admin-button-srs-audit-full AUDIT_MAX_DEPTH=3 AUDIT_MAX_SEQUENCES=25 AUDIT_CLICK_TIMEOUT_MS=900 AUDIT_SETTLE_MS=100 AUDIT_ROUTE_NETWORK_IDLE_TIMEOUT_MS=600 node scripts/audit-admin-buttons.mjs
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3112 ARTIFACT_ROOT=/Users/juni/Desktop/Personal/project/eduU/WEE/artifacts/admin-button-srs-audit-handover AUDIT_ROUTE_IDS=HO-01 AUDIT_MAX_DEPTH=3 AUDIT_MAX_SEQUENCES=45 AUDIT_CLICK_TIMEOUT_MS=900 AUDIT_SETTLE_MS=100 AUDIT_ROUTE_NETWORK_IDLE_TIMEOUT_MS=600 node scripts/audit-admin-buttons.mjs
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3112 ARTIFACT_ROOT=/Users/juni/Desktop/Personal/project/eduU/WEE/artifacts/admin-button-srs-audit-settings AUDIT_ROUTE_IDS=SET-01,SET-02,SET-03,SET-04,SET-05 AUDIT_MAX_DEPTH=3 AUDIT_MAX_SEQUENCES=45 AUDIT_CLICK_TIMEOUT_MS=900 AUDIT_SETTLE_MS=100 AUDIT_ROUTE_NETWORK_IDLE_TIMEOUT_MS=600 node scripts/audit-admin-buttons.mjs
```

## Findings

### P1 - WKR-05 처리 대기 건의 `처리` 버튼이 no-op이다.

- 화면: `/workers/worker_kim_seoyeon/payroll`.
- Playwright: `처리` 클릭 전후 URL, dialog, heading, visible button count 변화 없음.
- 코드 근거: `src/features/workers/ui/worker-detail-payroll-screen.tsx`의 `PendingIssueRow`는 `issue.processLabel` 버튼을 렌더링하지만 `onClick` 또는 `href`가 없다.
- SRS/IA 기대: IA 7.6은 WKR-05 처리 대기 건이 처리 인터페이스까지 펼쳐진 상태이며 관리자가 이 화면에서 직접 처리한다고 정의한다.

### P1 - DSH-01 fixture 인박스 행 일부가 딥링크되지 않는다.

- 화면: `/dashboard`.
- Playwright: `소속 신청 대기`, `시간표 승인 대기`, `추가근무 승인 대기`, `이의신청 처리 대기`, `이상 플래그 미처리`, `급여 재확정 필요` 행 클릭 후 URL이 `/dashboard`에 머문다.
- 코드 근거: `DashboardInboxRow.href`가 없으면 `<button>`으로 렌더링되며, fixture `dashboardInboxRows`의 행에는 `href`가 없다.
- SRS/IA 기대: IA 7.1은 DSH-01 개별 건 클릭 시 해당 처리 화면으로 딥링크되어야 한다고 정의한다.
- 참고: Firestore data source는 `targetScreen` 기반 `href`를 생성한다. 따라서 live data가 올바른 `targetScreen`을 가지면 동작할 수 있으나, 현재 로그인 이후 fixture/demo 검수에서는 핵심 허브 동작을 검증할 수 없고 행 자체가 no-op이다.

### P1 - SET-02 사용 중 근무지 삭제가 SRS와 다르게 차단된다.

- 화면: `/settings/locations`.
- Playwright: 사용 중인 근무지의 `삭제` 클릭 시 `사용 중인 근무지는 삭제할 수 없습니다.` 모달이 열리고 확인/삭제 진행 버튼이 없다.
- SRS 기대: FR-WS-004 A2는 사용 중인 근무지가 있으면 관련 Duty/조교 영향 범위를 경고하고, 관리자가 확인하면 근무지와 관련 Duty를 소프트 삭제하며 시간표에서 제거해야 한다.
- 현재 구현은 안전하지만 SRS의 삭제 워크플로우와 다르다. 정책 변경이 아니라면 SRS 불일치다.

### P2 - DUT-02에 근무 비활성화/삭제 액션이 없다.

- 화면: `/schedule/duties/duty_english_c`.
- Playwright inventory 및 코드 확인 결과 상세에서 `기본 정보 수정`, `시간 조정`만 있고 `비활성화`, `삭제` 액션이 없다.
- SRS 기대: FR-DUTY-003, FR-DUTY-004는 근무 상세에서 비활성화/삭제를 지원해야 한다.

### P2 - DSH-04 `패턴 분석 실행`은 실제 분석 호출이 아니라 fixture 상태 전환만 한다.

- 화면: `/dashboard/ai-monitoring`.
- Playwright: `패턴 분석 실행` 클릭 후 화면은 `탐지 결과` 상태를 표시하지만 API 호출, loading, 실패 처리, 새 분석 결과 생성 증거는 없다.
- 코드 근거: 버튼은 `setLastRunPeriodId(analysisPeriodId)`만 실행한다.
- SRS 기대: FR-AD-001은 지정 기간 데이터를 수집하고 LLM API에 전달한 뒤 분석 결과 또는 실패/데이터 부족 안내를 표시해야 한다.

### P2 - 관리자 화면 전반에서 React hydration mismatch가 반복된다.

- Playwright console/pageerror: React minified error `#418`이 대부분의 관리자 라우트에서 반복 기록됐다.
- dev 서버에서는 `0건` SSR과 `24건` client fixture처럼 서버/클라이언트 초기 렌더가 달라지는 mismatch가 직접 출력됐다.
- 영향: 클릭 로직 자체를 모두 막지는 않았지만, 로그인 이후 첫 렌더가 client regeneration에 의존한다. 실제 사용자에게 깜빡임/상태 재생성/테스트 불안정을 만들 수 있다.

### P3 - 일부 dialog에서 Radix 접근성 경고가 발생한다.

- Playwright console: `DialogContent requires a DialogTitle...` 경고가 DUT-01, DUT-02, SET-01, SET-02에서 관찰됐다.
- 화면에는 제목 텍스트가 보이는 경우가 있지만 Radix가 접근성 title을 인식하지 못하는 dialog가 있다. 스크린리더 사용자 기준으로 보완 필요.

## Passed Checks

- SCH-01: `상세보기` 후 승인 상세로 전환되고, 승인/반려/시간 조정 흐름이 기존 targeted spec의 기대와 맞는다.
- REC-01: 유형 필터, 기록 선택, 이상 플래그/추가근무/이의신청 처리 모달이 열리고 full pass에서 click error 없음.
- PAY-01: 상세, 보너스/차감 추가, 미처리 건 차단, 확정 가능 상태 버튼이 SRS의 산정 작업 화면 책임과 맞는다.
- PAY-02: 명세 상세 조회는 동작하고, 확정/재확정/지급 완료 같은 결정 액션 버튼은 노출되지 않는다.
- HO-01: beforeunload dialog를 accept하도록 audit script를 고친 뒤 45 click sequences 오류 없이 통과했다. 기존 spec 기준 채팅/첨부/제안 반영/미게시 이탈 보호 흐름도 정의돼 있다.
- SET-01/03/04/05: focused pass에서 실제 사용자 액션은 저장 또는 상태 토스트까지 연결된다. raw timeout은 대부분 열린 모달/알림 패널 뒤의 배경 버튼을 다시 누른 자동 시퀀스였다.

## Raw Error 해석

- WKR-03, SET-02, SET-03의 일부 timeout은 열린 dialog overlay가 배경 버튼 클릭을 막은 것이다. 이는 정상 modal behavior이며 별도 SRS 결함으로 보지 않았다.
- SET-04의 timeout은 알림 패널/헤더와 checkbox 위치가 겹친 자동 selector 재현 문제다. 같은 checkbox를 단독 클릭한 경우 `알림 설정을 저장했습니다.` status가 표시됐다.
- HO-01 full pass의 초기 `net::ERR_ABORTED`는 audit script가 `beforeunload` dialog를 dismiss한 탓이었다. `beforeunload` accept 처리 후 focused pass에서 재현되지 않았다.
