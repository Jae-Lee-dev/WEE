export type DashboardInboxFilter =
  | "all"
  | "affiliation"
  | "schedule"
  | "overtime"
  | "correction"
  | "anomaly"
  | "payroll";

export type DashboardTone = "green" | "blue" | "orange" | "red";

export type DashboardMetric = {
  id: Exclude<DashboardInboxFilter, "all">;
  title: string;
  value: string;
  unit: string;
  badge: string;
  tone: DashboardTone;
  inboxType: string;
};

export type DashboardInboxRow = {
  id: string;
  filter: Exclude<DashboardInboxFilter, "all">;
  type: string;
  target: string;
  location: string;
  content: string;
  date: string;
  status: string;
};

export type DashboardNotification = {
  id: string;
  label: string;
  tone: DashboardTone;
  title: string;
  date: string;
};

export const dashboardMetrics = [
  {
    id: "affiliation",
    title: "소속 신청",
    value: "4",
    unit: "개",
    badge: "승인 대기",
    tone: "green",
    inboxType: "소속 신청 대기",
  },
  {
    id: "schedule",
    title: "시간표 승인",
    value: "4",
    unit: "개",
    badge: "검토 필요",
    tone: "green",
    inboxType: "시간표 승인 대기",
  },
  {
    id: "overtime",
    title: "추가근무",
    value: "4",
    unit: "개",
    badge: "승인 대기",
    tone: "blue",
    inboxType: "추가근무 승인 대기",
  },
  {
    id: "correction",
    title: "이의신청",
    value: "4",
    unit: "개",
    badge: "처리 대기",
    tone: "orange",
    inboxType: "이의신청 처리 대기",
  },
  {
    id: "anomaly",
    title: "이상 플래그",
    value: "4",
    unit: "개",
    badge: "미처리",
    tone: "red",
    inboxType: "이상 플래그 미처리",
  },
  {
    id: "payroll",
    title: "급여 재확정",
    value: "4",
    unit: "개",
    badge: "신청 확인",
    tone: "orange",
    inboxType: "급여 재확정 필요",
  },
] as const satisfies readonly DashboardMetric[];

export const dashboardFilterOptions = [
  { id: "all", label: "전체", triggerLabel: "전체 유형" },
  { id: "affiliation", label: "소속 신청 대기", triggerLabel: "소속 신청 대기" },
  { id: "schedule", label: "시간표 승인 대기", triggerLabel: "시간표 승인 대기" },
  { id: "overtime", label: "추가근무 승인 대기", triggerLabel: "추가근무 승인 대기" },
  { id: "correction", label: "이의신청 처리 대기", triggerLabel: "이의신청 처리 대기" },
  { id: "anomaly", label: "이상 플래그 미처리", triggerLabel: "이상 플래그 미처리" },
  { id: "payroll", label: "급여 재확정 필요", triggerLabel: "급여 재확정 필요" },
] as const satisfies readonly {
  id: DashboardInboxFilter;
  label: string;
  triggerLabel: string;
}[];

const repeatedDefaultRows: DashboardInboxRow[] = [0, 1].flatMap((cycle) =>
  dashboardMetrics.map((metric) => ({
    id: `default-${cycle}-${metric.id}`,
    filter: metric.id,
    type: metric.inboxType,
    target: "김서연",
    location: "대치 A학원",
    content: "신규 조교 승인 필요",
    date: "04.15",
    status: "확인 필요",
  })),
);

const detailRowsByFilter: Record<
  Exclude<DashboardInboxFilter, "all">,
  DashboardInboxRow[]
> = {
  affiliation: [
    {
      id: "affiliation-kim-1",
      filter: "affiliation",
      type: "소속 신청 대기",
      target: "김서연",
      location: "대치 A학원",
      content: "신규 조교 승인 필요",
      date: "04.15",
      status: "확인 필요",
    },
    {
      id: "affiliation-kim-2",
      filter: "affiliation",
      type: "소속 신청 대기",
      target: "김서연",
      location: "대치 A학원",
      content: "신규 조교 승인 필요",
      date: "04.15",
      status: "확인 필요",
    },
    {
      id: "affiliation-lee",
      filter: "affiliation",
      type: "소속 신청 대기",
      target: "이민재",
      location: "강남 B학원",
      content: "변경 사유 검토 중",
      date: "04.11",
      status: "확인 필요",
    },
    {
      id: "affiliation-park",
      filter: "affiliation",
      type: "소속 신청 대기",
      target: "박지훈",
      location: "서초 C학원",
      content: "해지 승인 대기",
      date: "04.09",
      status: "확인 필요",
    },
  ],
  schedule: Array.from({ length: 4 }, (_, index) => ({
    id: `schedule-${index}`,
    filter: "schedule",
    type: "시간표 승인 대기",
    target: "김서연",
    location: "대치 A학원",
    content: "신규 조교 승인 필요",
    date: "04.15",
    status: "확인 필요",
  })),
  overtime: Array.from({ length: 4 }, (_, index) => ({
    id: `overtime-${index}`,
    filter: "overtime",
    type: "추가근무 승인 대기",
    target: "김서연",
    location: "대치 A학원",
    content: "신규 조교 승인 필요",
    date: "04.15",
    status: "확인 필요",
  })),
  correction: Array.from({ length: 4 }, (_, index) => ({
    id: `correction-${index}`,
    filter: "correction",
    type: "이의신청 처리 대기",
    target: "김서연",
    location: "대치 A학원",
    content: "신규 조교 승인 필요",
    date: "04.15",
    status: "확인 필요",
  })),
  anomaly: Array.from({ length: 4 }, (_, index) => ({
    id: `anomaly-${index}`,
    filter: "anomaly",
    type: "이상 플래그 미처리",
    target: "김서연",
    location: "대치 A학원",
    content: "신규 조교 승인 필요",
    date: "04.15",
    status: "확인 필요",
  })),
  payroll: Array.from({ length: 4 }, (_, index) => ({
    id: `payroll-${index}`,
    filter: "payroll",
    type: "급여 재확정 필요",
    target: "김서연",
    location: "대치 A학원",
    content: "신규 조교 승인 필요",
    date: "04.15",
    status: "확인 필요",
  })),
};

export const dashboardInboxRows = {
  all: repeatedDefaultRows,
  ...detailRowsByFilter,
} as const satisfies Record<DashboardInboxFilter, readonly DashboardInboxRow[]>;

export const dashboardNotifications = [
  {
    id: "notification-anomaly",
    label: "이상 플래그",
    tone: "red",
    title: "김서연 · 위치 이상 · 수학 A반",
    date: "04.15",
  },
  {
    id: "notification-correction",
    label: "이의 신청",
    tone: "orange",
    title: "김서연 ∙ 4/15 근무기록 수정 이의신청",
    date: "04.15",
  },
  {
    id: "notification-overtime",
    label: "추가 근무",
    tone: "blue",
    title: "이하은 ∙ 시험대비 보강 신청",
    date: "04.15",
  },
  {
    id: "notification-schedule",
    label: "시간표",
    tone: "green",
    title: "강태우 ∙ 시간표 최초 제출",
    date: "04.14",
  },
] as const satisfies readonly DashboardNotification[];
