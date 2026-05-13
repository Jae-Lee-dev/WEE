export type WorkerDetailPayrollTone =
  | "green"
  | "orange"
  | "red"
  | "blue"
  | "grey";

export type WorkerDetailPayrollMetric = {
  id: string;
  label: string;
  value: string;
  badge?: string;
  tone: "green" | "red" | "default";
};

export type WorkerDetailPayrollStatement = {
  id: string;
  month: string;
  status: string;
  statusTone: WorkerDetailPayrollTone;
  amount: string;
  memo: string;
};

export type WorkerDetailPayrollIssue = {
  id: string;
  tag: string;
  tagTone: WorkerDetailPayrollTone;
  title: string;
  state: string;
  detailLabel: string;
  processLabel: string;
};

export const workerDetailPayrollSummary = {
  title: "급여 요약",
  metrics: [
    {
      id: "current-month",
      label: "이번 달 산정",
      value: "₩ 586,002",
      tone: "green",
    },
    {
      id: "latest-confirmed",
      label: "최근 확정 명세",
      value: "₩ 562,134",
      badge: "26.03",
      tone: "green",
    },
    {
      id: "pending-issues",
      label: "대기 이슈",
      value: "3건",
      tone: "red",
    },
  ],
  actions: ["급여 산정으로 이동", "급여 명세 보기"],
} as const satisfies {
  title: string;
  metrics: readonly WorkerDetailPayrollMetric[];
  actions: readonly string[];
};

export const workerDetailPayrollStatements = [
  {
    id: "statement-2026-04-processing",
    month: "2026년 4월",
    status: "처리중",
    statusTone: "orange",
    amount: "₩586,002",
    memo: "재확정 가능",
  },
  {
    id: "statement-2026-03-paid",
    month: "2026년 3월",
    status: "지급 완료",
    statusTone: "green",
    amount: "₩562,134",
    memo: "확정 완료",
  },
  {
    id: "statement-2026-02-paid",
    month: "2026년 4월",
    status: "지급 완료",
    statusTone: "green",
    amount: "₩586,002",
    memo: "확정 완료",
  },
  {
    id: "statement-2026-01-paid",
    month: "2026년 4월",
    status: "지급 완료",
    statusTone: "green",
    amount: "₩586,002",
    memo: "확정 완료",
  },
  {
    id: "statement-2025-12-paid",
    month: "2026년 4월",
    status: "지급 완료",
    statusTone: "green",
    amount: "₩586,002",
    memo: "확정 완료",
  },
  {
    id: "statement-2026-04-paid-extra",
    month: "2026년 4월",
    status: "지급 완료",
    statusTone: "green",
    amount: "₩586,002",
    memo: "확정 완료",
  },
] as const satisfies readonly WorkerDetailPayrollStatement[];

export const workerDetailPayrollIssues = [
  {
    id: "issue-anomaly",
    tag: "이상 플래그",
    tagTone: "red",
    title: "퇴근 미처리",
    state: "처리 대기",
    detailLabel: "상세 보기",
    processLabel: "처리",
  },
  {
    id: "issue-overtime",
    tag: "추가 근무",
    tagTone: "blue",
    title: "시험대비 보강 2시간",
    state: "보류",
    detailLabel: "상세 보기",
    processLabel: "처리",
  },
  {
    id: "issue-appeal-1",
    tag: "이의 신청",
    tagTone: "orange",
    title: "근무시간 30분 누락",
    state: "검토 필요",
    detailLabel: "상세 보기",
    processLabel: "처리",
  },
  {
    id: "issue-appeal-2",
    tag: "이의 신청",
    tagTone: "orange",
    title: "근무시간 30분 누락",
    state: "검토 필요",
    detailLabel: "상세 보기",
    processLabel: "처리",
  },
  {
    id: "issue-appeal-3",
    tag: "이의 신청",
    tagTone: "orange",
    title: "근무시간 30분 누락",
    state: "검토 필요",
    detailLabel: "상세 보기",
    processLabel: "처리",
  },
] as const satisfies readonly WorkerDetailPayrollIssue[];
