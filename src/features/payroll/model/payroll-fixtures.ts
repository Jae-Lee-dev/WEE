export type PayrollTabId = "calculation" | "statements";

export type PayrollTone = "default" | "green" | "orange" | "pink" | "grey";

export type PayrollAmountTone = "default" | "positive" | "negative" | "muted";

export type PayrollAdjustmentTaxScope = "pre_tax" | "post_tax";

export type PayrollCalculationStatus =
  | "미확정"
  | "확정"
  | "처리중"
  | "재확정 필요"
  | "지급 완료";

export type PayrollStatementStatus = "처리중" | "처리 완료" | "지급 완료";

export type PayrollDetailStateId = "detail" | "no-open-items";

export type PayrollRequiredSettingsFieldId =
  | "workTimeRoundingUnitMinutes"
  | "payrollRoundingUnitWon"
  | "regularPaymentDay";

export type PayrollRequiredSettingsField = {
  id: PayrollRequiredSettingsFieldId;
  label: string;
  options?: readonly {
    label: string;
    value: string;
  }[];
  suffix?: string;
  value: string;
  kind: "number" | "select";
};

export type PayrollRequiredSettingsState = {
  title: string;
  description: string;
  fields: readonly PayrollRequiredSettingsField[];
  missingFieldIds: readonly PayrollRequiredSettingsFieldId[];
  saveLabel: string;
};

export type PayrollTab = {
  id: PayrollTabId;
  label: string;
  href: string;
};

export type PayrollTableColumn = {
  id: string;
  label: string;
};

export type PayrollCalculationRow = {
  id: string;
  monthKey?: string;
  payStatementId?: string;
  workerId?: string;
  workerName: string;
  basePay: string;
  overtimePay: string;
  bonusDeduction: string;
  tax: string;
  finalPay: string;
  status: PayrollCalculationStatus;
  statusTone: PayrollTone;
  openItems: string;
  openItemsTone: PayrollTone;
  detailButtonLabel: string;
};

export type PayrollWorkerSummary = {
  id: string;
  name: string;
  tagLabel: string;
  statusLabel: string;
  hourlyPayLabel: string;
  registeredDateLabel: string;
  monthlyWorkLabel: string;
};

export type PayrollCalculationLine = {
  id: string;
  label: string;
  value: string;
  tone?: PayrollAmountTone;
};

export type PayrollAdjustmentItem = {
  id: string;
  label: string;
  amount: string;
  tone: PayrollAmountTone;
  taxScope: PayrollAdjustmentTaxScope;
  actionLabel?: string;
  statusLabel?: string;
};

export type PayrollAdjustmentForm = {
  title: string;
  itemLabel: string;
  itemPlaceholder: string;
  operatorLabel: string;
  operators: readonly {
    id: string;
    label: string;
    selected?: boolean;
  }[];
  amountLabel: string;
  amountPlaceholder: string;
  submitLabel: string;
};

export type PayrollOpenItemStatus =
  | "근무기록"
  | "이상 플래그"
  | "추가근무"
  | "이의신청"
  | "보너스/차감"
  | "재확정 필요";

export type PayrollOpenItemState = "open" | "resolved";

export type PayrollOpenItemLine = {
  id: string;
  label: string;
  value: string;
  tone?: PayrollAmountTone;
};

export type PayrollOpenItemAction = {
  href?: string;
  id: string;
  label: string;
  resolution?: {
    decision: "apply" | "exclude";
    itemId: string;
    itemType: "bonus" | "correction" | "overtime" | "workRecord";
  };
  unavailableLabel?: string;
  workRecordId?: string;
};

export type PayrollOpenItemCard = {
  id: string;
  state: PayrollOpenItemState;
  workRecordId?: string;
  dateLabel: string;
  title: string;
  locationName: string;
  timeLabel: string;
  statusLabel: PayrollOpenItemStatus;
  statusTone: PayrollTone;
  lines: readonly PayrollOpenItemLine[];
  actions: readonly PayrollOpenItemAction[];
};

export type PayrollDetailFooter = {
  title: string;
  description: string;
  actionLabel: string;
  actionDisabled: boolean;
  defaultScheduledPaymentDate?: string | null;
};

export type PayrollCalculationDetail = {
  id: PayrollDetailStateId;
  headerTitle: string;
  worker: PayrollWorkerSummary;
  calculationTitle: string;
  calculationRuleLabel: string;
  calculationRows: readonly PayrollCalculationLine[];
  expectedPayLabel: string;
  expectedPay: string;
  adjustmentItems: readonly PayrollAdjustmentItem[];
  adjustmentForm: PayrollAdjustmentForm;
  workRecordSection: {
    title: string;
    totalCount: string;
    openCount?: string;
    cards: readonly PayrollOpenItemCard[];
  };
  footer: PayrollDetailFooter;
};

export type PayrollCalculationFixture = {
  route: string;
  activeTabId: PayrollTabId;
  tabs: readonly PayrollTab[];
  selectedMonthLabel: string;
  exportLabel: string;
  listTitle: string;
  listCountText: string;
  columns: readonly PayrollTableColumn[];
  rows: readonly PayrollCalculationRow[];
  selectedRowId: string;
  requiredSettings: PayrollRequiredSettingsState;
  defaultDetailId: PayrollDetailStateId;
  detailByRowId?: Record<
    string,
    Record<PayrollDetailStateId, PayrollCalculationDetail>
  >;
  details: Record<PayrollDetailStateId, PayrollCalculationDetail>;
};

export type PayrollStatementMetric = {
  id: string;
  label: string;
  value: string;
  unit: string;
  tone: PayrollTone;
};

export type PayrollStatementRow = {
  id: string;
  monthKey?: string;
  workerName: string;
  workerId?: string;
  status: PayrollStatementStatus;
  statusTone: PayrollTone;
  confirmedAmount: string;
  confirmedDate: string;
  detailButtonLabel: string;
};

export type PayrollStatementBodyLine = {
  id: string;
  label: string;
  value: string;
  tone?: PayrollAmountTone;
};

export type PayrollStatementBodySection = {
  id: string;
  title: string;
  lines: readonly PayrollStatementBodyLine[];
};

export type PayrollStatementDetail = {
  id: string;
  headerTitle: string;
  worker: PayrollWorkerSummary;
  monthLabel: string;
  status: PayrollStatementStatus;
  statusTone: PayrollTone;
  confirmedAmount: string;
  confirmedDate: string;
  bodyState: "blank" | "ready";
  bodySections: readonly PayrollStatementBodySection[];
};

export type PayrollStatementFixture = {
  route: string;
  activeTabId: PayrollTabId;
  tabs: readonly PayrollTab[];
  selectedMonthLabel: string;
  summaryCards: readonly PayrollStatementMetric[];
  listTitle: string;
  listCountText: string;
  columns: readonly PayrollTableColumn[];
  rows: readonly PayrollStatementRow[];
  selectedRowId: string;
  requiredSettings: PayrollRequiredSettingsState;
  detailsByRowId?: Record<string, PayrollStatementDetail>;
  selectedDetail: PayrollStatementDetail;
};

const payrollTabs = [
  {
    id: "calculation",
    label: "급여 산정",
    href: "/payroll",
  },
  {
    id: "statements",
    label: "급여 명세",
    href: "/payroll/statements",
  },
] as const satisfies readonly PayrollTab[];

export const payrollRequiredSettingsFixture = {
  title: "급여 계산 기준 설정",
  description: "급여 산정에 필요한 운영 설정을 저장합니다.",
  fields: [
    {
      id: "workTimeRoundingUnitMinutes",
      label: "근무 시간 올림 단위",
      value: "6",
      suffix: "분",
      kind: "number",
    },
    {
      id: "payrollRoundingUnitWon",
      label: "급여 올림 단위",
      value: "1",
      kind: "select",
      options: [
        { value: "1", label: "원 단위" },
        { value: "10", label: "십의 자리 올림" },
        { value: "100", label: "백의 자리 올림" },
      ],
    },
    {
      id: "regularPaymentDay",
      label: "정기 지급일",
      value: "5",
      suffix: "일",
      kind: "number",
    },
  ],
  missingFieldIds: [],
  saveLabel: "저장",
} as const satisfies PayrollRequiredSettingsState;

const kimSeoyeonPayrollSummary = {
  id: "worker-kim-seoyeon",
  name: "김서연",
  tagLabel: "베테랑",
  statusLabel: "활성",
  hourlyPayLabel: "시급 \u20a910,000",
  registeredDateLabel: "2025.07.05 등록",
  monthlyWorkLabel: "당월 48시간 근무",
} as const satisfies PayrollWorkerSummary;

const payrollCalculationLines = [
  {
    id: "total-work-time",
    label: "총 근무 시간",
    value: "36시간 · 시급 \u20a910,000",
  },
  {
    id: "base-pay",
    label: "기본 지급액",
    value: "\u20a9360,000",
  },
  {
    id: "overtime",
    label: "추가근무 수당",
    value: "\u20a910,000",
  },
  {
    id: "pre-pay-adjustment",
    label: "세전 보너스/차감",
    value: "+ \u20a935,000",
    tone: "positive",
  },
  {
    id: "tax",
    label: "공제",
    value: "- \u20a911,385",
    tone: "negative",
  },
  {
    id: "post-pay-adjustment",
    label: "세후 보너스/차감",
    value: "+ \u20a920,000",
    tone: "positive",
  },
] as const satisfies readonly PayrollCalculationLine[];

const payrollAdjustmentItems = [
  {
    id: "newcomer-training-support",
    label: "신입 교육 지원",
    amount: "+ \u20a945,000",
    tone: "positive",
    taxScope: "pre_tax",
    actionLabel: "삭제",
  },
  {
    id: "late-deduction",
    label: "지각 차감",
    amount: "- \u20a910,000",
    tone: "negative",
    taxScope: "pre_tax",
    actionLabel: "삭제",
  },
  {
    id: "transport-support",
    label: "교통비 지원",
    amount: "+ \u20a920,000",
    tone: "positive",
    taxScope: "post_tax",
    actionLabel: "삭제",
  },
] as const satisfies readonly PayrollAdjustmentItem[];

const payrollAdjustmentForm = {
  title: "급여 조정 항목",
  itemLabel: "항목명",
  itemPlaceholder: "예) 야근수당",
  operatorLabel: "연산",
  operators: [
    { id: "plus", label: "+", selected: true },
    { id: "minus", label: "-" },
  ],
  amountLabel: "지급액",
  amountPlaceholder: "예) \u20a910,000",
  submitLabel: "추가",
} as const satisfies PayrollAdjustmentForm;

const unresolvedPayrollOpenItemCards = [
  {
    id: "open-anomaly-0417-lab-admin",
    state: "open",
    dateLabel: "04.17 (금)",
    title: "연구실 행정",
    locationName: "서초 B 학원",
    timeLabel: "09:00~12:00",
    statusLabel: "이상 플래그",
    statusTone: "pink",
    lines: [
      { id: "check-in", label: "출근 시각", value: "14:03" },
      { id: "check-out", label: "퇴근 시각", value: "없음", tone: "negative" },
    ],
    actions: [
      {
        id: "record",
        label: "처리하기",
        workRecordId: "record-song-hyunwoo-physics-f-mon",
      },
    ],
  },
  {
    id: "open-overtime-0418-english-c",
    state: "open",
    dateLabel: "04.18 (토)",
    title: "영어 C반",
    locationName: "잠실 C 학원",
    timeLabel: "10:00~12:00",
    statusLabel: "추가근무",
    statusTone: "orange",
    lines: [
      { id: "reason", label: "사유", value: "중간고사 보강" },
      { id: "payroll", label: "급여 처리", value: "보류", tone: "negative" },
    ],
    actions: [
      {
        id: "overtime-apply",
        label: "급여 반영",
        resolution: {
          decision: "apply",
          itemId: "open-overtime-0418-english-c",
          itemType: "overtime",
        },
      },
      {
        id: "overtime-exclude",
        label: "급여 제외",
        resolution: {
          decision: "exclude",
          itemId: "open-overtime-0418-english-c",
          itemType: "overtime",
        },
      },
    ],
  },
  {
    id: "open-correction-0420-math-a",
    state: "open",
    dateLabel: "04.20 (토)",
    title: "수학 A반",
    locationName: "대치 A 학원",
    timeLabel: "14:00~16:00",
    statusLabel: "이의신청",
    statusTone: "orange",
    lines: [
      { id: "corrected-record", label: "수정 근무기록", value: "15:30~17:00" },
      {
        id: "worker-reason",
        label: "조교 사유",
        value: "실제 15:10부터 학생 질문 응대를 시작했다고 주장",
        tone: "negative",
      },
    ],
    actions: [
      {
        id: "correction-apply",
        label: "급여 반영",
        resolution: {
          decision: "apply",
          itemId: "open-correction-0420-math-a",
          itemType: "correction",
        },
      },
      {
        id: "correction-exclude",
        label: "급여 제외",
        resolution: {
          decision: "exclude",
          itemId: "open-correction-0420-math-a",
          itemType: "correction",
        },
      },
    ],
  },
  {
    id: "open-correction-0420-math-a-repeat",
    state: "open",
    dateLabel: "04.20 (토)",
    title: "수학 A반",
    locationName: "대치 A 학원",
    timeLabel: "14:00~16:00",
    statusLabel: "이의신청",
    statusTone: "orange",
    lines: [
      { id: "corrected-record", label: "수정 근무기록", value: "15:30~17:00" },
      {
        id: "worker-reason",
        label: "조교 사유",
        value: "실제 15:10부터 학생 질문 응대를 시작했다고 주장",
        tone: "negative",
      },
    ],
    actions: [
      {
        id: "correction-repeat-apply",
        label: "급여 반영",
        resolution: {
          decision: "apply",
          itemId: "open-correction-0420-math-a-repeat",
          itemType: "correction",
        },
      },
      {
        id: "correction-repeat-exclude",
        label: "급여 제외",
        resolution: {
          decision: "exclude",
          itemId: "open-correction-0420-math-a-repeat",
          itemType: "correction",
        },
      },
    ],
  },
] as const satisfies readonly PayrollOpenItemCard[];

const resolvedPayrollOpenItemCards = [
  {
    id: "resolved-anomaly-0417-lab-admin",
    state: "resolved",
    dateLabel: "04.17 (금)",
    title: "연구실 행정",
    locationName: "서초 B 학원",
    timeLabel: "09:00~12:00",
    statusLabel: "이상 플래그",
    statusTone: "pink",
    lines: [
      { id: "check-in", label: "출근 시각", value: "14:03" },
      { id: "check-out", label: "퇴근 시각", value: "16:00", tone: "positive" },
      {
        id: "result",
        label: "반영사항",
        value: "퇴근시간 변경",
        tone: "positive",
      },
    ],
    actions: [],
  },
  {
    id: "resolved-overtime-0418-english-c",
    state: "resolved",
    dateLabel: "04.18 (토)",
    title: "영어 C반",
    locationName: "잠실 C 학원",
    timeLabel: "10:00~12:00",
    statusLabel: "추가근무",
    statusTone: "orange",
    lines: [
      { id: "reason", label: "사유", value: "중간고사 보강" },
      { id: "payroll", label: "급여 처리", value: "완료", tone: "positive" },
    ],
    actions: [],
  },
  {
    id: "resolved-correction-0420-math-a",
    state: "resolved",
    dateLabel: "04.20 (토)",
    title: "수학 A반",
    locationName: "대치 A 학원",
    timeLabel: "14:00~16:00",
    statusLabel: "이의신청",
    statusTone: "orange",
    lines: [
      { id: "before-record", label: "수정 전 근무기록", value: "14:10~16:00" },
      {
        id: "worker-reason",
        label: "조교 사유",
        value: "실제 14:00부터 학생 질문 응대를 시작했다고 주장",
      },
      {
        id: "result",
        label: "반영사항",
        value: "근무기록 변경",
        tone: "positive",
      },
    ],
    actions: [],
  },
] as const satisfies readonly PayrollOpenItemCard[];

export const payrollCalculationFixture = {
  route: "/payroll",
  activeTabId: "calculation",
  tabs: payrollTabs,
  selectedMonthLabel: "2026.04",
  exportLabel: "내보내기",
  listTitle: "조교 목록",
  listCountText: "17/20명",
  columns: [
    { id: "workerName", label: "조교" },
    { id: "basePay", label: "기본급" },
    { id: "overtimePay", label: "추가근무" },
    { id: "bonusDeduction", label: "보너스/차감" },
    { id: "tax", label: "세금" },
    { id: "finalPay", label: "최종 급여" },
    { id: "status", label: "명세 상태" },
    { id: "openItems", label: "미처리 항목" },
    { id: "actions", label: "" },
  ],
  rows: [
    calculationRow("payroll-202604-kim-seoyeon-01", "미확정", "미처리 4건"),
    calculationRow("payroll-202604-kim-seoyeon-02", "미확정", "미처리 4건"),
    calculationRow("payroll-202604-kim-seoyeon-03", "미확정", "미처리 4건"),
    calculationRow("payroll-202604-kim-seoyeon-04", "미확정", "미처리 4건"),
    calculationRow("payroll-202604-kim-seoyeon-05", "미확정", "미처리 4건"),
    calculationRow("payroll-202604-kim-seoyeon-06", "미확정", "미처리 4건"),
    calculationRow("payroll-202604-kim-seoyeon-07", "미확정", "미처리 4건"),
    calculationRow("payroll-202604-kim-seoyeon-08", "미확정", "미처리 4건"),
    calculationRow("payroll-202604-kim-seoyeon-09", "확정", "-"),
    calculationRow("payroll-202604-kim-seoyeon-10", "확정", "-"),
    calculationRow("payroll-202604-kim-seoyeon-11", "확정", "-"),
    calculationRow("payroll-202604-kim-seoyeon-12", "확정", "-"),
    calculationRow("payroll-202604-kim-seoyeon-13", "확정", "-"),
    calculationRow("payroll-202604-kim-seoyeon-14", "확정", "-"),
    calculationRow("payroll-202604-kim-seoyeon-15", "확정", "-"),
    calculationRow("payroll-202604-kim-seoyeon-16", "확정", "-"),
    calculationRow("payroll-202604-kim-seoyeon-17", "확정", "-"),
  ],
  selectedRowId: "payroll-202604-kim-seoyeon-01",
  requiredSettings: payrollRequiredSettingsFixture,
  defaultDetailId: "detail",
  details: {
    detail: {
      id: "detail",
      headerTitle: "급여 산정 목록",
      worker: kimSeoyeonPayrollSummary,
      calculationTitle: "급여 산정 내역",
      calculationRuleLabel: "근무시간 6분 단위 · 급여 원 단위",
      calculationRows: payrollCalculationLines,
      expectedPayLabel: "지급 예상액",
      expectedPay: "\u20a9353,615",
      adjustmentForm: payrollAdjustmentForm,
      adjustmentItems: payrollAdjustmentItems,
      workRecordSection: {
        title: "월 근무기록",
        totalCount: "10건",
        openCount: "미처리 4건",
        cards: unresolvedPayrollOpenItemCards,
      },
      footer: {
        title: "급여 확정하기",
        description: "미처리 항목을 처리해야 급여 확정이 가능합니다.",
        actionLabel: "급여 확정 (미처리 항목 4/4)",
        actionDisabled: true,
      },
    },
    "no-open-items": {
      id: "no-open-items",
      headerTitle: "급여 산정 목록",
      worker: kimSeoyeonPayrollSummary,
      calculationTitle: "급여 산정 내역",
      calculationRuleLabel: "근무시간 6분 단위 · 급여 원 단위",
      calculationRows: payrollCalculationLines,
      expectedPayLabel: "지급 예상액",
      expectedPay: "\u20a9353,615",
      adjustmentForm: payrollAdjustmentForm,
      adjustmentItems: payrollAdjustmentItems,
      workRecordSection: {
        title: "월 근무기록",
        totalCount: "10건",
        cards: resolvedPayrollOpenItemCards,
      },
      footer: {
        title: "급여 확정하기",
        description: "미처리 항목을 처리해야 급여 확정이 가능합니다.",
        actionLabel: "급여 확정",
        actionDisabled: false,
      },
    },
  },
} as const satisfies PayrollCalculationFixture;

export const payrollStatementFixture = {
  route: "/payroll/statements",
  activeTabId: "statements",
  tabs: payrollTabs,
  selectedMonthLabel: "2026.04",
  summaryCards: [
    {
      id: "total",
      label: "전체 명세",
      value: "14",
      unit: "건",
      tone: "default",
    },
    {
      id: "processing",
      label: "처리 중",
      value: "8",
      unit: "건",
      tone: "pink",
    },
    {
      id: "paid",
      label: "지급 완료",
      value: "6",
      unit: "건",
      tone: "green",
    },
  ],
  listTitle: "조교 목록",
  listCountText: "17/20명",
  columns: [
    { id: "workerName", label: "이름" },
    { id: "status", label: "상태" },
    { id: "confirmedAmount", label: "확정 금액" },
    { id: "confirmedDate", label: "확정일" },
    { id: "actions", label: "" },
  ],
  rows: [
    statementRow("statement-202604-kim-seoyeon-01", "처리중"),
    statementRow("statement-202604-kim-seoyeon-02", "처리중"),
    statementRow("statement-202604-kim-seoyeon-03", "처리중"),
    statementRow("statement-202604-kim-seoyeon-04", "처리중"),
    statementRow("statement-202604-kim-seoyeon-05", "처리중"),
    statementRow("statement-202604-kim-seoyeon-06", "처리중"),
    statementRow("statement-202604-kim-seoyeon-07", "처리 완료"),
    statementRow("statement-202604-kim-seoyeon-08", "처리 완료"),
    statementRow("statement-202604-kim-seoyeon-09", "처리 완료"),
    statementRow("statement-202604-kim-seoyeon-10", "처리 완료"),
    statementRow("statement-202604-kim-seoyeon-11", "처리 완료"),
    statementRow("statement-202604-kim-seoyeon-12", "처리 완료"),
    statementRow("statement-202604-kim-seoyeon-13", "처리 완료"),
    statementRow("statement-202604-kim-seoyeon-14", "처리 완료"),
  ],
  selectedRowId: "statement-202604-kim-seoyeon-01",
  requiredSettings: payrollRequiredSettingsFixture,
  selectedDetail: {
    id: "statement-202604-kim-seoyeon-01",
    headerTitle: "급여 명세 목록",
    worker: kimSeoyeonPayrollSummary,
    monthLabel: "2026년 4월",
    status: "처리중",
    statusTone: "pink",
    confirmedAmount: "\u20a9370,734",
    confirmedDate: "04.11",
    bodyState: "ready",
    bodySections: [
      {
        id: "snapshot-summary",
        title: "명세 스냅샷",
        lines: [
          { id: "final-amount", label: "최종 지급액", value: "\u20a9370,734" },
          { id: "payment-date", label: "지급 예정일", value: "05.05" },
          { id: "payroll-type", label: "급여 유형", value: "시급제" },
          { id: "setting-effective-from", label: "급여 설정 적용일", value: "2026.04.01" },
        ],
      },
      {
        id: "amount-breakdown",
        title: "금액 산정",
        lines: [
          { id: "base-pay", label: "기본급", value: "\u20a9300,000" },
          { id: "overtime-pay", label: "추가근무", value: "\u20a910,000", tone: "positive" },
          { id: "pre-tax-adjustment", label: "세전 보너스/차감", value: "+ \u20a925,000", tone: "positive" },
          { id: "tax", label: "세금", value: "\u20a911,385", tone: "negative" },
          { id: "post-tax-adjustment", label: "세후 보너스/차감", value: "+ \u20a920,000", tone: "positive" },
          { id: "bonus-count", label: "보너스/차감 건수", value: "2건" },
        ],
      },
      {
        id: "calculation-metadata",
        title: "계산 기준",
        lines: [
          { id: "payroll-setting", label: "급여 설정", value: "시급제 · 시급 \u20a910,000 · 세율 3.3%" },
          { id: "total-work-minutes", label: "근무시간 합산", value: "30시간" },
          { id: "work-rounding", label: "근무시간 올림", value: "6분 단위" },
          { id: "pay-rounding", label: "급여 올림", value: "원 단위" },
          { id: "regular-payment-day", label: "정기 지급일", value: "미설정" },
        ],
      },
    ],
  },
} as const satisfies PayrollStatementFixture;

function calculationRow(
  id: string,
  status: PayrollCalculationStatus,
  openItems: string,
): PayrollCalculationRow {
  return {
    id,
    monthKey: "2026-04",
    workerId: "worker-kim-seoyeon",
    workerName: "김서연",
    basePay: "\u20a9300,000",
    overtimePay: "\u20a910,000",
    bonusDeduction: "+ \u20a950,000",
    tax: "\u20a911,880",
    finalPay: "\u20a9348,120",
    status,
    statusTone: status === "확정" ? "green" : "grey",
    openItems,
    openItemsTone: openItems === "-" ? "default" : "orange",
    detailButtonLabel: "상세보기",
  };
}

function statementRow(
  id: string,
  status: PayrollStatementStatus,
): PayrollStatementRow {
  return {
    id,
    workerName: "김서연",
    status,
    statusTone: status === "처리 완료" ? "green" : "pink",
    confirmedAmount: "\u20a9370,734",
    confirmedDate: "04.11",
    detailButtonLabel: "상세보기",
  };
}
