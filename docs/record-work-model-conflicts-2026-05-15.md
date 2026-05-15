# Work Record Model Conflict Notes

작성일: 2026-05-15

## 배경

REC-01 근무 타임라인에서 `overtimeWorks.workRecordId`가 없는 추가근무 신청이 보이지 않는 문제가 확인되었다. 운영 데이터의 추가근무 신청은 `attendanceLogId`를 정상 참조하고 있었지만, REC-01은 `workRecords`를 먼저 모은 뒤 `workRecordId`가 있는 추가근무만 해당 근무 블록에 붙이는 방식이었다.

## 현재 충돌

- 코드와 컬렉션 이름상 `workRecords`가 모든 근무 기록처럼 보이지만, 실제 REC-01 구현에서는 일반 근무/배정 근무 처리 단위로 쓰이고 있다.
- `overtimeWorks`는 별도 컬렉션이며 자체 문서 id가 추가근무 신청/처리의 key다.
- 추가근무의 필수 업무 맥락은 `attendanceLogId`, `workerId`, `extraStartAt`, `extraEndAt`이다.
- `overtimeWorks.workRecordId`는 특정 일반 근무에 이어진 추가근무를 표시하기 위한 선택적 연결값이어야 한다.
- 현재 REC-01은 선택적 연결값인 `workRecordId`를 필수처럼 사용해서, `attendanceLogId`만 있는 유효한 추가근무 신청을 타임라인과 승인/반려 액션에서 누락시켰다.

## 도메인 정리 방향

앱 도메인에서는 다음처럼 보는 것이 맞다.

```ts
type WorkRecordTimelineItem =
  | {
      type: "regular";
      id: string; // workRecords/{id}
      attendanceLogId: string | null;
    }
  | {
      type: "overtime";
      id: string; // overtimeWorks/{id}
      attendanceLogId: string | null;
      relatedWorkRecordId?: string | null;
    };
```

즉, 일반근무와 추가근무는 모두 출퇴근 기록을 참조하는 근무 처리 항목이다. 다만 현재 물리 Firestore 스키마는 `workRecords`와 `overtimeWorks`로 분리되어 있으므로, REC-01 뷰모델에서 먼저 union 형태로 다루는 것이 안전하다.

## 이번 수정 범위

이번 작업은 운영 버그 해결만 목표로 한다.

- Firestore 물리 스키마는 변경하지 않는다.
- `overtimeWorks` 문서의 기본 key는 그대로 `overtimeWorkId`로 둔다.
- `workRecordId`가 없는 `submitted` 추가근무도 `attendanceLogId` 기준으로 REC-01 타임라인에 독립 블록으로 표시한다.
- 승인/반려 액션은 추가근무의 경우 `workRecords/{id}` 조회를 선행하지 않고 `overtimeWorks/{id}`를 처리한다.
- `workRecordId`가 있는 기존 추가근무는 기존처럼 일반근무 블록에 붙인다.

## 추후 개선 태스크

1. 코드 내부 타입명을 `recordId` 중심에서 `targetType + targetId` 또는 `WorkRecordTimelineItem` union으로 정리한다.
2. `workRecords`의 의미를 일반근무 기록으로 명확히 하거나, 물리 스키마에서 `workRecords` 하위에 `type=regular | overtime` 구조로 통합할지 결정한다.
3. 결정 후 Firestore rules, indexes, seed, payroll, inbox, notification, correction flow의 참조 방식을 함께 마이그레이션한다.
4. `workRecordId` 필드를 유지한다면 이름을 `relatedWorkRecordId` 또는 `baseWorkRecordId`로 바꾸는 migration을 검토한다.

