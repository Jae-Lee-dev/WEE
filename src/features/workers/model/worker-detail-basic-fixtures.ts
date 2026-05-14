export type BasicInfoRow =
  | {
      id: string;
      label: string;
      value: string;
      kind?: "text";
    }
  | {
      id: string;
      label: string;
      value: string;
      kind: "badge";
      tone: "green" | "grey";
    };

export type PayrollSettingRow = {
  id: string;
  label: string;
  value: string;
};

export type EditInfoField =
  | {
      id: string;
      label: string;
      value: string;
      layout?: "full";
    }
  | {
      id: string;
      label: string;
      value: string;
      layout: "half";
    };

export type DeleteBlockerTone = "red" | "orange" | "blue";

export type DeleteBlocker = {
  id: string;
  label: string;
  value: string;
  tone: DeleteBlockerTone;
};

export type WorkerDetailBasicFixture = {
  personalTitle: string;
  bankCopyLabel: string;
  editLabel: string;
  personalRows: readonly BasicInfoRow[];
  payrollTitle: string;
  payrollRows: readonly PayrollSettingRow[];
  editDialog: {
    title: string;
    fields: readonly EditInfoField[];
    tagLabel: string;
    tagValue: string;
    addTagLabel: string;
    payTypeLabel: string;
    payTypeOptions: readonly [string, string];
    payTypeNote: string;
    cancelLabel: string;
    saveLabel: string;
  };
  deleteBlockedDialog: {
    title: string;
    description: readonly string[];
    blockers: readonly DeleteBlocker[];
    confirmLabel: string;
  };
};

export const workerDetailBasicFixture = {
  personalTitle: "인적사항 · 계좌",
  bankCopyLabel: "통장 사본 다운로드",
  editLabel: "정보 수정",
  personalRows: [
    { id: "name", label: "이름", value: "김서연" },
    { id: "phone", label: "연락처", value: "010-1200-3400" },
    {
      id: "status",
      label: "소속 상태",
      value: "활성",
      kind: "badge",
      tone: "green",
    },
    {
      id: "tag",
      label: "근무자 태그",
      value: "베테랑",
      kind: "badge",
      tone: "grey",
    },
    { id: "registeredAt", label: "등록일", value: "2025.07.05" },
    { id: "email", label: "이메일", value: "worker1@wee.kr" },
    { id: "account", label: "계좌", value: "국민은행 123-456-789" },
  ],
  payrollTitle: "급여 설정",
  payrollRows: [
    { id: "payType", label: "급여 타입", value: "시급" },
    { id: "rate", label: "단가", value: "₩10,000 / 시간" },
    { id: "tax", label: "원천징수", value: "3.3%" },
    { id: "effectiveFrom", label: "적용 시작", value: "2026.04.01" },
  ],
  editDialog: {
    title: "조교 정보 수정",
    fields: [
      { id: "name", label: "이름", value: "김서연", layout: "full" },
      { id: "phone", label: "연락처", value: "010-1234-5678", layout: "full" },
      { id: "registeredAt", label: "등록일", value: "2025.07.05", layout: "half" },
      { id: "status", label: "소속 상태", value: "활성", layout: "half" },
    ],
    tagLabel: "근무자 태그",
    tagValue: "베테랑",
    addTagLabel: "태그 추가 +",
    payTypeLabel: "급여 타입",
    payTypeOptions: ["시급", "월급"],
    payTypeNote: "급여 설정 변경은 적용월부터 반영되며 지난 월에는 자동 소급되지 않습니다",
    cancelLabel: "취소",
    saveLabel: "저장",
  },
  deleteBlockedDialog: {
    title: "조교를 삭제할 수 없습니다",
    description: [
      "김서연 님은 다음 항목이 남아 있어 삭제할 수 없습니다.",
      "하단 항목을 모두 처리한 뒤 다시 시도해 주세요.",
    ],
    blockers: [
      { id: "anomaly", label: "미처리 이상 플래그", value: "2건", tone: "red" },
      { id: "payroll", label: "미지급 급여", value: "4월 (처리 중)", tone: "orange" },
      { id: "appeal", label: "대기 중 이의신청", value: "1건", tone: "orange" },
      { id: "overtime", label: "대기 중 추가근무", value: "1건", tone: "blue" },
    ],
    confirmLabel: "확인",
  },
} as const satisfies WorkerDetailBasicFixture;
