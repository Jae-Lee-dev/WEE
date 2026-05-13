import {
  collection,
  doc,
  getDoc,
  getDocs,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { resolveActiveWorkspaceId } from "@/entities/workspace";
import { readActiveWorkspaceId } from "@/entities/workspace";
import { getFirebaseDb, isMockFirebaseProject } from "@/shared/api/firebase/client";
import {
  workerDetailProfile,
  type WorkerDetailProfile,
} from "../model/worker-detail-common-fixtures";
import {
  workerDetailPayrollIssues,
  workerDetailPayrollStatements,
  workerDetailPayrollSummary,
  type WorkerDetailPayrollIssue,
  type WorkerDetailPayrollMetric,
  type WorkerDetailPayrollStatement,
} from "../model/worker-detail-payroll-fixtures";

export type WorkerDetailPayrollViewModel = {
  currentMonthKey?: string;
  issues: readonly WorkerDetailPayrollIssue[];
  profile: WorkerDetailProfile;
  statements: readonly WorkerDetailPayrollStatement[];
  summary: {
    actions: readonly string[];
    metrics: readonly WorkerDetailPayrollMetric[];
    title: string;
  };
};

export type WorkerDetailPayrollDataSource = {
  initialData?: WorkerDetailPayrollViewModel;
  getPayroll: (workerId: string) => Promise<WorkerDetailPayrollViewModel>;
};

type FirestoreDocument = {
  data: Record<string, unknown>;
  id: string;
};

type PayrollCollections = {
  anomalyFlags: readonly FirestoreDocument[];
  bonusItems: readonly FirestoreDocument[];
  correctionRequests: readonly FirestoreDocument[];
  overtimeWorks: readonly FirestoreDocument[];
  payrollSettings: readonly FirestoreDocument[];
  payrollWorkerMonthRows: readonly FirestoreDocument[];
  payStatements: readonly FirestoreDocument[];
  workerTags: readonly FirestoreDocument[];
  workRecords: readonly FirestoreDocument[];
};

type PayrollRow = {
  finalAmount: number | null;
  hasBlockers: boolean;
  monthKey: string;
  payStatementId: string | null;
  rowStatus: string;
  workerId: string;
};

type PayrollSetting = {
  effectiveFrom: string | null;
  hourlyRate: number | null;
  monthlySalary: number | null;
  payrollType: string;
  workerId: string;
};

type PayStatement = {
  currentFinalAmount: number | null;
  finalAmount: number | null;
  id: string;
  managerOnly: Record<string, unknown>;
  monthKey: string;
  paidAt: Date | null;
  scheduledPaymentDate: string | null;
  status: "processing" | "paid";
  workerId: string;
};

type PendingItem = WorkerDetailPayrollIssue & {
  createdAt: Date | null;
};

type WorkerTag = {
  id: string;
  label: string;
  status: string;
};

type WorkRecord = {
  dateKey: string;
  dutyName: string;
  id: string;
  workerId: string;
};

const fixtureWorkerDetailPayrollData = {
  currentMonthKey: "2026-04",
  issues: workerDetailPayrollIssues,
  profile: workerDetailProfile,
  statements: workerDetailPayrollStatements,
  summary: workerDetailPayrollSummary,
} as const satisfies WorkerDetailPayrollViewModel;

export function createWorkerDetailPayrollDataSource(): WorkerDetailPayrollDataSource {
  if (shouldUseVisualMockDataSource()) {
    return {
      initialData: fixtureWorkerDetailPayrollData,
      async getPayroll() {
        return fixtureWorkerDetailPayrollData;
      },
    };
  }

  return {
    async getPayroll(workerId) {
      const workspaceId = await requireActiveWorkspaceId();
      const [workerSnapshot, collections] = await Promise.all([
        getDoc(doc(getFirebaseDb(), "workspaces", workspaceId, "workers", workerId)),
        loadPayrollCollections(workspaceId),
      ]);

      if (!workerSnapshot.exists()) {
        throw new Error("조교 정보를 찾을 수 없습니다.");
      }

      const workerData = workerSnapshot.data() as Record<string, unknown>;
      const rows = collections.payrollWorkerMonthRows
        .map(mapPayrollRow)
        .filter((row) => row.workerId === workerId)
        .sort(comparePayrollRows);
      const statements = collections.payStatements
        .map(mapPayStatement)
        .filter((statement): statement is PayStatement =>
          Boolean(statement && statement.workerId === workerId),
        )
        .sort(compareStatements);
      const setting = collections.payrollSettings
        .map(mapPayrollSetting)
        .filter((item) => item.workerId === workerId)
        .sort(comparePayrollSettings)[0];
      const tags = collections.workerTags.map(mapWorkerTag);
      const tagById = new Map(tags.map((tag) => [tag.id, tag]));
      const workRecordById = new Map(
        collections.workRecords
          .map(mapWorkRecord)
          .filter((record) => record.workerId === workerId)
          .map((record) => [record.id, record]),
      );
      const latestRow = rows[0] ?? null;
      const latestStatement = statements[0] ?? null;
      const issues = buildPendingIssues({
        collections,
        latestRow,
        latestStatement,
        workerId,
        workRecordById,
      });

      return {
        currentMonthKey: latestRow?.monthKey ?? latestStatement?.monthKey,
        issues,
        profile: buildProfile({
          latestRow,
          setting,
          tagById,
          workerData,
        }),
        statements: statements.slice(0, 6).map(mapStatementRow),
        summary: {
          actions: workerDetailPayrollSummary.actions,
          metrics: buildSummaryMetrics({
            issues,
            latestRow,
            latestStatement,
          }),
          title: workerDetailPayrollSummary.title,
        },
      };
    },
  };
}

async function loadPayrollCollections(
  workspaceId: string,
): Promise<PayrollCollections> {
  const [
    anomalyFlags,
    bonusItems,
    correctionRequests,
    overtimeWorks,
    payrollSettings,
    payrollWorkerMonthRows,
    payStatements,
    workerTags,
    workRecords,
  ] = await Promise.all([
    readWorkspaceCollection(workspaceId, "anomalyFlags"),
    readWorkspaceCollection(workspaceId, "bonusItems"),
    readWorkspaceCollection(workspaceId, "correctionRequests"),
    readWorkspaceCollection(workspaceId, "overtimeWorks"),
    readWorkspaceCollection(workspaceId, "payrollSettings"),
    readWorkspaceCollection(workspaceId, "payrollWorkerMonthRows"),
    readWorkspaceCollection(workspaceId, "payStatements"),
    readWorkspaceCollection(workspaceId, "workerTags"),
    readWorkspaceCollection(workspaceId, "workRecords"),
  ]);

  return {
    anomalyFlags,
    bonusItems,
    correctionRequests,
    overtimeWorks,
    payrollSettings,
    payrollWorkerMonthRows,
    payStatements,
    workerTags,
    workRecords,
  };
}

async function readWorkspaceCollection(
  workspaceId: string,
  collectionName: keyof PayrollCollections,
) {
  const snapshot = await getDocs(
    collection(getFirebaseDb(), "workspaces", workspaceId, collectionName),
  );

  return snapshot.docs.map(mapDocument);
}

function buildProfile({
  latestRow,
  setting,
  tagById,
  workerData,
}: {
  latestRow: PayrollRow | null;
  setting?: PayrollSetting;
  tagById: ReadonlyMap<string, WorkerTag>;
  workerData: Record<string, unknown>;
}): WorkerDetailProfile {
  const tag = readStringArray(workerData.tagIds)
    .map((tagId) => tagById.get(tagId))
    .filter(
      (item): item is WorkerTag =>
        item !== undefined && item.status !== "deleted",
    )
    .map((item) => item.label)
    .join(" · ");

  return {
    deleteLabel: workerDetailProfile.deleteLabel,
    monthlySummary: latestRow?.finalAmount == null
      ? `${formatMonthKorean(latestRow?.monthKey ?? "")} 급여명세 미확정`
      : `${formatMonthKorean(latestRow.monthKey)} 산정 ${formatWon(latestRow.finalAmount)}`,
    name: readString(workerData.name, readString(workerData.displayName, "이름 없는 조교")),
    paySummary: formatPayrollBasis(setting),
    registeredSummary: `${formatDateLabel(readDate(workerData.approvedAt) ?? readDate(workerData.createdAt))} 등록`,
    status: readWorkerStatus(workerData),
    tag: tag || "태그 없음",
  };
}

function buildSummaryMetrics({
  issues,
  latestRow,
  latestStatement,
}: {
  issues: readonly PendingItem[];
  latestRow: PayrollRow | null;
  latestStatement: PayStatement | null;
}): readonly WorkerDetailPayrollMetric[] {
  return [
    {
      id: "current-month",
      label: "이번 달 산정",
      tone: latestRow?.finalAmount == null ? "default" : "green",
      value: latestRow?.finalAmount == null ? "산정 대기" : formatWon(latestRow.finalAmount),
    },
    {
      badge: latestStatement ? formatMonthShort(latestStatement.monthKey) : undefined,
      id: "latest-confirmed",
      label: "최근 확정 급여명세",
      tone: latestStatement?.finalAmount == null ? "default" : "green",
      value:
        latestStatement?.finalAmount == null
          ? "급여명세 없음"
          : formatWon(latestStatement.finalAmount),
    },
    {
      id: "pending-issues",
      label: "대기 이슈",
      tone: issues.length > 0 ? "red" : "green",
      value: `${issues.length.toLocaleString("ko-KR")}건`,
    },
  ];
}

function buildPendingIssues({
  collections,
  latestRow,
  latestStatement,
  workerId,
  workRecordById,
}: {
  collections: PayrollCollections;
  latestRow: PayrollRow | null;
  latestStatement: PayStatement | null;
  workerId: string;
  workRecordById: ReadonlyMap<string, WorkRecord>;
}): readonly PendingItem[] {
  const monthKey = latestRow?.monthKey ?? latestStatement?.monthKey ?? "";
  const anomalyItems = collections.anomalyFlags.flatMap((document) => {
    const data = document.data;
    const matches =
      readString(data.workerId, "") === workerId &&
      readString(data.status, "") === "unresolved" &&
      (!monthKey || readString(data.monthKey, monthKey) === monthKey);

    return matches
      ? [
          {
            createdAt: readDate(data.createdAt),
            detailLabel: "REC-01로 이동",
            id: document.id,
            processLabel: "처리",
            state: "처리 대기",
            tag: "이상 플래그",
            tagTone: "red",
            title: `${readString(data.dutyName, "근무 기록")} · ${getAnomalyLabel(readString(data.anomalyType, ""))}`,
          } satisfies PendingItem,
        ]
      : [];
  });
  const overtimeItems = collections.overtimeWorks.flatMap((document) => {
    const data = document.data;
    const matches =
      readString(data.workerId, "") === workerId &&
      (!monthKey || readString(data.monthKey, monthKey) === monthKey) &&
      (readString(data.status, "") === "submitted" ||
        readString(data.payrollStatus, "") === "held");

    if (!matches) {
      return [];
    }

    const recordId = readString(data.workRecordId, "");
    const record = workRecordById.get(recordId);

    return [
      {
        createdAt: readDate(data.createdAt ?? data.submittedAt),
        detailLabel: "REC-01로 이동",
        id: document.id,
        processLabel: "처리",
        state:
          readString(data.status, "") === "submitted" ? "승인 대기" : "급여 보류",
        tag: "추가 근무",
        tagTone: "blue",
        title: `${record?.dutyName ?? "추가근무"} · ${readString(data.reason, "사유 확인 필요")}`,
      } satisfies PendingItem,
    ];
  });
  const correctionItems = collections.correctionRequests.flatMap((document) => {
    const data = document.data;
    const matches =
      readString(data.workerId, "") === workerId &&
      (!monthKey || readString(data.monthKey, monthKey) === monthKey) &&
      (readString(data.status, "") === "submitted" ||
        readString(data.payrollStatus, "") === "held");

    if (!matches) {
      return [];
    }

    const recordId = readString(data.workRecordId, "");
    const record = workRecordById.get(recordId);

    return [
      {
        createdAt: readDate(data.createdAt ?? data.submittedAt),
        detailLabel: "REC-01로 이동",
        id: document.id,
        processLabel: "처리",
        state:
          readString(data.status, "") === "submitted" ? "검토 필요" : "급여 보류",
        tag: "이의 신청",
        tagTone: "orange",
        title: `${record?.dutyName ?? "이의신청"} · ${readString(data.reason, "사유 확인 필요")}`,
      } satisfies PendingItem,
    ];
  });
  const bonusItems = collections.bonusItems.flatMap((document) => {
    const data = document.data;
    const matches =
      readString(data.workerId, "") === workerId &&
      (!monthKey || readString(data.monthKey, monthKey) === monthKey) &&
      readString(data.payrollStatus, "") === "held";

    return matches
      ? [
          {
            createdAt: readDate(data.createdAt),
            detailLabel: "급여 산정",
            id: document.id,
            processLabel: "처리",
            state: "급여 보류",
            tag: "보너스/차감",
            tagTone: "grey",
            title: `${readString(data.label, "보너스/차감")} ${formatSignedWon(readNumber(data.amount, 0))}`,
          } satisfies PendingItem,
        ]
      : [];
  });
  const blockerItems: readonly PendingItem[] = latestRow?.hasBlockers
    ? [
        {
          createdAt: null,
          detailLabel: "급여 산정",
          id: `${latestRow.workerId}-${latestRow.monthKey}-blockers`,
          processLabel: "확인",
          state: "확정 차단",
          tag: "급여",
          tagTone: "red",
          title: `${formatMonthKorean(latestRow.monthKey)} 미처리 항목 확인 필요`,
        },
      ]
    : [];
  const reconfirmationItems: readonly PendingItem[] = readBoolean(
    latestStatement?.managerOnly.needsReconfirmation,
    false,
  )
    ? [
        {
          createdAt: null,
          detailLabel: "급여 산정",
          id: `${latestStatement?.id ?? workerId}-reconfirmation`,
          processLabel: "재확정",
          state: "재확정 필요",
          tag: "재확정",
          tagTone: "orange",
          title: "급여명세 확정 후 산정 입력이 변경되었습니다.",
        },
      ]
    : [];
  const items = [
    ...anomalyItems,
    ...overtimeItems,
    ...correctionItems,
    ...bonusItems,
    ...blockerItems,
    ...reconfirmationItems,
  ];

  return items.sort((left, right) => getSortTime(right.createdAt) - getSortTime(left.createdAt));
}

function mapStatementRow(statement: PayStatement): WorkerDetailPayrollStatement {
  return {
    amount: formatWon(statement.finalAmount),
    id: statement.id,
    memo:
      statement.status === "paid"
        ? "지급 완료"
        : readBoolean(statement.managerOnly.needsReconfirmation, false)
          ? "재확정 필요"
          : "지급 예정",
    month: formatMonthKorean(statement.monthKey),
    status: statement.status === "paid" ? "지급 완료" : "처리중",
    statusTone: statement.status === "paid" ? "green" : "orange",
  };
}

function mapDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): FirestoreDocument {
  return {
    data: snapshot.data() as Record<string, unknown>,
    id: snapshot.id,
  };
}

function mapPayrollRow(document: FirestoreDocument): PayrollRow {
  const data = document.data;
  const summary = readRecord(data.currentCalculationSummary);

  return {
    finalAmount: readNullableNumber(summary.finalAmount),
    hasBlockers: readBoolean(summary.hasBlockers, false),
    monthKey: readMonthKey(data.monthKey),
    payStatementId: readNullableString(data.payStatementId),
    rowStatus: readString(data.rowStatus, "unconfirmed"),
    workerId: readString(data.workerId, ""),
  };
}

function mapPayrollSetting(document: FirestoreDocument): PayrollSetting {
  const data = document.data;

  return {
    effectiveFrom: readNullableString(data.effectiveFrom),
    hourlyRate: readNullableNumber(data.hourlyRate),
    monthlySalary: readNullableNumber(data.monthlySalary),
    payrollType: readString(data.payrollType, "hourly"),
    workerId: readString(data.workerId, ""),
  };
}

function mapPayStatement(document: FirestoreDocument): PayStatement | null {
  const data = document.data;
  const status = readString(data.status, "");

  if (status !== "processing" && status !== "paid") {
    return null;
  }

  const snapshot = readRecord(data.snapshot);
  const currentCalculationSummary = readRecord(data.currentCalculationSummary);

  return {
    currentFinalAmount: readNullableNumber(currentCalculationSummary.finalAmount),
    finalAmount: readNullableNumber(snapshot.finalAmount),
    id: document.id,
    managerOnly: readRecord(data.managerOnly),
    monthKey: readMonthKey(data.monthKey),
    paidAt: readDate(data.paidAt),
    scheduledPaymentDate: readNullableString(data.scheduledPaymentDate),
    status,
    workerId: readString(data.workerId, ""),
  };
}

function mapWorkerTag(document: FirestoreDocument): WorkerTag {
  return {
    id: document.id,
    label: readString(document.data.name, readString(document.data.label, "태그 없음")),
    status: readString(document.data.status, "active"),
  };
}

function mapWorkRecord(document: FirestoreDocument): WorkRecord {
  return {
    dateKey: readString(document.data.dateKey ?? document.data.date, ""),
    dutyName: readString(document.data.dutyName, "근무 기록"),
    id: document.id,
    workerId: readString(document.data.workerId, ""),
  };
}

function comparePayrollRows(left: PayrollRow, right: PayrollRow) {
  return right.monthKey.localeCompare(left.monthKey);
}

function compareStatements(left: PayStatement, right: PayStatement) {
  return right.monthKey.localeCompare(left.monthKey);
}

function comparePayrollSettings(left: PayrollSetting, right: PayrollSetting) {
  return (right.effectiveFrom ?? "").localeCompare(left.effectiveFrom ?? "");
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

function readWorkerStatus(data: Record<string, unknown>) {
  const status = readString(data.status ?? data.membershipStatus, "active");

  return status === "active" || status === "approved" ? "활성" : "비활성";
}

function formatPayrollBasis(setting?: PayrollSetting) {
  if (!setting) {
    return "급여 설정 확인 필요";
  }

  if (setting.payrollType === "monthly") {
    return `월급 ${formatWon(setting.monthlySalary)}`;
  }

  return `시급 ${formatWon(setting.hourlyRate)}`;
}

function getAnomalyLabel(value: string) {
  if (value === "checkout_missing" || value === "missing_checkout") {
    return "퇴근 미처리";
  }

  if (value === "location_mismatch") {
    return "위치 이상";
  }

  if (value === "location_unknown") {
    return "위치 미확인";
  }

  if (value === "time_mismatch") {
    return "시간 이상";
  }

  if (value === "absence_candidate") {
    return "결근 후보";
  }

  return "확인 필요";
}

function formatDateLabel(value: Date | null) {
  if (!value) {
    return "등록일 확인 필요";
  }

  return `${value.getFullYear()}.${String(value.getMonth() + 1).padStart(2, "0")}.${String(
    value.getDate(),
  ).padStart(2, "0")}`;
}

function formatMonthKorean(monthKey: string) {
  const [year, month] = monthKey.split("-");

  if (!year || !month) {
    return "해당 월";
  }

  return `${year}년 ${Number(month)}월`;
}

function formatMonthShort(monthKey: string) {
  const [, month] = monthKey.split("-");

  return month ? `${Number(month)}월` : monthKey;
}

function formatWon(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

function formatSignedWon(value: number) {
  const sign = value >= 0 ? "+" : "-";

  return `${sign}${formatWon(Math.abs(value))}`;
}

function readMonthKey(value: unknown) {
  const monthKey = readString(value, "2026-04");

  return /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : "2026-04";
}

function readDate(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
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

function getSortTime(value: Date | null) {
  return value?.getTime() ?? 0;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
