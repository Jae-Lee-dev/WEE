export type DashboardInboxFilter =
  | "all"
  | "affiliation"
  | "schedule"
  | "overtime"
  | "correction"
  | "anomaly"
  | "payroll";

export type DashboardTone = "green" | "blue" | "orange" | "red";
export type DashboardMetricTone = DashboardTone | "grey";

export type DashboardActionType =
  | "open-affiliation-application"
  | "open-schedule-approval"
  | "open-overtime-approval"
  | "open-correction-request"
  | "open-anomaly-record"
  | "open-payroll-calculation"
  | "open-worker-summary"
  | "open-ai-pattern-record";

export type DashboardRecordType =
  | "affiliation-application"
  | "schedule-request"
  | "overtime-request"
  | "correction-request"
  | "attendance-record"
  | "payroll-calculation"
  | "worker-attendance-summary"
  | "ai-pattern";

export type DashboardActionMeta = {
  actionType: DashboardActionType;
  targetId: string;
  recordType: DashboardRecordType;
};

export type DashboardMetric = {
  id: Exclude<DashboardInboxFilter, "all">;
  title: string;
  tone: DashboardTone;
  inboxType: string;
};

export type DashboardInboxRow = {
  id: string;
  filter: Exclude<DashboardInboxFilter, "all">;
  type: string;
  target: string;
  location: string;
  date: string;
  status: string;
  href?: string;
  action: DashboardActionMeta;
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
    tone: "green",
    inboxType: "소속 신청 대기",
  },
  {
    id: "schedule",
    title: "시간표 승인",
    tone: "green",
    inboxType: "시간표 승인 대기",
  },
  {
    id: "overtime",
    title: "추가근무",
    tone: "blue",
    inboxType: "추가근무 승인 대기",
  },
  {
    id: "correction",
    title: "이의신청",
    tone: "orange",
    inboxType: "이의신청 처리 대기",
  },
  {
    id: "anomaly",
    title: "이상 플래그",
    tone: "red",
    inboxType: "이상 플래그 미처리",
  },
  {
    id: "payroll",
    title: "급여 재확정",
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

const inboxActionByFilter = {
  affiliation: {
    actionType: "open-affiliation-application",
    recordType: "affiliation-application",
  },
  schedule: {
    actionType: "open-schedule-approval",
    recordType: "schedule-request",
  },
  overtime: {
    actionType: "open-overtime-approval",
    recordType: "overtime-request",
  },
  correction: {
    actionType: "open-correction-request",
    recordType: "correction-request",
  },
  anomaly: {
    actionType: "open-anomaly-record",
    recordType: "attendance-record",
  },
  payroll: {
    actionType: "open-payroll-calculation",
    recordType: "payroll-calculation",
  },
} as const satisfies Record<
  Exclude<DashboardInboxFilter, "all">,
  Pick<DashboardActionMeta, "actionType" | "recordType">
>;

const defaultInboxTargets = [
  {
    target: "김서연",
    targetId: "worker_kim_seoyeon",
    location: "대치 A학원",
    date: "04.15",
  },
  {
    target: "이민재",
    targetId: "worker_lee_minjae",
    location: "강남 B학원",
    date: "04.14",
  },
  {
    target: "박지훈",
    targetId: "worker_park_jihun",
    location: "서초 C학원",
    date: "04.13",
  },
  {
    target: "최민준",
    targetId: "worker_choi_minjun",
    location: "잠실 C학원",
    date: "04.12",
  },
] as const;

function inboxRow({
  date,
  filter,
  id,
  location,
  target,
  targetId,
}: {
  id: string;
  filter: Exclude<DashboardInboxFilter, "all">;
  target: string;
  targetId: string;
  location: string;
  date: string;
}): DashboardInboxRow {
  const metric = dashboardMetrics.find((item) => item.id === filter);
  const action = inboxActionByFilter[filter];

  return {
    id,
    filter,
    type: metric?.inboxType ?? "확인 필요",
    target,
    location,
    date,
    status: "확인 필요",
    action: {
      ...action,
      targetId,
    },
  };
}

const repeatedDefaultRows: DashboardInboxRow[] = Array.from(
  { length: 4 },
  (_, cycle) =>
    dashboardMetrics.map((metric, metricIndex) => {
      const target = defaultInboxTargets[(cycle + metricIndex) % defaultInboxTargets.length];

      return inboxRow({
        id: `default-${cycle}-${metric.id}`,
        filter: metric.id,
        target: target.target,
        targetId: target.targetId,
        location: target.location,
        date: target.date,
      });
    }),
).flat();

const detailRowsByFilter: Record<
  Exclude<DashboardInboxFilter, "all">,
  DashboardInboxRow[]
> = {
  affiliation: [
    inboxRow({
      id: "affiliation-kim",
      filter: "affiliation",
      target: "김서연",
      targetId: "worker_kim_seoyeon",
      location: "대치 A학원",
      date: "04.15",
    }),
    inboxRow({
      id: "affiliation-lee",
      filter: "affiliation",
      target: "이민재",
      targetId: "worker_lee_minjae",
      location: "강남 B학원",
      date: "04.11",
    }),
    inboxRow({
      id: "affiliation-park",
      filter: "affiliation",
      target: "박지훈",
      targetId: "worker_park_jihun",
      location: "서초 C학원",
      date: "04.09",
    }),
    inboxRow({
      id: "affiliation-yoon",
      filter: "affiliation",
      target: "윤지아",
      targetId: "worker_yoon_jia",
      location: "송파 E학원",
      date: "04.08",
    }),
  ],
  schedule: [
    inboxRow({
      id: "schedule-kim",
      filter: "schedule",
      target: "김서연",
      targetId: "worker_kim_seoyeon",
      location: "대치 A학원",
      date: "04.15",
    }),
    inboxRow({
      id: "schedule-kang",
      filter: "schedule",
      target: "강태우",
      targetId: "worker_kang_taewoo",
      location: "대치 A학원",
      date: "04.14",
    }),
    inboxRow({
      id: "schedule-han",
      filter: "schedule",
      target: "한소희",
      targetId: "worker_han_sohee",
      location: "서초 C학원",
      date: "04.12",
    }),
    inboxRow({
      id: "schedule-im",
      filter: "schedule",
      target: "임수빈",
      targetId: "worker_im_subin",
      location: "잠실 C학원",
      date: "04.10",
    }),
  ],
  overtime: [
    inboxRow({
      id: "overtime-lee",
      filter: "overtime",
      target: "이하은",
      targetId: "worker_lee_haeun",
      location: "대치 A학원",
      date: "04.15",
    }),
    inboxRow({
      id: "overtime-choi",
      filter: "overtime",
      target: "최민준",
      targetId: "worker_choi_minjun",
      location: "잠실 C학원",
      date: "04.14",
    }),
    inboxRow({
      id: "overtime-yoon",
      filter: "overtime",
      target: "윤지아",
      targetId: "worker_yoon_jia",
      location: "송파 E학원",
      date: "04.12",
    }),
    inboxRow({
      id: "overtime-jo",
      filter: "overtime",
      target: "조영민",
      targetId: "worker_jo_youngmin",
      location: "강남 B학원",
      date: "04.10",
    }),
  ],
  correction: [
    inboxRow({
      id: "correction-kim",
      filter: "correction",
      target: "김서연",
      targetId: "worker_kim_seoyeon",
      location: "대치 A학원",
      date: "04.15",
    }),
    inboxRow({
      id: "correction-park",
      filter: "correction",
      target: "박지훈",
      targetId: "worker_park_jihun",
      location: "잠실 C학원",
      date: "04.13",
    }),
    inboxRow({
      id: "correction-han",
      filter: "correction",
      target: "한소희",
      targetId: "worker_han_sohee",
      location: "서초 C학원",
      date: "04.12",
    }),
    inboxRow({
      id: "correction-im",
      filter: "correction",
      target: "임수빈",
      targetId: "worker_im_subin",
      location: "강남 B학원",
      date: "04.11",
    }),
  ],
  anomaly: [
    inboxRow({
      id: "anomaly-jung",
      filter: "anomaly",
      target: "정수현",
      targetId: "worker_jung_suhyun",
      location: "대치 A학원",
      date: "04.15",
    }),
    inboxRow({
      id: "anomaly-choi",
      filter: "anomaly",
      target: "최민준",
      targetId: "worker_choi_minjun",
      location: "잠실 C학원",
      date: "04.14",
    }),
    inboxRow({
      id: "anomaly-kang",
      filter: "anomaly",
      target: "강태우",
      targetId: "worker_kang_taewoo",
      location: "대치 A학원",
      date: "04.12",
    }),
    inboxRow({
      id: "anomaly-yoon",
      filter: "anomaly",
      target: "윤지아",
      targetId: "worker_yoon_jia",
      location: "송파 E학원",
      date: "04.09",
    }),
  ],
  payroll: [
    inboxRow({
      id: "payroll-choi",
      filter: "payroll",
      target: "최민준",
      targetId: "worker_choi_minjun",
      location: "잠실 C학원",
      date: "04.15",
    }),
    inboxRow({
      id: "payroll-kim",
      filter: "payroll",
      target: "김서연",
      targetId: "worker_kim_seoyeon",
      location: "대치 A학원",
      date: "04.14",
    }),
    inboxRow({
      id: "payroll-han",
      filter: "payroll",
      target: "한소희",
      targetId: "worker_han_sohee",
      location: "서초 C학원",
      date: "04.12",
    }),
    inboxRow({
      id: "payroll-im",
      filter: "payroll",
      target: "임수빈",
      targetId: "worker_im_subin",
      location: "강남 B학원",
      date: "04.10",
    }),
  ],
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

export type DashboardSelectOption<T extends string> = {
  id: T;
  label: string;
};

export type DashboardLocationId = string;

export type DashboardLocationPeriodId = string;

export type DashboardLocationSummary = {
  totalHours: number;
  activeWorkers: number;
  unresolvedFlags: number;
  lateRate: number;
};

export type DashboardLocationWorkerRow = {
  id: string;
  workerName: string;
  workerId: string;
  workHours: number;
  lateCount: number;
  locationAnomalyCount: number;
  absenceCount: number;
  anomalyRate: number;
  action: DashboardActionMeta;
};

export const dashboardLocationOptions = [
  { id: "daechi", label: "대치 A학원" },
  { id: "seocho", label: "서초 B학원" },
  { id: "jamsil", label: "잠실 C학원" },
  { id: "gangnam", label: "강남 D학원" },
  { id: "songpa", label: "송파 E학원" },
] as const satisfies readonly DashboardSelectOption<DashboardLocationId>[];

export const dashboardLocationPeriodOptions = [
  { id: "2026-04", label: "2026년 4월" },
  { id: "2026-03", label: "2026년 3월" },
  { id: "2026-02", label: "2026년 2월" },
] as const satisfies readonly DashboardSelectOption<DashboardLocationPeriodId>[];

export const dashboardLocationSummaries = {
  daechi: {
    "2026-04": { totalHours: 312, activeWorkers: 8, unresolvedFlags: 4, lateRate: 6.2 },
    "2026-03": { totalHours: 294, activeWorkers: 8, unresolvedFlags: 3, lateRate: 5.8 },
    "2026-02": { totalHours: 276, activeWorkers: 7, unresolvedFlags: 2, lateRate: 4.9 },
  },
  seocho: {
    "2026-04": { totalHours: 198, activeWorkers: 5, unresolvedFlags: 2, lateRate: 3.8 },
    "2026-03": { totalHours: 214, activeWorkers: 5, unresolvedFlags: 1, lateRate: 2.7 },
    "2026-02": { totalHours: 188, activeWorkers: 4, unresolvedFlags: 2, lateRate: 3.2 },
  },
  jamsil: {
    "2026-04": { totalHours: 240, activeWorkers: 6, unresolvedFlags: 5, lateRate: 8.1 },
    "2026-03": { totalHours: 226, activeWorkers: 6, unresolvedFlags: 4, lateRate: 7.4 },
    "2026-02": { totalHours: 208, activeWorkers: 5, unresolvedFlags: 3, lateRate: 6.8 },
  },
  gangnam: {
    "2026-04": { totalHours: 174, activeWorkers: 4, unresolvedFlags: 1, lateRate: 2.5 },
    "2026-03": { totalHours: 182, activeWorkers: 4, unresolvedFlags: 1, lateRate: 2.1 },
    "2026-02": { totalHours: 168, activeWorkers: 4, unresolvedFlags: 0, lateRate: 1.8 },
  },
  songpa: {
    "2026-04": { totalHours: 156, activeWorkers: 4, unresolvedFlags: 3, lateRate: 5.0 },
    "2026-03": { totalHours: 148, activeWorkers: 4, unresolvedFlags: 2, lateRate: 4.2 },
    "2026-02": { totalHours: 132, activeWorkers: 3, unresolvedFlags: 2, lateRate: 4.7 },
  },
} as const satisfies Record<
  DashboardLocationId,
  Record<DashboardLocationPeriodId, DashboardLocationSummary>
>;

function locationWorkerRow({
  absenceCount,
  anomalyRate,
  lateCount,
  locationAnomalyCount,
  workHours,
  workerId,
  workerName,
}: Omit<DashboardLocationWorkerRow, "id" | "action">): DashboardLocationWorkerRow {
  return {
    id: `${workerId}-attendance`,
    workerId,
    workerName,
    workHours,
    lateCount,
    locationAnomalyCount,
    absenceCount,
    anomalyRate,
    action: {
      actionType: "open-worker-summary",
      targetId: workerId,
      recordType: "worker-attendance-summary",
    },
  };
}

export const dashboardLocationWorkerRows = {
  daechi: [
    locationWorkerRow({
      workerName: "김서연",
      workerId: "worker_kim_seoyeon",
      workHours: 48,
      lateCount: 1,
      locationAnomalyCount: 1,
      absenceCount: 0,
      anomalyRate: 4.2,
    }),
    locationWorkerRow({
      workerName: "박지훈",
      workerId: "worker_park_jihun",
      workHours: 42,
      lateCount: 0,
      locationAnomalyCount: 0,
      absenceCount: 0,
      anomalyRate: 0,
    }),
    locationWorkerRow({
      workerName: "최민준",
      workerId: "worker_choi_minjun",
      workHours: 36,
      lateCount: 2,
      locationAnomalyCount: 1,
      absenceCount: 0,
      anomalyRate: 8.3,
    }),
    locationWorkerRow({
      workerName: "한소희",
      workerId: "worker_han_sohee",
      workHours: 40,
      lateCount: 0,
      locationAnomalyCount: 1,
      absenceCount: 0,
      anomalyRate: 2.5,
    }),
    locationWorkerRow({
      workerName: "강태우",
      workerId: "worker_kang_taewoo",
      workHours: 32,
      lateCount: 1,
      locationAnomalyCount: 0,
      absenceCount: 1,
      anomalyRate: 6.3,
    }),
    locationWorkerRow({
      workerName: "윤지아",
      workerId: "worker_yoon_jia",
      workHours: 44,
      lateCount: 0,
      locationAnomalyCount: 0,
      absenceCount: 0,
      anomalyRate: 0,
    }),
  ],
  seocho: [
    locationWorkerRow({
      workerName: "한소희",
      workerId: "worker_han_sohee",
      workHours: 46,
      lateCount: 0,
      locationAnomalyCount: 1,
      absenceCount: 0,
      anomalyRate: 2.2,
    }),
    locationWorkerRow({
      workerName: "임수빈",
      workerId: "worker_im_subin",
      workHours: 38,
      lateCount: 1,
      locationAnomalyCount: 0,
      absenceCount: 0,
      anomalyRate: 2.6,
    }),
    locationWorkerRow({
      workerName: "이민재",
      workerId: "worker_lee_minjae",
      workHours: 36,
      lateCount: 0,
      locationAnomalyCount: 0,
      absenceCount: 0,
      anomalyRate: 0,
    }),
    locationWorkerRow({
      workerName: "조영민",
      workerId: "worker_jo_youngmin",
      workHours: 34,
      lateCount: 1,
      locationAnomalyCount: 1,
      absenceCount: 0,
      anomalyRate: 5.9,
    }),
  ],
  jamsil: [
    locationWorkerRow({
      workerName: "최민준",
      workerId: "worker_choi_minjun",
      workHours: 52,
      lateCount: 2,
      locationAnomalyCount: 2,
      absenceCount: 0,
      anomalyRate: 7.7,
    }),
    locationWorkerRow({
      workerName: "박지훈",
      workerId: "worker_park_jihun",
      workHours: 44,
      lateCount: 1,
      locationAnomalyCount: 1,
      absenceCount: 0,
      anomalyRate: 4.5,
    }),
    locationWorkerRow({
      workerName: "정수현",
      workerId: "worker_jung_suhyun",
      workHours: 40,
      lateCount: 0,
      locationAnomalyCount: 2,
      absenceCount: 1,
      anomalyRate: 7.5,
    }),
    locationWorkerRow({
      workerName: "윤지아",
      workerId: "worker_yoon_jia",
      workHours: 36,
      lateCount: 0,
      locationAnomalyCount: 0,
      absenceCount: 0,
      anomalyRate: 0,
    }),
  ],
  gangnam: [
    locationWorkerRow({
      workerName: "이민재",
      workerId: "worker_lee_minjae",
      workHours: 44,
      lateCount: 0,
      locationAnomalyCount: 0,
      absenceCount: 0,
      anomalyRate: 0,
    }),
    locationWorkerRow({
      workerName: "임수빈",
      workerId: "worker_im_subin",
      workHours: 42,
      lateCount: 1,
      locationAnomalyCount: 0,
      absenceCount: 0,
      anomalyRate: 2.4,
    }),
    locationWorkerRow({
      workerName: "조영민",
      workerId: "worker_jo_youngmin",
      workHours: 36,
      lateCount: 0,
      locationAnomalyCount: 1,
      absenceCount: 0,
      anomalyRate: 2.8,
    }),
  ],
  songpa: [
    locationWorkerRow({
      workerName: "윤지아",
      workerId: "worker_yoon_jia",
      workHours: 44,
      lateCount: 0,
      locationAnomalyCount: 1,
      absenceCount: 0,
      anomalyRate: 2.3,
    }),
    locationWorkerRow({
      workerName: "강태우",
      workerId: "worker_kang_taewoo",
      workHours: 38,
      lateCount: 1,
      locationAnomalyCount: 1,
      absenceCount: 0,
      anomalyRate: 5.3,
    }),
    locationWorkerRow({
      workerName: "김서연",
      workerId: "worker_kim_seoyeon",
      workHours: 32,
      lateCount: 0,
      locationAnomalyCount: 0,
      absenceCount: 0,
      anomalyRate: 0,
    }),
    locationWorkerRow({
      workerName: "정수현",
      workerId: "worker_jung_suhyun",
      workHours: 28,
      lateCount: 1,
      locationAnomalyCount: 1,
      absenceCount: 0,
      anomalyRate: 7.1,
    }),
  ],
} as const satisfies Record<DashboardLocationId, readonly DashboardLocationWorkerRow[]>;

export type DashboardWorkerPeriodId = "week" | "month" | "quarter";
export type DashboardWorkerTagId = string;

export type DashboardWorkerTrendProfile = {
  labels: readonly string[];
  hoursFactor: number;
  payFactor: number;
  hourParts: readonly number[];
  payParts: readonly number[];
  flagDelta: number;
  lateDelta: number;
};

export type DashboardWorkerPayrollHistory = {
  month: string;
  finalPay: number;
  status: string;
  tone: DashboardMetricTone;
};

export type DashboardWorkerFlagDistribution = {
  type: string;
  count: number;
  tone: DashboardMetricTone;
};

export type DashboardWorkerSummary = {
  id: string;
  name: string;
  initials: string;
  tags: readonly Exclude<DashboardWorkerTagId, "all">[];
  baseHours: number;
  basePay: number;
  baseFlags: number;
  lateRate: number;
  memoSummary: string;
  memoPoints: readonly string[];
  memoUpdatedAt: string;
  flagDistribution: readonly DashboardWorkerFlagDistribution[];
  payrollHistory: readonly DashboardWorkerPayrollHistory[];
  action: DashboardActionMeta;
};

export const dashboardWorkerPeriodOptions = [
  { id: "week", label: "최근 1주" },
  { id: "month", label: "최근 1개월" },
  { id: "quarter", label: "최근 3개월" },
] as const satisfies readonly DashboardSelectOption<DashboardWorkerPeriodId>[];

export const dashboardWorkerPeriodProfiles = {
  week: {
    labels: ["일", "월", "화", "수", "목", "금", "토"],
    hoursFactor: 0.26,
    payFactor: 0.24,
    hourParts: [0.12, 0.12, 0.15, 0.14, 0.18, 0.17, 0.12],
    payParts: [0.12, 0.11, 0.15, 0.15, 0.18, 0.17, 0.12],
    flagDelta: -1,
    lateDelta: -1.6,
  },
  month: {
    labels: ["1주차", "2주차", "3주차", "4주차"],
    hoursFactor: 1,
    payFactor: 1,
    hourParts: [0.23, 0.24, 0.25, 0.28],
    payParts: [0.22, 0.24, 0.25, 0.29],
    flagDelta: 0,
    lateDelta: 0,
  },
  quarter: {
    labels: ["2월", "3월", "4월"],
    hoursFactor: 2.9,
    payFactor: 3,
    hourParts: [0.31, 0.33, 0.36],
    payParts: [0.3, 0.33, 0.37],
    flagDelta: 2,
    lateDelta: 1.1,
  },
} as const satisfies Record<DashboardWorkerPeriodId, DashboardWorkerTrendProfile>;

export const dashboardWorkerTagOptions = [
  { id: "all", label: "태그: 전체" },
  { id: "closing", label: "마감" },
  { id: "question", label: "질문조교" },
  { id: "admin", label: "행정" },
  { id: "weekend", label: "주말" },
  { id: "science", label: "과학" },
] as const satisfies readonly DashboardSelectOption<DashboardWorkerTagId>[];

export const dashboardWorkerSummaries = [
  {
    id: "worker_kim_seoyeon",
    name: "김서연",
    initials: "김",
    tags: ["admin", "closing"],
    baseHours: 48,
    basePay: 552000,
    baseFlags: 1,
    lateRate: 4.2,
    memoSummary: "주중 마감 운영과 행정 처리 숙련도가 높아 안정적으로 투입됩니다.",
    memoPoints: ["월·수 행정 우선 배치", "시험기간 야간자습 추가 투입 가능", "최근 1개월 이의신청 없음"],
    memoUpdatedAt: "2026.04.21 · 실장 김도윤",
    flagDistribution: [
      { type: "위치이상", count: 0, tone: "grey" },
      { type: "시간이상", count: 1, tone: "orange" },
      { type: "퇴근미처리", count: 0, tone: "grey" },
      { type: "결근후보", count: 0, tone: "grey" },
    ],
    payrollHistory: [
      { month: "2026년 4월", finalPay: 552000, status: "미확정", tone: "orange" },
      { month: "2026년 3월", finalPay: 531000, status: "지급 완료", tone: "green" },
      { month: "2026년 2월", finalPay: 508000, status: "지급 완료", tone: "green" },
    ],
    action: {
      actionType: "open-worker-summary",
      targetId: "worker_kim_seoyeon",
      recordType: "worker-attendance-summary",
    },
  },
  {
    id: "worker_park_jihun",
    name: "박지훈",
    initials: "박",
    tags: ["question", "weekend"],
    baseHours: 42,
    basePay: 483000,
    baseFlags: 0,
    lateRate: 0,
    memoSummary: "학생 응대가 안정적이라 저학년 질문 응대 시간대에 우선 배치합니다.",
    memoPoints: ["오후 4시 이후 질문조교 선호", "금요일 마감 직전 단독 배치 지양", "추가근무 수용률 높음"],
    memoUpdatedAt: "2026.04.18 · 관리자 박은지",
    flagDistribution: [
      { type: "위치이상", count: 0, tone: "grey" },
      { type: "시간이상", count: 0, tone: "grey" },
      { type: "퇴근미처리", count: 0, tone: "grey" },
      { type: "결근후보", count: 0, tone: "grey" },
    ],
    payrollHistory: [
      { month: "2026년 4월", finalPay: 483000, status: "확정 대기", tone: "grey" },
      { month: "2026년 3월", finalPay: 462000, status: "지급 완료", tone: "green" },
      { month: "2026년 2월", finalPay: 448000, status: "지급 완료", tone: "green" },
    ],
    action: {
      actionType: "open-worker-summary",
      targetId: "worker_park_jihun",
      recordType: "worker-attendance-summary",
    },
  },
  {
    id: "worker_choi_minjun",
    name: "최민준",
    initials: "최",
    tags: ["closing", "science"],
    baseHours: 36,
    basePay: 436000,
    baseFlags: 2,
    lateRate: 8.3,
    memoSummary: "출근 직전 이동 이슈가 있어 첫 타임 초반 로그 확인이 필요합니다.",
    memoPoints: ["첫 타임 배치 시 출근 로그 확인", "행정보다 수업 보조 선호", "최근 위치이상 플래그 1건"],
    memoUpdatedAt: "2026.04.20 · 실장 김도윤",
    flagDistribution: [
      { type: "위치이상", count: 1, tone: "red" },
      { type: "시간이상", count: 1, tone: "orange" },
      { type: "퇴근미처리", count: 0, tone: "grey" },
      { type: "결근후보", count: 0, tone: "grey" },
    ],
    payrollHistory: [
      { month: "2026년 4월", finalPay: 436000, status: "재확정 필요", tone: "orange" },
      { month: "2026년 3월", finalPay: 412000, status: "지급 완료", tone: "green" },
      { month: "2026년 2월", finalPay: 398000, status: "지급 완료", tone: "green" },
    ],
    action: {
      actionType: "open-worker-summary",
      targetId: "worker_choi_minjun",
      recordType: "worker-attendance-summary",
    },
  },
  {
    id: "worker_han_sohee",
    name: "한소희",
    initials: "한",
    tags: ["science", "question"],
    baseHours: 40,
    basePay: 462000,
    baseFlags: 1,
    lateRate: 2.5,
    memoSummary: "수업 보조 품질이 좋고 일정 변경을 미리 공유하는 편입니다.",
    memoPoints: ["화·목 고정 시간대 선호", "과학 계열 수업 보조 만족도 높음", "급여 산정 특이사항 없음"],
    memoUpdatedAt: "2026.04.16 · 관리자 이소민",
    flagDistribution: [
      { type: "위치이상", count: 1, tone: "red" },
      { type: "시간이상", count: 0, tone: "grey" },
      { type: "퇴근미처리", count: 0, tone: "grey" },
      { type: "결근후보", count: 0, tone: "grey" },
    ],
    payrollHistory: [
      { month: "2026년 4월", finalPay: 462000, status: "확정 대기", tone: "grey" },
      { month: "2026년 3월", finalPay: 451000, status: "지급 완료", tone: "green" },
      { month: "2026년 2월", finalPay: 421000, status: "지급 완료", tone: "green" },
    ],
    action: {
      actionType: "open-worker-summary",
      targetId: "worker_han_sohee",
      recordType: "worker-attendance-summary",
    },
  },
  {
    id: "worker_kang_taewoo",
    name: "강태우",
    initials: "강",
    tags: ["closing", "weekend"],
    baseHours: 32,
    basePay: 374000,
    baseFlags: 1,
    lateRate: 6.3,
    memoSummary: "행정과 마감 정산을 함께 맡길 수 있으나 연속 근무는 짧게 잡습니다.",
    memoPoints: ["하루 2블록 이하 배치 권장", "주말 단기 투입 가능", "퇴근미처리 재발 여부 관찰"],
    memoUpdatedAt: "2026.04.19 · 실장 김도윤",
    flagDistribution: [
      { type: "위치이상", count: 0, tone: "grey" },
      { type: "시간이상", count: 0, tone: "grey" },
      { type: "퇴근미처리", count: 1, tone: "red" },
      { type: "결근후보", count: 0, tone: "grey" },
    ],
    payrollHistory: [
      { month: "2026년 4월", finalPay: 374000, status: "미확정", tone: "orange" },
      { month: "2026년 3월", finalPay: 358000, status: "지급 완료", tone: "green" },
      { month: "2026년 2월", finalPay: 341000, status: "지급 완료", tone: "green" },
    ],
    action: {
      actionType: "open-worker-summary",
      targetId: "worker_kang_taewoo",
      recordType: "worker-attendance-summary",
    },
  },
  {
    id: "worker_yoon_jia",
    name: "윤지아",
    initials: "윤",
    tags: ["question", "admin"],
    baseHours: 44,
    basePay: 506000,
    baseFlags: 0,
    lateRate: 0,
    memoSummary: "수학 질문 대응은 강점이고 행정 업무는 역할을 분리하면 안정적입니다.",
    memoPoints: ["질문조교 중심 배치", "행정 단독 마감은 보류", "시험기간 추가근무 가능 여부 확인"],
    memoUpdatedAt: "2026.04.17 · 관리자 박은지",
    flagDistribution: [
      { type: "위치이상", count: 0, tone: "grey" },
      { type: "시간이상", count: 0, tone: "grey" },
      { type: "퇴근미처리", count: 0, tone: "grey" },
      { type: "결근후보", count: 0, tone: "grey" },
    ],
    payrollHistory: [
      { month: "2026년 4월", finalPay: 506000, status: "확정", tone: "green" },
      { month: "2026년 3월", finalPay: 486000, status: "지급 완료", tone: "green" },
      { month: "2026년 2월", finalPay: 458000, status: "지급 완료", tone: "green" },
    ],
    action: {
      actionType: "open-worker-summary",
      targetId: "worker_yoon_jia",
      recordType: "worker-attendance-summary",
    },
  },
] as const satisfies readonly DashboardWorkerSummary[];

export type DashboardAiPlan = "starter" | "standard";
export type DashboardAiAnalysisPeriodId = "7d" | "30d" | "this-month" | "last-month";

export type DashboardOperationalMetric = {
  id: string;
  label: string;
  value: string;
  unit?: string;
  subLabel?: string;
  tone?: DashboardMetricTone;
};

export type DashboardAiPatternRow = {
  id: string;
  severity: string;
  severityTone: DashboardMetricTone;
  target: string;
  pattern: string;
  evidence: string;
  status: string;
  statusTone: DashboardMetricTone;
  action: DashboardActionMeta;
};

export const dashboardAiAnalysisPeriodOptions = [
  { id: "7d", label: "최근 7일" },
  { id: "30d", label: "최근 30일" },
  { id: "this-month", label: "이번 달" },
  { id: "last-month", label: "지난 달" },
] as const satisfies readonly DashboardSelectOption<DashboardAiAnalysisPeriodId>[];

export const dashboardAiMonitoringFixture = {
  defaultPeriodId: "30d",
  lastRunAt: "2026.04.24 09:10",
  metrics: [
    {
      id: "status",
      label: "AI 분석 상태",
      value: "활성",
      subLabel: "Standard 플랜",
      tone: "green",
    },
    {
      id: "today",
      label: "오늘 탐지 패턴",
      value: "8",
      unit: "건",
      subLabel: "고위험 1건",
      tone: "red",
    },
    {
      id: "open-flags",
      label: "미처리 이상 플래그",
      value: "14",
      unit: "건",
      subLabel: "최근 7일 기준",
      tone: "orange",
    },
    {
      id: "risk-locations",
      label: "주의 근무지",
      value: "2",
      unit: "곳",
      subLabel: "대치 A학원, 잠실 C학원",
      tone: "blue",
    },
  ],
  lockedFeatures: [
    "AI 이상 패턴 분석",
    "이상률 추이와 위험 대상 랭킹",
    "REC-01 후속 조치 메타",
    "인수인계 AI 에이전트",
  ],
  patternRows: [
    {
      id: "pattern-daechi-night-close",
      severity: "고위험",
      severityTone: "red",
      target: "대치 A학원",
      pattern: "퇴근미처리 패턴 3건",
      evidence: "최근 7일 야간자습 종료 로그 누락 집중",
      status: "모니터링",
      statusTone: "orange",
      action: {
        actionType: "open-ai-pattern-record",
        targetId: "record_daechi_night_close",
        recordType: "ai-pattern",
      },
    },
    {
      id: "pattern-minjun-payroll",
      severity: "주의",
      severityTone: "orange",
      target: "최민준",
      pattern: "추가근무 승인 후 정산 보류",
      evidence: "보너스 반영 후 스냅샷 불일치 발생",
      status: "재확정 필요",
      statusTone: "red",
      action: {
        actionType: "open-ai-pattern-record",
        targetId: "record_choi_minjun_payroll",
        recordType: "ai-pattern",
      },
    },
    {
      id: "pattern-jamsil-correction",
      severity: "패턴",
      severityTone: "blue",
      target: "잠실 C학원",
      pattern: "이의신청 반복",
      evidence: "최근 1개월 동일 근무지 4건 누적",
      status: "검토 필요",
      statusTone: "blue",
      action: {
        actionType: "open-ai-pattern-record",
        targetId: "record_jamsil_correction",
        recordType: "ai-pattern",
      },
    },
  ],
} as const satisfies {
  defaultPeriodId: DashboardAiAnalysisPeriodId;
  lastRunAt: string;
  metrics: readonly DashboardOperationalMetric[];
  lockedFeatures: readonly string[];
  patternRows: readonly DashboardAiPatternRow[];
};
