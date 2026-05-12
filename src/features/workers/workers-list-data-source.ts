import {
  collection,
  getDocs,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { resolveActiveWorkspaceId } from "@/features/entry/workspace-data-source";
import { readActiveWorkspaceId } from "@/features/entry/workspace-onboarding-state";
import {
  getFirebaseDb,
  isMockFirebaseProject,
} from "@/lib/firebase/client";
import {
  workerListFixtureData,
  type WorkerListData,
  type WorkerListRow,
  type WorkerListRowsByStatus,
  type WorkerListStatusFilter,
  type WorkerTag,
  type WorkerTagTone,
} from "./workers-fixtures";

export type WorkerListDataSource = {
  initialData?: WorkerListData;
  listWorkers: () => Promise<WorkerListData>;
};

type PayrollSetting = {
  createdAt: Date | null;
  effectiveFrom: string;
  hourlyRate: number | null;
  monthlySalary: number | null;
  payrollType: string;
  status: string;
  workerId: string;
};

type WorkerTagDocument = {
  id: string;
  status: string;
  tag: WorkerTag;
};

const emptyRowsByStatus = {
  active: [],
  all: [],
  inactive: [],
} as const satisfies WorkerListRowsByStatus;

export const emptyWorkerListData = {
  rowsByStatus: emptyRowsByStatus,
  statusFilters: createStatusFilters(emptyRowsByStatus),
  tagOptions: [],
} as const satisfies WorkerListData;

export function createWorkerListDataSource(): WorkerListDataSource {
  if (shouldUseVisualMockDataSource()) {
    return createMockWorkerListDataSource();
  }

  return createFirestoreWorkerListDataSource();
}

function createFirestoreWorkerListDataSource(): WorkerListDataSource {
  return {
    async listWorkers() {
      const workspaceId = await requireActiveWorkspaceId();
      const [workersSnapshot, payrollSettingsSnapshot, workerTagsSnapshot] =
        await Promise.all([
          getDocs(getWorkersCollection(workspaceId)),
          getDocs(getPayrollSettingsCollection(workspaceId)),
          getDocs(getWorkerTagsCollection(workspaceId)),
        ]);
      const workerTags = workerTagsSnapshot.docs
        .map(mapWorkerTagDocument)
        .filter((tag) => tag.status !== "deleted");
      const workerTagById = new Map(
        workerTags.map((tag) => [tag.id, tag.tag]),
      );
      const payrollSettingByWorkerId = createPayrollSettingMap(
        payrollSettingsSnapshot.docs,
      );
      const rows = workersSnapshot.docs
        .map((worker) =>
          mapWorkerDocument(worker, workerTagById, payrollSettingByWorkerId),
        )
        .sort(compareWorkerRows);

      return createWorkerListData(
        rows,
        workerTags
          .filter((tag) => tag.status === "active")
          .map((tag) => tag.tag),
      );
    },
  };
}

function createMockWorkerListDataSource(): WorkerListDataSource {
  return {
    initialData: workerListFixtureData,
    async listWorkers() {
      return workerListFixtureData;
    },
  };
}

function createWorkerListData(
  rows: readonly WorkerListRow[],
  tagOptions: readonly WorkerTag[],
): WorkerListData {
  const rowsByStatus = {
    active: rows.filter((row) => row.status === "활성"),
    all: rows,
    inactive: rows.filter((row) => row.status === "비활성"),
  } satisfies WorkerListRowsByStatus;

  return {
    rowsByStatus,
    statusFilters: createStatusFilters(rowsByStatus),
    tagOptions,
  };
}

function createStatusFilters(
  rowsByStatus: WorkerListRowsByStatus,
): WorkerListStatusFilter[] {
  return [
    { value: "active", label: `활성 ${rowsByStatus.active.length}` },
    { value: "all", label: `전체 ${rowsByStatus.all.length}` },
    { value: "inactive", label: `비활성 ${rowsByStatus.inactive.length}` },
  ];
}

function getWorkersCollection(workspaceId: string) {
  return collection(getFirebaseDb(), "workspaces", workspaceId, "workers");
}

function getPayrollSettingsCollection(workspaceId: string) {
  return collection(
    getFirebaseDb(),
    "workspaces",
    workspaceId,
    "payrollSettings",
  );
}

function getWorkerTagsCollection(workspaceId: string) {
  return collection(getFirebaseDb(), "workspaces", workspaceId, "workerTags");
}

async function requireActiveWorkspaceId() {
  const workspaceId = await resolveActiveWorkspaceId();

  if (!workspaceId) {
    throw new Error("활성 소속을 확인할 수 없습니다.");
  }

  return workspaceId;
}

function shouldUseVisualMockDataSource() {
  return isMockFirebaseProject() || readActiveWorkspaceId() === "workspace_visual";
}

function mapWorkerDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
  workerTagById: ReadonlyMap<string, WorkerTag>,
  payrollSettingByWorkerId: ReadonlyMap<string, PayrollSetting>,
): WorkerListRow {
  const data = snapshot.data();
  const status = readWorkerStatus(data);
  const workerId = snapshot.id;

  return {
    id: workerId,
    name: readString(data.name, readString(data.displayName, "이름 없는 조교")),
    registeredAt: readRegisteredAtLabel(data),
    tag: readWorkerTag(data, workerTagById),
    pay: readPayLabel(payrollSettingByWorkerId.get(workerId)),
    status,
    detailHref: readNonEmptyString(data.detailHref, `/workers/${workerId}`),
    ...(status === "비활성" ? { statusDate: readStatusDateLabel(data) } : {}),
  };
}

function mapWorkerTagDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): WorkerTagDocument {
  const data = snapshot.data();
  const label = readString(data.name, readString(data.label, "태그 없음"));

  return {
    id: snapshot.id,
    status: readString(data.status, "active"),
    tag: {
      label,
      tone: readWorkerTagTone(data.color ?? data.tone),
    },
  };
}

function createPayrollSettingMap(
  docs: readonly QueryDocumentSnapshot<DocumentData>[],
) {
  const settings = docs
    .map(mapPayrollSettingDocument)
    .filter((setting): setting is PayrollSetting => setting !== null)
    .sort(comparePayrollSettings);
  const byWorkerId = new Map<string, PayrollSetting>();

  for (const setting of settings) {
    if (!byWorkerId.has(setting.workerId)) {
      byWorkerId.set(setting.workerId, setting);
    }
  }

  return byWorkerId;
}

function mapPayrollSettingDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): PayrollSetting | null {
  const data = snapshot.data();
  const workerId = readString(data.workerId, "");

  if (!workerId) {
    return null;
  }

  return {
    createdAt: readDate(data.createdAt),
    effectiveFrom: readString(data.effectiveFrom, ""),
    hourlyRate:
      readOptionalNumber(data.hourlyRate) ??
      readOptionalNumber(data.baseHourlyRate) ??
      readOptionalNumber(data.hourlyWage),
    monthlySalary:
      readOptionalNumber(data.monthlySalary) ??
      readOptionalNumber(data.monthlyPay),
    payrollType: readString(data.payrollType, ""),
    status: readString(data.status, "active"),
    workerId,
  };
}

function readWorkerStatus(data: DocumentData): WorkerListRow["status"] {
  const status = readString(data.status, "");
  const membershipStatus = readString(data.membershipStatus, "");
  const inactiveStatuses = new Set([
    "deleted",
    "inactive",
    "pending",
    "rejected",
    "suspended",
  ]);

  if (inactiveStatuses.has(status) || inactiveStatuses.has(membershipStatus)) {
    return "비활성";
  }

  return "활성";
}

function readWorkerTag(
  data: DocumentData,
  workerTagById: ReadonlyMap<string, WorkerTag>,
): WorkerTag {
  const tagIds = readStringArray(data.tagIds);
  const tagFromId = tagIds
    .map((tagId) => workerTagById.get(tagId))
    .find((tag): tag is WorkerTag => Boolean(tag));

  if (tagFromId) {
    return tagFromId;
  }

  const tagNames = readStringArray(data.tags);
  const label =
    tagNames[0] ??
    readString(data.tagName, readString(data.workerTagName, "미지정"));

  return {
    label,
    tone: readWorkerTagTone(data.tagTone),
  };
}

function readWorkerTagTone(value: unknown): WorkerTagTone {
  if (value === "green" || value === "red") {
    return value;
  }

  return "grey";
}

function readRegisteredAtLabel(data: DocumentData) {
  return formatDateLabel(
    readDate(data.approvedAt) ??
      readDate(data.registeredAt) ??
      readDate(data.createdAt) ??
      readDate(data.appliedAt),
    "-",
  );
}

function readStatusDateLabel(data: DocumentData) {
  const label = formatDateLabel(
    readDate(data.inactivatedAt) ??
      readDate(data.rejectedAt) ??
      readDate(data.decidedAt) ??
      readDate(data.updatedAt) ??
      readDate(data.appliedAt) ??
      readDate(data.createdAt),
    "",
  );

  return label || undefined;
}

function readPayLabel(setting: PayrollSetting | undefined) {
  if (!setting) {
    return "급여 미설정";
  }

  if (setting.payrollType === "monthly" || setting.monthlySalary !== null) {
    return setting.monthlySalary !== null
      ? `월급 ₩${setting.monthlySalary}`
      : "월급 미설정";
  }

  return setting.hourlyRate !== null
    ? `시급 ₩${setting.hourlyRate}`
    : "시급 미설정";
}

function compareWorkerRows(left: WorkerListRow, right: WorkerListRow) {
  return left.name.localeCompare(right.name, "ko-KR");
}

function comparePayrollSettings(left: PayrollSetting, right: PayrollSetting) {
  const leftActive = left.status === "active" ? 1 : 0;
  const rightActive = right.status === "active" ? 1 : 0;

  if (leftActive !== rightActive) {
    return rightActive - leftActive;
  }

  const effectiveFromCompare = right.effectiveFrom.localeCompare(
    left.effectiveFrom,
  );

  if (effectiveFromCompare !== 0) {
    return effectiveFromCompare;
  }

  return getDateTime(right.createdAt) - getDateTime(left.createdAt);
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function readNonEmptyString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string") {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  if (
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();

    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }

  if ("seconds" in value && typeof value.seconds === "number") {
    const nanoseconds =
      "nanoseconds" in value && typeof value.nanoseconds === "number"
        ? value.nanoseconds
        : 0;

    return new Date(value.seconds * 1000 + Math.floor(nanoseconds / 1000000));
  }

  return null;
}

function formatDateLabel(date: Date | null, fallback: string) {
  if (!date) {
    return fallback;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).formatToParts(date);
  const partByType = new Map(parts.map((part) => [part.type, part.value]));
  const year = partByType.get("year");
  const month = partByType.get("month");
  const day = partByType.get("day");

  return year && month && day ? `${year}.${month}.${day}` : fallback;
}

function getDateTime(date: Date | null) {
  return date?.getTime() ?? 0;
}
