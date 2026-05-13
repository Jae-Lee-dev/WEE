export type WorkerApplicationRow = {
  id: string;
  name: string;
  phone: string;
  appliedAt: string;
  info?: WorkerApplicationInfo;
  statusText?: string;
};

export type WorkerApplicationTag = {
  id: string;
  label: string;
};

export type WorkerApplicationInfo = {
  appliedAt: string;
  bankbookDownloadUrl?: string;
  bankbookStatus: string;
  requestedPay: string;
  rejectionReason?: string;
  statusText?: string;
};

export type WorkerApplicationsData = {
  rows: readonly WorkerApplicationRow[];
  tags: readonly WorkerApplicationTag[];
};

export type WorkerApplicationPayKind = "hourly" | "monthly";

export type WorkerApplicationPaySetting = {
  kind: WorkerApplicationPayKind;
  placeholder: string;
  unit: string;
};

export const workerApplicationRows = Array.from({ length: 6 }, (_, index) => ({
  id: `application-kim-seoyeon-${index + 1}`,
  name: "김서연",
  phone: "010-1234-5678",
  appliedAt: "2026.04.15",
})) satisfies WorkerApplicationRow[];

export const workerApplicationInfo = {
  appliedAt: "2026.04.15",
  bankbookDownloadUrl: "https://example.com/worker-application-bankbook.png",
  bankbookStatus: "업로드 완료",
  requestedPay: "시급 ₩12,000",
} as const satisfies WorkerApplicationInfo;

export const workerApplicationTags = [
  { id: "veteran", label: "베테랑" },
  { id: "new", label: "신입" },
  { id: "attention", label: "유의대상" },
  { id: "core", label: "핵심인력" },
  { id: "part-time", label: "파트타임" },
  { id: "long-term", label: "장기근속" },
] as const satisfies readonly WorkerApplicationTag[];

export const workerApplicationPaySettings = {
  hourly: {
    kind: "hourly",
    placeholder: "예) 12000",
    unit: "원/시간",
  },
  monthly: {
    kind: "monthly",
    placeholder: "예) 800000",
    unit: "원/월",
  },
} as const satisfies Record<
  WorkerApplicationPayKind,
  WorkerApplicationPaySetting
>;

export const workerApplicationsFixtureData = {
  rows: workerApplicationRows,
  tags: workerApplicationTags,
} as const satisfies WorkerApplicationsData;
