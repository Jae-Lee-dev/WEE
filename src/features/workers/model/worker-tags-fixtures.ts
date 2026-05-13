export type WorkerTagTone = "green" | "red" | "grey" | "blue" | "orange";

export type WorkerTagRow = {
  id: string;
  label: string;
  countText: string;
  tone: WorkerTagTone;
  statusText?: string;
};

export type WorkerTagDialogWorker = {
  id: string;
  name: string;
  checked: boolean;
  disabled: boolean;
};

export type WorkerTagEditDialogFixture = {
  selectedTag: WorkerTagRow;
  currentCountText: string;
  searchPlaceholder: string;
  workers: readonly WorkerTagDialogWorker[];
};

export const workerTagRows = [
  {
    id: "worker-tag-veteran",
    label: "베테랑",
    countText: "3명",
    tone: "grey",
  },
  {
    id: "worker-tag-new",
    label: "신입",
    countText: "3명",
    tone: "green",
  },
  {
    id: "worker-tag-attention-red",
    label: "유의대상",
    countText: "3명",
    tone: "red",
  },
  {
    id: "worker-tag-attention-grey",
    label: "유의대상",
    countText: "3명",
    tone: "grey",
  },
  {
    id: "worker-tag-core",
    label: "핵심인력",
    countText: "3명",
    tone: "grey",
  },
  {
    id: "worker-tag-part-time",
    label: "파트타임",
    countText: "3명",
    tone: "grey",
  },
  {
    id: "worker-tag-long-term",
    label: "장기근속",
    countText: "3명",
    tone: "grey",
  },
  {
    id: "worker-tag-trainee",
    label: "수습",
    countText: "3명",
    tone: "green",
  },
] as const satisfies readonly WorkerTagRow[];

export const workerTagEditDialog = {
  selectedTag: workerTagRows[0],
  currentCountText: "3건",
  searchPlaceholder: "조교 이름을 검색하세요",
  workers: [
    {
      id: "worker-kim-seoyeon",
      name: "김서연",
      checked: true,
      disabled: false,
    },
    { id: "worker-lee-minjun", name: "이민준", checked: true, disabled: false },
    {
      id: "worker-choi-hayoung",
      name: "최하영",
      checked: true,
      disabled: true,
    },
    {
      id: "worker-jeong-daeun",
      name: "정다은",
      checked: true,
      disabled: false,
    },
    {
      id: "worker-baek-seunghyun",
      name: "백승현",
      checked: true,
      disabled: true,
    },
    { id: "worker-park-jiwoo", name: "박지우", checked: true, disabled: true },
  ],
} as const satisfies WorkerTagEditDialogFixture;
