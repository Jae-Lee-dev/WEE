export type WorkerDetailTabId = "basic" | "schedule" | "payroll";

export type WorkerDetailTab = {
  id: WorkerDetailTabId;
  label: string;
  href: string;
};

export type WorkerDetailProfile = {
  name: string;
  tag: string;
  status: string;
  paySummary: string;
  registeredSummary: string;
  monthlySummary: string;
  deleteLabel: string;
};

export const defaultWorkerDetailRouteId = "worker_kim";

export const workerDetailProfile = {
  name: "김서연",
  tag: "베테랑",
  status: "활성",
  paySummary: "시급 ₩ 10,000",
  registeredSummary: "2025.07.05 등록",
  monthlySummary: "당월 48시간 근무",
  deleteLabel: "조교 삭제",
} as const satisfies WorkerDetailProfile;

export function createWorkerDetailTabs(
  workerId: string,
): readonly WorkerDetailTab[] {
  const encodedWorkerId = encodeURIComponent(
    workerId || defaultWorkerDetailRouteId,
  );

  return [
    {
      id: "basic",
      label: "기본 정보",
      href: `/workers/${encodedWorkerId}`,
    },
    {
      id: "schedule",
      label: "시간표",
      href: `/workers/${encodedWorkerId}/schedule`,
    },
    {
      id: "payroll",
      label: "급여 현황",
      href: `/workers/${encodedWorkerId}/payroll`,
    },
  ] as const satisfies readonly WorkerDetailTab[];
}

export const workerDetailTabs = createWorkerDetailTabs(defaultWorkerDetailRouteId);
