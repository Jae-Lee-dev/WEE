export type WorkerDetailTabId = "basic" | "schedule" | "payroll";

export type WorkerDetailTab = {
  id: WorkerDetailTabId;
  label: string;
  href: string;
};

export const workerDetailProfile = {
  name: "김서연",
  tag: "베테랑",
  status: "활성",
  paySummary: "시급 ₩ 10,000",
  registeredSummary: "2025.07.05 등록",
  monthlySummary: "당월 48시간 근무",
  deleteLabel: "조교 삭제",
} as const;

export const workerDetailTabs = [
  {
    id: "basic",
    label: "기본 정보",
    href: "/workers/worker_kim_seoyeon",
  },
  {
    id: "schedule",
    label: "시간표",
    href: "/workers/worker_kim_seoyeon/schedule",
  },
  {
    id: "payroll",
    label: "급여 현황",
    href: "/workers/worker_kim_seoyeon/payroll",
  },
] as const satisfies readonly WorkerDetailTab[];
