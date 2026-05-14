import {
  createOvertimeLineSection,
  createRecordDetailLine as detailLine,
  createRecordLineSections,
} from "./record-detail-lines";

export type RecordsTabId =
  | "records"
  | "overtime-history"
  | "anomaly-history"
  | "corrections"
  | "attendance";

export type RecordsTone = "green" | "orange" | "pink" | "blue" | "grey";

export type RecordsFilterOption = {
  id: string;
  label: string;
  selected?: boolean;
};

export type RecordsTab = {
  id: RecordsTabId;
  label: string;
  count?: string;
  href: string;
};

export type RecordsMetricCard = {
  id: string;
  label: string;
  value: string;
  tone: RecordsTone;
};

export type RecordTimelineDayId =
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat"
  | "sun";

export type RecordTimelineBlockKind =
  | "normal"
  | "location-anomaly"
  | "overtime"
  | "correction";

export type RecordTimelineBlock = {
  id: string;
  dateKey?: string;
  dayId: RecordTimelineDayId;
  focusIds?: readonly string[];
  workerName: string;
  dutyName: string;
  locationName: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  startTime: string;
  endTime: string;
  kind: RecordTimelineBlockKind;
  signalKinds: readonly RecordTimelineBlockKind[];
  tone: RecordsTone;
  selectedStateId?: RecordDetailStateId;
};

export type RecordTimelineWeekNavigation = {
  initialWeekStartKey: string;
  maxWeekStartKey: string;
  minWeekStartKey: string;
};

export type RecordTimelineFixture = {
  weekLabel: string;
  weekNavigation?: RecordTimelineWeekNavigation;
  dayLabels: readonly {
    id: RecordTimelineDayId;
    label: string;
  }[];
  hourLabels: readonly string[];
  filters: Record<string, readonly RecordsFilterOption[]>;
  emptyDetailText: readonly string[];
};

export type RecordDetailStateId =
  | "empty"
  | "normal-selected"
  | "anomaly-step-1"
  | "anomaly-step-2"
  | "anomaly-step-3"
  | "anomaly-step-4";

export type RecordDetailLine = {
  id: string;
  label: string;
  value: string;
  tone?: RecordsTone;
};

export type RecordDetailLineSection = {
  id: string;
  title: string;
  lines: readonly RecordDetailLine[];
};

export type RecordDetailAction = {
  id: string;
  label: string;
  active?: boolean;
};

export type RecordProcessingAction =
  | "approve-correction"
  | "approve-overtime"
  | "delete"
  | "edit"
  | "mark-normal"
  | "reject-correction"
  | "reject-overtime";

export type RecordDetailState = {
  id: RecordDetailStateId;
  submitAction?: RecordProcessingAction;
  statusLabel?: string;
  statusTone?: RecordsTone;
  title?: string;
  lineSections?: readonly RecordDetailLineSection[];
  lines?: readonly RecordDetailLine[];
  alertText?: string;
  actions?: readonly RecordDetailAction[];
  helperText?: string;
  reasonField?: {
    label: string;
    placeholder: string;
  };
  timeFields?: readonly {
    id: string;
    label: string;
    value: string;
  }[];
  amountField?: {
    label: string;
    placeholder: string;
  };
  payrollMode?: {
    description?: string;
    label: string;
    options: readonly RecordDetailAction[];
  };
  payrollPayMode?: {
    description?: string;
    label: string;
    options: readonly RecordDetailAction[];
  };
  confirmLabel?: string;
  emptyText?: readonly string[];
};

export type RecordsTableColumn = {
  id: string;
  label: string;
};

export type AnomalyHistoryStatus = "처리 완료" | "처리 대기";

export type AnomalyHistoryRow = {
  id: string;
  status: AnomalyHistoryStatus;
  referenceDate: string;
  workerName: string;
  dutyName: string;
  anomalyType: string;
  result: string;
  payrollResult: string;
  detailButtonLabel: string;
};

export type AnomalyHistoryDetail = {
  id: string;
  badges: readonly {
    label: string;
    tone: RecordsTone;
  }[];
  title: string;
  subtitle: string;
  beforeTitle: string;
  beforeLines: readonly RecordDetailLine[];
  afterTitle: string;
  afterLines: readonly RecordDetailLine[];
  infoTitle: string;
  infoLines: readonly RecordDetailLine[];
};

export type CorrectionStatus = "승인" | "처리 대기" | "반려" | "탈퇴" | "철회";

export type CorrectionRow = {
  id: string;
  submittedAt: string;
  workerName: string;
  recordName: string;
  status: CorrectionStatus;
  result: string;
  payrollResult: string;
  detailButtonLabel: string;
};

export type CorrectionDetail = {
  id: string;
  badges: readonly {
    label: string;
    tone: RecordsTone;
  }[];
  title: string;
  subtitle: string;
  reasonTitle: string;
  reasonText: string;
  originalTitle: string;
  originalLines: readonly RecordDetailLine[];
  approvedTitle: string;
  approvedLines: readonly RecordDetailLine[];
  noteText: string;
};

export type OvertimeHistoryStatus = "신청됨" | "승인" | "반려" | "철회";

export type OvertimeHistoryRow = {
  id: string;
  submittedAt: string;
  workerName: string;
  recordName: string;
  time: string;
  status: OvertimeHistoryStatus;
  payrollResult: string;
  detailButtonLabel: string;
};

export type OvertimeHistoryDetail = {
  id: string;
  badges: readonly {
    label: string;
    tone: RecordsTone;
  }[];
  title: string;
  subtitle: string;
  reasonTitle: string;
  reasonText: string;
  requestTitle: string;
  requestLines: readonly RecordDetailLine[];
  attendanceTitle: string;
  attendanceLines: readonly RecordDetailLine[];
  resultTitle: string;
  resultLines: readonly RecordDetailLine[];
  noteText: string;
};

export type AttendanceLogStatus = "정상" | "이상";

export type AttendanceLogRow = {
  id: string;
  date: string;
  workerName: string;
  locationName: string;
  checkIn: string;
  checkOut: string;
  locationStatus: AttendanceLogStatus;
};

export type RecordMainViewModel = {
  blocks: readonly RecordTimelineBlock[];
  detailStates: Record<RecordDetailStateId, RecordDetailState>;
  detailStatesByBlockId: Record<
    string,
    Record<RecordDetailStateId, RecordDetailState>
  >;
  initialBlockId?: string | null;
  initialWeekStartKey?: string | null;
  initialDetailStateId: RecordDetailStateId;
  timeline: RecordTimelineFixture;
};

export type AnomalyHistoryViewModel = {
  details: Record<string, AnomalyHistoryDetail>;
  emptyDetailText: readonly string[];
  filters: Record<string, readonly RecordsFilterOption[]>;
  metrics: readonly RecordsMetricCard[];
  rows: readonly AnomalyHistoryRow[];
};

export type CorrectionHistoryViewModel = {
  details: Record<string, CorrectionDetail>;
  emptyDetailText: readonly string[];
  filters: Record<string, readonly RecordsFilterOption[]>;
  metrics: readonly RecordsMetricCard[];
  rows: readonly CorrectionRow[];
};

export type OvertimeHistoryViewModel = {
  details: Record<string, OvertimeHistoryDetail>;
  emptyDetailText: readonly string[];
  filters: Record<string, readonly RecordsFilterOption[]>;
  metrics: readonly RecordsMetricCard[];
  rows: readonly OvertimeHistoryRow[];
};

export type AttendanceLogViewModel = {
  columns: readonly RecordsTableColumn[];
  filters: readonly RecordsFilterOption[];
  rows: readonly AttendanceLogRow[];
};

export const recordsTabs = [
  {
    id: "records",
    label: "근무 기록",
    count: "6",
    href: "/records",
  },
  {
    id: "overtime-history",
    label: "추가근무 이력",
    href: "/records/overtime-history",
  },
  {
    id: "anomaly-history",
    label: "이상감지처리 이력",
    href: "/records/anomaly-history",
  },
  {
    id: "corrections",
    label: "이의 신청 이력",
    href: "/records/corrections",
  },
  {
    id: "attendance",
    label: "출퇴근 이력",
    href: "/records/attendance",
  },
] as const satisfies readonly RecordsTab[];

export const recordTimelineFixture = {
  weekLabel: "05.03 (일) ~ 05.09 (토)",
  dayLabels: [
    { id: "sun", label: "일" },
    { id: "mon", label: "월" },
    { id: "tue", label: "화" },
    { id: "wed", label: "수" },
    { id: "thu", label: "목" },
    { id: "fri", label: "금" },
    { id: "sat", label: "토" },
  ],
  hourLabels: [
    "08",
    "09",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
    "21",
    "22",
    "23",
    "00",
    "01",
    "02",
  ],
  filters: {
    location: [
      { id: "all", label: "조교 (전체)", selected: true },
      { id: "kim-seoyeon", label: "김서연" },
      { id: "song-hyunwoo", label: "송현우" },
      { id: "lee-haeun", label: "이하은" },
    ],
    status: [
      { id: "all", label: "상태 (전체)", selected: true },
      { id: "normal", label: "정상" },
      { id: "anomaly", label: "이상 플래그" },
      { id: "overtime", label: "추가근무 신청" },
      { id: "correction", label: "이의 신청" },
    ],
    type: [
      { id: "all", label: "전체", selected: true },
      { id: "anomaly", label: "이상 플래그" },
      { id: "overtime", label: "추가근무 신청" },
      { id: "correction", label: "이의 신청" },
    ],
  },
  emptyDetailText: ["왼쪽 리스트에서", "근무 기록을 선택하세요."],
} as const satisfies RecordTimelineFixture;

export const recordTimelineBlocks = [
  timelineBlock(
    "record-kang-taewoo-chemistry-g-mon",
    "mon",
    "강태우",
    "화학 G반",
    "대치 A학원",
    "10:00",
    "12:00",
    "overtime",
    "orange",
    "normal-selected",
  ),
  timelineBlock(
    "record-song-hyunwoo-physics-f-mon",
    "mon",
    "송현우",
    "물리 F반",
    "대치 A학원",
    "13:00",
    "15:00",
    "location-anomaly",
    "pink",
    "anomaly-step-1",
    ["correction", "location-anomaly"],
  ),
  timelineBlock(
    "record-jung-suhyun-korean-d-mon",
    "mon",
    "정수현",
    "국어 D반",
    "대치 A학원",
    "14:00",
    "16:00",
    "normal",
    "blue",
  ),
  timelineBlock(
    "record-lee-haeun-english-c-mon",
    "mon",
    "이하은",
    "영어 C반",
    "대치 A학원",
    "19:00",
    "21:00",
    "normal",
    "green",
    "normal-selected",
  ),
  timelineBlock(
    "record-lee-haeun-korean-e-wed",
    "wed",
    "이하은",
    "국어 E반",
    "송파 E학원",
    "14:00",
    "16:00",
    "normal",
    "grey",
  ),
  timelineBlock(
    "record-lee-haeun-english-c-wed",
    "wed",
    "이하은",
    "영어 C반",
    "대치 A학원",
    "19:00",
    "21:00",
    "normal",
    "grey",
  ),
  timelineBlock(
    "record-lee-haeun-korean-e-fri",
    "fri",
    "이하은",
    "국어 E반",
    "송파 E학원",
    "14:00",
    "16:00",
    "normal",
    "grey",
  ),
  timelineBlock(
    "record-lee-haeun-research-admin-sun",
    "sun",
    "이하은",
    "연구실 행정",
    "대치 A학원",
    "09:00",
    "12:00",
    "normal",
    "grey",
  ),
] as const satisfies readonly RecordTimelineBlock[];

export const recordDetailStates = {
  empty: {
    id: "empty",
    emptyText: recordTimelineFixture.emptyDetailText,
  },
  "normal-selected": {
    id: "normal-selected",
    statusLabel: "정상",
    statusTone: "green",
    title: "이하은 · 영어 C반",
    lineSections: recordLineSections({
      checkIn: "19:02",
      checkOut: "21:05",
      logStatus: "정상 (반경 내)",
      workEnd: "21:00",
      workStart: "19:00",
    }),
    actions: [
      { id: "edit", label: "수정" },
      { id: "delete", label: "삭제" },
    ],
  },
  "anomaly-step-1": {
    id: "anomaly-step-1",
    statusLabel: "위치이상",
    statusTone: "pink",
    title: "송현우 · 물리 F반",
    lineSections: recordLineSections({
      checkIn: "14:02",
      checkOut: "16:05",
      logStatus: "반경 외 152m",
      logTone: "pink",
      workEnd: "15:00",
      workStart: "13:00",
    }),
    alertText: "퇴근 시 근무지 반경(100m) 외부에서 기록되었습니다.",
    actions: [
      { id: "mark-normal", label: "정상 처리" },
      { id: "edit", label: "수정" },
      { id: "delete", label: "삭제" },
    ],
  },
  "anomaly-step-2": {
    id: "anomaly-step-2",
    statusLabel: "위치이상",
    statusTone: "pink",
    title: "송현우 · 물리 F반",
    lineSections: recordLineSections({
      checkIn: "14:02",
      checkOut: "16:05",
      logStatus: "반경 외 152m",
      logTone: "pink",
      workEnd: "15:00",
      workStart: "13:00",
    }),
    alertText: "퇴근 시 근무지 반경(100m) 외부에서 기록되었습니다.",
    actions: [
      { id: "mark-normal", label: "정상 처리", active: true },
      { id: "edit", label: "수정" },
      { id: "delete", label: "삭제" },
    ],
    helperText:
      "이상이 없다고 판단하여 플래그를 닫습니다. 근무기록은 변경되지 않습니다.",
    confirmLabel: "확인",
  },
  "anomaly-step-3": {
    id: "anomaly-step-3",
    statusLabel: "위치이상",
    statusTone: "pink",
    title: "송현우 · 물리 F반",
    lineSections: recordLineSections({
      checkIn: "14:02",
      checkOut: "16:05",
      logStatus: "반경 외 152m",
      logTone: "pink",
      workEnd: "15:00",
      workStart: "13:00",
    }),
    alertText: "퇴근 시 근무지 반경(100m) 외부에서 기록되었습니다.",
    actions: [
      { id: "mark-normal", label: "정상 처리" },
      { id: "edit", label: "수정", active: true },
      { id: "delete", label: "삭제" },
    ],
    reasonField: {
      label: "수정 사유",
      placeholder: "수정 사유를 입력하세요",
    },
    timeFields: [
      { id: "check-in", label: "근무 시작", value: "오후 01:00" },
      { id: "check-out", label: "근무 종료", value: "오후 03:00" },
    ],
    confirmLabel: "확인",
  },
  "anomaly-step-4": {
    id: "anomaly-step-4",
    statusLabel: "위치이상",
    statusTone: "pink",
    title: "송현우 · 물리 F반",
    lineSections: recordLineSections({
      checkIn: "14:02",
      checkOut: "16:05",
      logStatus: "반경 외 152m",
      logTone: "pink",
      workEnd: "15:00",
      workStart: "13:00",
    }),
    alertText: "퇴근 시 근무지 반경(100m) 외부에서 기록되었습니다.",
    actions: [
      { id: "mark-normal", label: "정상 처리" },
      { id: "edit", label: "수정" },
      { id: "delete", label: "삭제", active: true },
    ],
    helperText: "해당 근무기록이 삭제되어 결근으로 처리됩니다.",
    confirmLabel: "확인",
  },
} as const satisfies Record<RecordDetailStateId, RecordDetailState>;

const normalRecordDetailStates = {
  ...recordDetailStates,
  "anomaly-step-1": recordDetailStates["normal-selected"],
  "anomaly-step-2": {
    ...recordDetailStates["normal-selected"],
    id: "anomaly-step-2",
    confirmLabel: "확인",
    helperText: "근무기록은 변경되지 않습니다.",
  },
  "anomaly-step-3": {
    ...recordDetailStates["normal-selected"],
    id: "anomaly-step-3",
    actions: [
      { id: "edit", label: "수정", active: true },
      { id: "delete", label: "삭제" },
    ],
    confirmLabel: "확인",
    reasonField: {
      label: "수정 사유",
      placeholder: "수정 사유를 입력하세요",
    },
    timeFields: [
      { id: "check-in", label: "근무 시작", value: "오후 07:00" },
      { id: "check-out", label: "근무 종료", value: "오후 09:00" },
    ],
  },
  "anomaly-step-4": {
    ...recordDetailStates["normal-selected"],
    id: "anomaly-step-4",
    actions: [
      { id: "edit", label: "수정" },
      { id: "delete", label: "삭제", active: true },
    ],
    confirmLabel: "확인",
    helperText: "해당 근무기록이 삭제되어 결근으로 처리됩니다.",
  },
} as const satisfies Record<RecordDetailStateId, RecordDetailState>;

const overtimeRecordDetailStates = {
  ...recordDetailStates,
  "normal-selected": {
    ...recordDetailStates["normal-selected"],
    actions: [
      { id: "approve-overtime", label: "승인" },
      { id: "reject-overtime", label: "반려" },
    ],
    lineSections: overtimeLineSections(),
    statusLabel: "추가근무 신청",
    statusTone: "blue",
    title: "강태우 · 화학 G반",
  },
  "anomaly-step-3": {
    ...recordDetailStates["normal-selected"],
    actions: [
      { id: "approve-overtime", label: "승인", active: true },
      { id: "reject-overtime", label: "반려" },
    ],
    amountField: {
      label: "고정 지급액",
      placeholder: "예) 10000",
    },
    confirmLabel: "승인",
    helperText: "승인 시 추가근무 시간과 급여 처리 방식을 함께 확정합니다.",
    id: "anomaly-step-3",
    lineSections: overtimeLineSections(),
    payrollMode: {
      description:
        "급여 제외는 산정에 넣지 않고, 보류는 급여 확정 시점에 다시 결정합니다.",
      label: "급여 처리",
      options: [
        { id: "none", label: "급여 제외" },
        { id: "immediate", label: "급여 처리", active: true },
        { id: "hold", label: "보류" },
      ],
    },
    payrollPayMode: {
      description: "시급 처리는 추가근무 시간에 조교의 시급을 곱해 계산합니다.",
      label: "지급 방식",
      options: [
        { id: "fixed", label: "고정급 지급" },
        { id: "hourly", label: "시급 처리", active: true },
      ],
    },
    reasonField: {
      label: "처리 메모",
      placeholder: "처리 메모를 입력하세요",
    },
    statusLabel: "추가근무 신청",
    statusTone: "blue",
    submitAction: "approve-overtime",
    title: "강태우 · 화학 G반",
  },
  "anomaly-step-4": {
    ...recordDetailStates["normal-selected"],
    actions: [
      { id: "approve-overtime", label: "승인" },
      { id: "reject-overtime", label: "반려", active: true },
    ],
    confirmLabel: "반려",
    id: "anomaly-step-4",
    lineSections: overtimeLineSections(),
    reasonField: {
      label: "반려 사유",
      placeholder: "반려 사유를 입력하세요",
    },
    statusLabel: "추가근무 신청",
    statusTone: "blue",
    submitAction: "reject-overtime",
    title: "강태우 · 화학 G반",
  },
} as const satisfies Record<RecordDetailStateId, RecordDetailState>;

export const recordMainFixtureViewModel = {
  blocks: recordTimelineBlocks,
  detailStates: recordDetailStates,
  detailStatesByBlockId: {
    "record-kang-taewoo-chemistry-g-mon": overtimeRecordDetailStates,
    "record-lee-haeun-english-c-mon": normalRecordDetailStates,
    "record-song-hyunwoo-physics-f-mon": recordDetailStates,
  },
  initialBlockId: null,
  initialWeekStartKey: null,
  initialDetailStateId: "empty",
  timeline: recordTimelineFixture,
} as const satisfies RecordMainViewModel;

export const anomalyHistoryFilters = {
  location: [
    { id: "all", label: "조교 (전체)", selected: true },
    { id: "kim-seoyeon", label: "김서연" },
  ],
  status: [
    { id: "all", label: "처리 상태 (전체)", selected: true },
    { id: "done", label: "처리 완료" },
    { id: "pending", label: "처리 대기" },
  ],
  result: [
    { id: "all", label: "처리 결과 (전체)", selected: true },
    { id: "unchanged", label: "변경 없음" },
    { id: "edit", label: "수정" },
    { id: "delete", label: "삭제" },
  ],
  payroll: [
    { id: "all", label: "급여 반영 (전체)", selected: true },
    { id: "unchanged", label: "변경 없음" },
    { id: "immediate", label: "즉시" },
    { id: "hold", label: "보류" },
  ],
} as const satisfies Record<string, readonly RecordsFilterOption[]>;

export const anomalyHistoryMetrics = [
  { id: "submitted", label: "제출 유형", value: "6건", tone: "green" },
  { id: "pending", label: "처리 대기", value: "2건", tone: "orange" },
  { id: "edited-or-deleted", label: "수정/삭제", value: "5건", tone: "pink" },
] as const satisfies readonly RecordsMetricCard[];

export const anomalyHistoryColumns = [
  { id: "status", label: "상태" },
  { id: "referenceDate", label: "기준일" },
  { id: "workerName", label: "조교" },
  { id: "dutyName", label: "근무" },
  { id: "anomalyType", label: "이상 유형" },
  { id: "result", label: "처리 결과" },
  { id: "payrollResult", label: "급여" },
  { id: "actions", label: "기타" },
] as const satisfies readonly RecordsTableColumn[];

export const anomalyHistoryRows = [
  anomalyHistoryRow("anomaly-history-kim-seoyeon-0418-1", "처리 완료"),
  anomalyHistoryRow("anomaly-history-kim-seoyeon-0418-2", "처리 완료"),
  anomalyHistoryRow("anomaly-history-kim-seoyeon-0418-3", "처리 완료"),
  anomalyHistoryRow("anomaly-history-kim-seoyeon-0418-4", "처리 완료"),
  anomalyHistoryRow("anomaly-history-kim-seoyeon-0418-5", "처리 완료"),
  anomalyHistoryRow("anomaly-history-kim-seoyeon-0418-6", "처리 완료"),
  anomalyHistoryRow("anomaly-history-kim-seoyeon-0418-7", "처리 대기"),
  anomalyHistoryRow("anomaly-history-kim-seoyeon-0418-8", "처리 대기"),
  anomalyHistoryRow("anomaly-history-kim-seoyeon-0418-9", "처리 대기"),
  anomalyHistoryRow("anomaly-history-kim-seoyeon-0418-10", "처리 대기"),
] as const satisfies readonly AnomalyHistoryRow[];

export const selectedAnomalyHistoryDetail = {
  id: "anomaly-history-kim-seoyeon-0418-1",
  badges: [
    { label: "위치이상", tone: "pink" },
    { label: "처리 완료", tone: "green" },
  ],
  title: "김서연 · 수학 A반",
  subtitle: "2026.04.18 근무",
  beforeTitle: "처리 전",
  beforeLines: [
    detailLine("work-start", "근무 시작", "14:00"),
    detailLine("work-end", "근무 종료", "16:00"),
    detailLine("log-status", "로그 판정", "반경 외 118m"),
  ],
  afterTitle: "처리 후",
  afterLines: [
    detailLine("status", "처리", "완료"),
    detailLine("record", "근무기록", "변경 없음"),
  ],
  infoTitle: "처리 정보",
  infoLines: [
    detailLine("handler", "처리자", "김원장"),
    detailLine("academy", "학원명", "대치 A 학원"),
  ],
} as const satisfies AnomalyHistoryDetail;

export const anomalyHistoryFixtureViewModel = {
  details: {
    [selectedAnomalyHistoryDetail.id]: selectedAnomalyHistoryDetail,
  },
  emptyDetailText: ["왼쪽 리스트에서", "이상감지처리 이력을 선택하세요."],
  filters: anomalyHistoryFilters,
  metrics: anomalyHistoryMetrics,
  rows: anomalyHistoryRows,
} as const satisfies AnomalyHistoryViewModel;

export const correctionFilters = {
  location: [
    { id: "all", label: "조교 (전체)", selected: true },
    { id: "kim-seoyeon", label: "김서연" },
  ],
  status: [
    { id: "all", label: "상태 (전체)", selected: true },
    { id: "approved", label: "승인" },
    { id: "pending", label: "처리 대기" },
    { id: "rejected", label: "반려/탈퇴" },
  ],
  payroll: [
    { id: "all", label: "급여 반영 (전체)", selected: true },
    { id: "immediate", label: "즉시" },
    { id: "hold", label: "보류" },
  ],
} as const satisfies Record<string, readonly RecordsFilterOption[]>;

export const correctionMetrics = [
  { id: "submitted", label: "제출 유형", value: "6건", tone: "green" },
  { id: "pending", label: "처리 대기", value: "2건", tone: "orange" },
  { id: "approved", label: "승인", value: "5건", tone: "green" },
  {
    id: "rejected-or-withdrawn",
    label: "반려/탈퇴",
    value: "5건",
    tone: "pink",
  },
] as const satisfies readonly RecordsMetricCard[];

export const correctionColumns = [
  { id: "submittedAt", label: "제출일" },
  { id: "workerName", label: "조교" },
  { id: "recordName", label: "대상 근무기록" },
  { id: "status", label: "상태" },
  { id: "result", label: "처리 결과" },
  { id: "payrollResult", label: "급여" },
  { id: "actions", label: "기타" },
] as const satisfies readonly RecordsTableColumn[];

export const correctionRows = [
  correctionRow("correction-kim-seoyeon-0418-1", "승인"),
  correctionRow("correction-kim-seoyeon-0418-2", "승인"),
  correctionRow("correction-kim-seoyeon-0418-3", "승인"),
  correctionRow("correction-kim-seoyeon-0418-4", "승인"),
  correctionRow("correction-kim-seoyeon-0418-5", "승인"),
  correctionRow("correction-kim-seoyeon-0418-6", "승인"),
  correctionRow("correction-kim-seoyeon-0418-7", "승인"),
  correctionRow("correction-kim-seoyeon-0418-8", "승인"),
  correctionRow("correction-kim-seoyeon-0418-9", "승인"),
] as const satisfies readonly CorrectionRow[];

export const selectedCorrectionDetail = {
  id: "correction-kim-seoyeon-0418-1",
  badges: [
    { label: "승인", tone: "green" },
    { label: "즉시 급여", tone: "green" },
  ],
  title: "김서연 · 수학 A반",
  subtitle: "2026.04.18 근무",
  reasonTitle: "조교 사유",
  reasonText:
    "학생 질문 응대를 16:10부터 시작했는데 관리자 수정으로 근무 시작이 16:20으로 반영되었습니다.",
  originalTitle: "당시 기록",
  originalLines: [
    detailLine("work-start", "근무 시작", "16:20"),
    detailLine("work-end", "근무 종료", "18:00"),
    detailLine("manager-action", "관리자 처리", "10분 차감"),
  ],
  approvedTitle: "승인 결과",
  approvedLines: [
    detailLine("work-start", "근무 시작", "16:10", "green"),
    detailLine("work-end", "근무 종료", "18:00"),
    detailLine("payroll", "급여 반영", "즉시", "green"),
  ],
  noteText: "CCTV 확인 결과 16:10 이전 강의실 입실이 확인되어 승인했습니다.",
} as const satisfies CorrectionDetail;

export const correctionHistoryFixtureViewModel = {
  details: {
    [selectedCorrectionDetail.id]: selectedCorrectionDetail,
  },
  emptyDetailText: ["왼쪽 리스트에서", "이의신청 이력을 선택하세요."],
  filters: correctionFilters,
  metrics: correctionMetrics,
  rows: correctionRows,
} as const satisfies CorrectionHistoryViewModel;

export const overtimeHistoryFilters = {
  location: [
    { id: "all", label: "조교 (전체)", selected: true },
    { id: "kim-seoyeon", label: "김서연" },
    { id: "lee-haeun", label: "이하은" },
    { id: "park-junghoon", label: "박정훈" },
  ],
  status: [
    { id: "all", label: "상태 (전체)", selected: true },
    { id: "submitted", label: "신청됨" },
    { id: "approved", label: "승인" },
    { id: "rejected", label: "반려" },
    { id: "withdrawn", label: "철회" },
  ],
  period: [
    { id: "recent-30", label: "최근 30일", selected: true },
    { id: "this-month", label: "이번 달" },
    { id: "last-month", label: "지난 달" },
  ],
  payroll: [
    { id: "all", label: "급여 상태 (전체)", selected: true },
    { id: "confirmed", label: "확정" },
    { id: "held", label: "보류" },
    { id: "none", label: "급여 제외" },
    { id: "pending", label: "미정" },
  ],
} as const satisfies Record<string, readonly RecordsFilterOption[]>;

export const overtimeHistoryMetrics = [
  { id: "submitted", label: "총 신청", value: "7건", tone: "green" },
  { id: "pending", label: "승인 대기", value: "1건", tone: "orange" },
  { id: "approved", label: "승인", value: "4건", tone: "green" },
  {
    id: "rejected-or-withdrawn",
    label: "반려/철회",
    value: "2건",
    tone: "pink",
  },
] as const satisfies readonly RecordsMetricCard[];

export const overtimeHistoryColumns = [
  { id: "submittedAt", label: "신청일" },
  { id: "workerName", label: "조교" },
  { id: "recordName", label: "근무 명" },
  { id: "time", label: "시간" },
  { id: "status", label: "상태" },
  { id: "payrollResult", label: "급여" },
  { id: "actions", label: "기타" },
] as const satisfies readonly RecordsTableColumn[];

export const overtimeHistoryRows = [
  overtimeHistoryRow(
    "overtime-kim-seoyeon-0505-submitted",
    "김서연",
    "자습실 감독",
    "21:00 - 21:30",
    "신청됨",
    "미정",
  ),
  overtimeHistoryRow(
    "overtime-lee-haeun-0422-approved",
    "이하은",
    "행정 지원",
    "18:00 - 18:30",
    "승인",
    "확정",
  ),
  overtimeHistoryRow(
    "overtime-park-junghoon-0502-rejected",
    "박정훈",
    "시험 채점",
    "16:00 - 16:30",
    "반려",
    "급여 제외",
  ),
  overtimeHistoryRow(
    "overtime-choi-yujin-0418-withdrawn",
    "최유진",
    "모의고사 감독",
    "19:00 - 19:30",
    "철회",
    "급여 제외",
  ),
  overtimeHistoryRow(
    "overtime-jung-hajun-0429-held",
    "정하준",
    "야간 질의응답",
    "22:00 - 22:30",
    "승인",
    "보류",
  ),
] as const satisfies readonly OvertimeHistoryRow[];

export const selectedOvertimeHistoryDetail = {
  id: "overtime-kim-seoyeon-0505-submitted",
  badges: [
    { label: "신청됨", tone: "orange" },
    { label: "급여 미정", tone: "grey" },
  ],
  title: "김서연 · 자습실 감독",
  subtitle: "2026.05.05 추가근무 신청",
  reasonTitle: "조교 사유",
  reasonText: "학생 질문 응대가 수업 종료 이후 30분 연장되었습니다.",
  requestTitle: "신청 내용",
  requestLines: [
    detailLine("submitted-at", "신청일", "05.05 21:20"),
    detailLine("overtime-start", "추가근무 시작", "21:00"),
    detailLine("overtime-end", "추가근무 종료", "21:30"),
    detailLine("linked-record", "연결 근무", "자습실 감독"),
  ],
  attendanceTitle: "연결 출퇴근",
  attendanceLines: [
    detailLine("work-start", "근무 시작", "19:00"),
    detailLine("work-end", "근무 종료", "21:00"),
    detailLine("check-in", "출근", "18:55"),
    detailLine("check-out", "퇴근", "21:32"),
    detailLine("location", "근무지", "대치 A 학원"),
  ],
  resultTitle: "처리 결과",
  resultLines: [
    detailLine("status", "처리 상태", "승인 대기", "orange"),
    detailLine("payroll", "급여 상태", "미정"),
    detailLine("pay-mode", "지급 방식", "미정"),
    detailLine("amount", "지급액", "-"),
  ],
  noteText: "관리자 승인 또는 반려 전까지 급여 산정에는 반영되지 않습니다.",
} as const satisfies OvertimeHistoryDetail;

export const overtimeHistoryFixtureViewModel = {
  details: {
    [selectedOvertimeHistoryDetail.id]: selectedOvertimeHistoryDetail,
  },
  emptyDetailText: ["왼쪽 리스트에서", "추가근무 이력을 선택하세요."],
  filters: overtimeHistoryFilters,
  metrics: overtimeHistoryMetrics,
  rows: overtimeHistoryRows,
} as const satisfies OvertimeHistoryViewModel;

export const attendanceLogFilters = [
  { id: "all", label: "전체 로그 (20)", selected: true },
  { id: "anomaly", label: "이상 표시 (4)" },
] as const satisfies readonly RecordsFilterOption[];

export const attendanceLogColumns = [
  { id: "date", label: "날짜" },
  { id: "workerName", label: "조교" },
  { id: "locationName", label: "근무지" },
  { id: "checkIn", label: "출근" },
  { id: "checkOut", label: "퇴근" },
  { id: "locationStatus", label: "위치" },
] as const satisfies readonly RecordsTableColumn[];

export const attendanceLogRows = [
  attendanceLogRow("attendance-kim-seoyeon-0418-1", "이상"),
  attendanceLogRow("attendance-kim-seoyeon-0418-2", "정상"),
  attendanceLogRow("attendance-kim-seoyeon-0418-3", "이상"),
  attendanceLogRow("attendance-kim-seoyeon-0418-4", "정상"),
  attendanceLogRow("attendance-kim-seoyeon-0418-5", "정상"),
  attendanceLogRow("attendance-kim-seoyeon-0418-6", "정상"),
  attendanceLogRow("attendance-kim-seoyeon-0418-7", "정상"),
  attendanceLogRow("attendance-kim-seoyeon-0418-8", "정상"),
  attendanceLogRow("attendance-kim-seoyeon-0418-9", "정상"),
  attendanceLogRow("attendance-kim-seoyeon-0418-10", "정상"),
  attendanceLogRow("attendance-kim-seoyeon-0418-11", "정상"),
  attendanceLogRow("attendance-kim-seoyeon-0418-12", "정상"),
  attendanceLogRow("attendance-kim-seoyeon-0418-13", "정상"),
  attendanceLogRow("attendance-kim-seoyeon-0418-14", "정상"),
  attendanceLogRow("attendance-kim-seoyeon-0418-15", "정상"),
  attendanceLogRow("attendance-kim-seoyeon-0418-16", "정상"),
] as const satisfies readonly AttendanceLogRow[];

export const attendanceLogFixtureViewModel = {
  columns: attendanceLogColumns,
  filters: attendanceLogFilters,
  rows: attendanceLogRows,
} as const satisfies AttendanceLogViewModel;

function timelineBlock(
  id: string,
  dayId: RecordTimelineDayId,
  workerName: string,
  dutyName: string,
  locationName: string,
  startTime: string,
  endTime: string,
  kind: RecordTimelineBlockKind,
  tone: RecordsTone,
  selectedStateId?: RecordDetailStateId,
  signalKinds: readonly RecordTimelineBlockKind[] = [kind],
): RecordTimelineBlock {
  const [startHour = 0, startMinute = 0] = startTime
    .split(":")
    .map(Number);
  const [endHour = 0, endMinute = 0] = endTime.split(":").map(Number);

  return {
    id,
    dayId,
    workerName,
    dutyName,
    locationName,
    endHour,
    endMinute,
    startHour,
    startMinute,
    startTime,
    endTime,
    kind,
    signalKinds,
    tone,
    selectedStateId,
  };
}

function recordLineSections({
  checkIn,
  checkOut,
  locationName = "대치 A학원",
  logStatus,
  logTone,
  workEnd,
  workStart,
}: {
  checkIn: string;
  checkOut: string;
  locationName?: string;
  logStatus: string;
  logTone?: RecordsTone;
  workEnd: string;
  workStart: string;
}): readonly RecordDetailLineSection[] {
  return createRecordLineSections({
    checkIn,
    checkOut,
    locationName,
    logStatus,
    logTone,
    workEnd,
    workStart,
  });
}

function overtimeLineSections(): readonly RecordDetailLineSection[] {
  return [
    ...recordLineSections({
      checkIn: "10:00",
      checkOut: "12:00",
      logStatus: "정상 (반경 내)",
      workEnd: "12:00",
      workStart: "10:00",
    }),
    createOvertimeLineSection({
      overtimeEnd: "12:30",
      overtimeStart: "12:00",
      reason: "보강 수업 연장",
    }),
  ];
}

function anomalyHistoryRow(
  id: string,
  status: AnomalyHistoryStatus,
): AnomalyHistoryRow {
  return {
    id,
    status,
    referenceDate: "04.18 18:12",
    workerName: "김서연",
    dutyName: "수학 A반",
    anomalyType: "위치이상",
    result: "변경 없음",
    payrollResult: "변경 없음",
    detailButtonLabel: "상세보기",
  };
}

function correctionRow(id: string, status: CorrectionStatus): CorrectionRow {
  return {
    id,
    submittedAt: "04.18 18:12",
    workerName: "김서연",
    recordName: "수학 A반",
    status,
    result: "시작 시간 10분 소급",
    payrollResult: "즉시",
    detailButtonLabel: "상세보기",
  };
}

function overtimeHistoryRow(
  id: string,
  workerName: string,
  recordName: string,
  time: string,
  status: OvertimeHistoryStatus,
  payrollResult: string,
): OvertimeHistoryRow {
  return {
    id,
    detailButtonLabel: "상세보기",
    payrollResult,
    recordName,
    status,
    submittedAt: "05.05 21:20",
    time,
    workerName,
  };
}

function attendanceLogRow(
  id: string,
  locationStatus: AttendanceLogStatus,
): AttendanceLogRow {
  return {
    id,
    date: "04.18 18:12",
    workerName: "김서연",
    locationName: "대치 A 학원",
    checkIn: "8:55",
    checkOut: "11:02",
    locationStatus,
  };
}
