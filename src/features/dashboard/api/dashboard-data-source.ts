import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { resolveActiveWorkspaceId } from "@/entities/workspace";
import { readActiveWorkspaceId } from "@/entities/workspace";
import { getFirebaseDb, isMockFirebaseProject } from "@/shared/api/firebase/client";
import {
  dashboardInboxRows,
  dashboardMetrics,
  type DashboardActionMeta,
  type DashboardInboxFilter,
  type DashboardInboxRow,
} from "../model/dashboard-fixtures";

type DashboardInboxRowsByFilter = Record<
  DashboardInboxFilter,
  readonly DashboardInboxRow[]
>;

export type AdminShellBadgeCounts = {
  recordPendingItems: number;
  scheduleApprovals: number;
  workerApplications: number;
};

export type AdminShellBadgeDataSource = {
  initialCounts?: AdminShellBadgeCounts;
  listBadgeCounts: () => Promise<AdminShellBadgeCounts>;
};

export type DashboardInboxDataSourceMode = "fixture" | "firestore";

export type DashboardInboxDataSource = {
  initialRows: DashboardInboxRowsByFilter;
  listInboxRows: () => Promise<DashboardInboxRowsByFilter>;
  mode: DashboardInboxDataSourceMode;
};

type OperationalInboxItem = {
  id: string;
  itemType: string;
  sourceId: string;
  sourceType: string;
  status: string;
  sortAt: Date | null;
  targetFocusId: string;
  targetScreen: string;
  workerId: string;
  workerNameSnapshot: string;
};

const actionByFilter = {
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

const emptyAdminShellBadgeCounts = {
  recordPendingItems: 0,
  scheduleApprovals: 0,
  workerApplications: 0,
} as const satisfies AdminShellBadgeCounts;

const closedAdminShellBadgeStatuses = new Set([
  "approved",
  "cancelled",
  "completed",
  "deleted",
  "done",
  "paid",
  "rejected",
  "resolved",
  "withdrawn",
]);

export function createDashboardInboxDataSource(): DashboardInboxDataSource {
  if (shouldUseFixtureDataSource()) {
    return createFixtureDashboardInboxDataSource();
  }

  return createFirestoreDashboardInboxDataSource();
}

export function createAdminShellBadgeDataSource(): AdminShellBadgeDataSource {
  if (shouldUseFixtureDataSource()) {
    return createVisualAdminShellBadgeDataSource();
  }

  return createFirestoreAdminShellBadgeDataSource();
}

function createFixtureDashboardInboxDataSource(): DashboardInboxDataSource {
  return {
    initialRows: dashboardInboxRows,
    mode: "fixture",

    async listInboxRows() {
      return dashboardInboxRows;
    },
  };
}

function createVisualAdminShellBadgeDataSource(): AdminShellBadgeDataSource {
  const initialCounts = createAdminShellBadgeCountsFromInboxRows(dashboardInboxRows);

  return {
    initialCounts,
    async listBadgeCounts() {
      return initialCounts;
    },
  };
}

function createFirestoreDashboardInboxDataSource(): DashboardInboxDataSource {
  return {
    initialRows: createEmptyInboxRows(),
    mode: "firestore",

    async listInboxRows() {
      const workspaceId = await requireActiveWorkspaceId();
      const snapshot = await getDocs(
        query(
          collection(
            getFirebaseDb(),
            "workspaces",
            workspaceId,
            "operationalInboxItems",
          ),
          orderBy("sortAt", "desc"),
          limit(100),
        ),
      );
      const rows = snapshot.docs
        .map(mapOperationalInboxItem)
        .filter((row): row is DashboardInboxRow => row !== null);

      return groupInboxRows(rows);
    },
  };
}

function createFirestoreAdminShellBadgeDataSource(): AdminShellBadgeDataSource {
  return {
    initialCounts: emptyAdminShellBadgeCounts,

    async listBadgeCounts() {
      const workspaceId = await requireActiveWorkspaceId();
      const snapshot = await getDocs(
        collection(
          getFirebaseDb(),
          "workspaces",
          workspaceId,
          "operationalInboxItems",
        ),
      );

      return snapshot.docs.reduce<AdminShellBadgeCounts>((counts, document) => {
        const item = readOperationalInboxItem(document);

        if (!isOpenAdminShellBadgeStatus(item.status)) {
          return counts;
        }

        const filter = readInboxFilter(item);

        if (filter === "schedule") {
          return {
            ...counts,
            scheduleApprovals: counts.scheduleApprovals + 1,
          };
        }

        if (
          filter === "overtime" ||
          filter === "correction" ||
          filter === "anomaly"
        ) {
          return {
            ...counts,
            recordPendingItems: counts.recordPendingItems + 1,
          };
        }

        return counts;
      }, emptyAdminShellBadgeCounts);
    },
  };
}

function createAdminShellBadgeCountsFromInboxRows(
  rowsByFilter: DashboardInboxRowsByFilter,
): AdminShellBadgeCounts {
  return {
    recordPendingItems:
      rowsByFilter.overtime.length +
      rowsByFilter.correction.length +
      rowsByFilter.anomaly.length,
    scheduleApprovals: rowsByFilter.schedule.length,
    workerApplications: 0,
  };
}

function createEmptyInboxRows(): DashboardInboxRowsByFilter {
  return groupInboxRows([]);
}

function groupInboxRows(
  rows: readonly DashboardInboxRow[],
): DashboardInboxRowsByFilter {
  return {
    all: rows,
    affiliation: rows.filter((row) => row.filter === "affiliation"),
    schedule: rows.filter((row) => row.filter === "schedule"),
    overtime: rows.filter((row) => row.filter === "overtime"),
    correction: rows.filter((row) => row.filter === "correction"),
    anomaly: rows.filter((row) => row.filter === "anomaly"),
    payroll: rows.filter((row) => row.filter === "payroll"),
  };
}

function mapOperationalInboxItem(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): DashboardInboxRow | null {
  const item = readOperationalInboxItem(snapshot);
  const filter = readInboxFilter(item);

  if (!filter) {
    return null;
  }

  const metric = dashboardMetrics.find((entry) => entry.id === filter);
  const action = actionByFilter[filter];

  return {
    id: item.id,
    filter,
    type: metric?.inboxType ?? readItemTypeLabel(item.itemType),
    target: item.workerNameSnapshot || item.workerId || "-",
    location: "-",
    date: formatShortDate(item.sortAt),
    status: readStatusLabel(item.status),
    href: createTargetHref(item),
    action: {
      ...action,
      targetId: item.targetFocusId || item.sourceId || item.workerId || item.id,
    },
  };
}

function readOperationalInboxItem(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): OperationalInboxItem {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    itemType: readString(data.itemType, ""),
    sourceId: readString(data.sourceId, ""),
    sourceType: readString(data.sourceType, ""),
    status: readString(data.status, ""),
    sortAt: readDate(data.sortAt),
    targetFocusId: readString(data.targetFocusId, ""),
    targetScreen: readString(data.targetScreen, ""),
    workerId: readString(data.workerId, ""),
    workerNameSnapshot: readString(data.workerNameSnapshot, ""),
  };
}

function readInboxFilter(
  item: OperationalInboxItem,
): Exclude<DashboardInboxFilter, "all"> | null {
  switch (item.itemType) {
    case "membership_pending":
      return "affiliation";
    case "schedule_pending":
      return "schedule";
    case "overtime_pending":
      return "overtime";
    case "correction_pending":
      return "correction";
    case "anomaly_unresolved":
      return "anomaly";
    case "payroll_reconfirmation":
      return "payroll";
    default:
      return readFilterFromSourceType(item.sourceType);
  }
}

function readFilterFromSourceType(
  sourceType: string,
): Exclude<DashboardInboxFilter, "all"> | null {
  switch (sourceType) {
    case "membership":
      return "affiliation";
    case "scheduleRequest":
      return "schedule";
    case "overtimeWork":
      return "overtime";
    case "correctionRequest":
      return "correction";
    case "anomalyFlag":
      return "anomaly";
    case "payStatement":
      return "payroll";
    default:
      return null;
  }
}

function readItemTypeLabel(itemType: string) {
  return itemType
    ? itemType
        .split("_")
        .filter(Boolean)
        .join(" ")
    : "확인 필요";
}

function readStatusLabel(status: string) {
  switch (status) {
    case "submitted":
      return "제출됨";
    case "unresolved":
      return "미처리";
    case "needs_reconfirmation":
      return "재확인 필요";
    default:
      return status || "확인 필요";
  }
}

function isOpenAdminShellBadgeStatus(status: string) {
  return !closedAdminShellBadgeStatuses.has(status);
}

function createTargetHref(item: OperationalInboxItem) {
  const focusId = item.targetFocusId || item.sourceId;
  const suffix = focusId ? `?focus=${encodeURIComponent(focusId)}` : "";

  switch (item.targetScreen) {
    case "WKR-01":
      return `/workers/applications${suffix}`;
    case "WKR-02":
      return item.workerId ? `/workers/${encodeURIComponent(item.workerId)}` : "/workers";
    case "SCH-01":
      return `/schedule${suffix}`;
    case "SCH-02":
      return `/schedule/timeline${suffix}`;
    case "DUT-01":
      return `/schedule/duties${suffix}`;
    case "REC-01":
      return `/records${suffix}`;
    case "REC-02":
      return `/records/anomaly-history${suffix}`;
    case "REC-03":
      return `/records/corrections${suffix}`;
    case "REC-04":
      return `/records/attendance${suffix}`;
    case "PAY-01":
      return `/payroll${suffix}`;
    case "PAY-02":
      return `/payroll/statements${suffix}`;
    case "HO-01":
      return "/handover";
    case "SET-01":
      return "/settings";
    case "SET-02":
      return "/settings/locations";
    case "SET-03":
      return "/settings/rules";
    case "SET-04":
      return "/settings/notifications";
    case "SET-05":
      return "/settings/billing";
    default:
      return createFallbackHref(item, suffix);
  }
}

function createFallbackHref(item: OperationalInboxItem, suffix: string) {
  switch (item.sourceType) {
    case "membership":
      return `/workers/applications${suffix}`;
    case "scheduleRequest":
      return `/schedule${suffix}`;
    case "overtimeWork":
    case "correctionRequest":
    case "anomalyFlag":
      return `/records${suffix}`;
    case "payStatement":
      return `/payroll${suffix}`;
    case "handoverDocument":
      return "/handover";
    default:
      return "/dashboard";
  }
}

async function requireActiveWorkspaceId() {
  const workspaceId = await resolveActiveWorkspaceId();

  if (!workspaceId) {
    throw new Error("활성 소속을 확인할 수 없습니다.");
  }

  return workspaceId;
}

function shouldUseFixtureDataSource() {
  return isMockFirebaseProject() || readActiveWorkspaceId() === "workspace_visual";
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value ? value : fallback;
}

function readDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value !== "object") {
    return null;
  }

  const timestamp = value as {
    seconds?: unknown;
    toDate?: unknown;
  };

  if (typeof timestamp.toDate === "function") {
    const date = timestamp.toDate() as Date;

    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof timestamp.seconds === "number") {
    const date = new Date(timestamp.seconds * 1000);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function formatShortDate(date: Date | null) {
  if (!date) {
    return "-";
  }

  return `${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}
