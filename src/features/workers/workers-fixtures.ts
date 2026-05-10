export type WorkerTagTone = "green" | "red" | "grey";

export type WorkerTag = {
  label: string;
  tone: WorkerTagTone;
};

export type WorkerListStatus = "active" | "all" | "inactive";

export type WorkerListRow = {
  id: string;
  name: string;
  registeredAt: string;
  tag: WorkerTag;
  pay: string;
  status: "활성" | "비활성";
  statusDate?: string;
};

export const workerTagOptions = [
  { label: "베테랑", tone: "grey" },
  { label: "신입", tone: "green" },
  { label: "유의대상", tone: "red" },
  { label: "핵심인력", tone: "grey" },
  { label: "파트타임", tone: "grey" },
  { label: "장기근속", tone: "grey" },
  { label: "수습", tone: "green" },
] as const satisfies readonly WorkerTag[];

export const workerListStatusFilters = [
  { value: "active", label: "활성 17" },
  { value: "all", label: "전체 20" },
  { value: "inactive", label: "비활성 3" },
] as const satisfies readonly { value: WorkerListStatus; label: string }[];

export const workerListActiveRows = [
  row("worker-kim-seoyeon", "김서연", "2025.07.05", workerTagOptions[0], "시급 ₩10000"),
  row("worker-park-junghoon", "박정훈", "2024.12.11", workerTagOptions[1], "시급 ₩8500"),
  row("worker-lee-minji", "이민지", "2024.09.22", workerTagOptions[2], "시급 ₩9200"),
  row("worker-choi-yujin", "최유진", "2025.01.10", workerTagOptions[3], "시급 ₩11000"),
  row("worker-hong-sungwoo", "홍성우", "2023.11.15", workerTagOptions[4], "시급 ₩8000"),
  row("worker-kim-haneul", "김하늘", "2025.03.03", workerTagOptions[5], "시급 ₩9500"),
  row("worker-oh-jihoon", "오지훈", "2024.08.19", workerTagOptions[6], "시급 ₩10500"),
  row("worker-shin-yejin", "신예진", "2025.05.27", workerTagOptions[0], "시급 ₩9300"),
  row("worker-lee-donghyuk", "이동혁", "2024.10.04", workerTagOptions[1], "시급 ₩8200"),
  row("worker-yoo-chaewon", "유채원", "2025.06.15", workerTagOptions[2], "시급 ₩10800"),
  row("worker-kim-doyoon", "김도윤", "2023.12.09", workerTagOptions[3], "시급 ₩9400"),
  row("worker-han-jimin", "한지민", "2025.02.20", workerTagOptions[4], "시급 ₩8300"),
  row("worker-kang-minseo", "강민서", "2024.11.30", workerTagOptions[5], "시급 ₩9100"),
  row("worker-seo-junho-trainee", "서준호", "2025.04.07", workerTagOptions[6], "시급 ₩10700"),
  row("worker-seo-junho-veteran", "서준호", "2025.04.07", workerTagOptions[0], "시급 ₩10700"),
] as const satisfies readonly WorkerListRow[];

export const workerListInactiveRows = [
  {
    id: "inactive-kim-seoyeon-1",
    name: "김서연",
    registeredAt: "2025.07.05",
    tag: workerTagOptions[0],
    pay: "시급 ₩10000",
    status: "비활성",
    statusDate: "2026.03.10",
  },
  {
    id: "inactive-kim-seoyeon-2",
    name: "김서연",
    registeredAt: "2025.07.05",
    tag: workerTagOptions[0],
    pay: "시급 ₩10000",
    status: "비활성",
    statusDate: "2026.03.10",
  },
  {
    id: "inactive-kim-seoyeon-3",
    name: "김서연",
    registeredAt: "2025.07.05",
    tag: workerTagOptions[0],
    pay: "시급 ₩10000",
    status: "비활성",
    statusDate: "2026.03.10",
  },
] as const satisfies readonly WorkerListRow[];

export const workerListRowsByStatus = {
  active: workerListActiveRows,
  all: workerListActiveRows,
  inactive: workerListInactiveRows,
} as const satisfies Record<WorkerListStatus, readonly WorkerListRow[]>;

function row(
  id: string,
  name: string,
  registeredAt: string,
  tag: WorkerTag,
  pay: string,
): WorkerListRow {
  return {
    id,
    name,
    registeredAt,
    tag,
    pay,
    status: "활성",
  };
}
