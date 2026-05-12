import {
  collection,
  getDocs,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { resolveActiveWorkspaceId } from "@/features/entry/workspace-data-source";
import { readActiveWorkspaceId } from "@/features/entry/workspace-onboarding-state";
import { getFirebaseDb, isMockFirebaseProject } from "@/lib/firebase/client";
import {
  payrollCalculationFixture,
  payrollStatementFixture,
  type PayrollCalculationFixture,
  type PayrollCalculationRow,
  type PayrollStatementDetail,
  type PayrollStatementFixture,
  type PayrollStatementMetric,
  type PayrollStatementRow,
  type PayrollTone,
  type PayrollWorkerSummary,
} from "./payroll-fixtures";

export type PayrollDataSourceMode = "fixture" | "firestore";

export type PayrollDataSource = {
  mode: PayrollDataSourceMode;
  loadCalculation: () => Promise<PayrollCalculationFixture>;
  loadStatements: () => Promise<PayrollStatementFixture>;
};

type PayrollDocument = {
  data: Record<string, unknown>;
  id: string;
};

type PayrollCollections = {
  bonusItems: readonly PayrollDocument[];
  payStatements: readonly PayrollDocument[];
  payrollSettings: readonly PayrollDocument[];
  payrollWorkerMonthRows: readonly PayrollDocument[];
  workerPayStatements: readonly PayrollDocument[];
};

type PayrollWorkerMonthProjection = {
  finalAmount: number | null;
  hasBlockers: boolean;
  id: string;
  monthKey: string;
  payStatementId: string | null;
  rowStatus: PayrollRowStatus;
  workerId: string;
  workerName: string;
};

type PayrollRowStatus =
  | "unconfirmed"
  | "processing"
  | "paid"
  | "needs_reconfirmation";

type PayrollSetting = {
  effectiveFrom: string | null;
  hourlyRate: number | null;
  monthlySalary: number | null;
  payrollType: string;
  taxRatePercent: number | null;
  workerId: string;
};

type BonusItem = {
  amount: number;
  monthKey: string;
  payrollStatus: string;
  workerId: string;
};

type PayStatement = {
  confirmedAt: Date | null;
  currentFinalAmount: number | null;
  finalAmount: number | null;
  id: string;
  managerOnly: Record<string, unknown>;
  monthKey: string;
  overtimePay: number;
  paidAt: Date | null;
  payrollType: string;
  scheduledPaymentDate: string | null;
  status: "processing" | "paid";
  taxAmount: number;
  workerId: string;
  workerName: string;
};

export function createPayrollDataSource(): PayrollDataSource {
  if (shouldUseFixtureDataSource()) {
    return createFixturePayrollDataSource();
  }

  return createFirestorePayrollDataSource();
}

function createFixturePayrollDataSource(): PayrollDataSource {
  return {
    mode: "fixture",

    async loadCalculation() {
      return payrollCalculationFixture;
    },

    async loadStatements() {
      return payrollStatementFixture;
    },
  };
}

function createFirestorePayrollDataSource(): PayrollDataSource {
  return {
    mode: "firestore",

    async loadCalculation() {
      return buildCalculationViewModel(await loadPayrollCollections());
    },

    async loadStatements() {
      return buildStatementViewModel(await loadPayrollCollections());
    },
  };
}

async function loadPayrollCollections(): Promise<PayrollCollections> {
  const workspaceId = await requireActiveWorkspaceId();
  const [
    payrollWorkerMonthRows,
    payStatements,
    workerPayStatements,
    bonusItems,
    payrollSettings,
  ] = await Promise.all([
    getPayrollCollection(workspaceId, "payrollWorkerMonthRows"),
    getPayrollCollection(workspaceId, "payStatements"),
    getPayrollCollection(workspaceId, "workerPayStatements"),
    getPayrollCollection(workspaceId, "bonusItems"),
    getPayrollCollection(workspaceId, "payrollSettings"),
  ]);

  return {
    bonusItems,
    payStatements,
    payrollSettings,
    payrollWorkerMonthRows,
    workerPayStatements,
  };
}

async function getPayrollCollection(workspaceId: string, name: string) {
  const snapshot = await getDocs(
    collection(getFirebaseDb(), "workspaces", workspaceId, name),
  );

  return snapshot.docs.map(mapDocument);
}

function buildCalculationViewModel(
  collections: PayrollCollections,
): PayrollCalculationFixture {
  const projections = collections.payrollWorkerMonthRows.map(
    mapPayrollWorkerMonthProjection,
  );
  const settings = collections.payrollSettings.map(mapPayrollSetting);
  const bonuses = collections.bonusItems.map(mapBonusItem);
  const statements = collections.payStatements
    .map(mapPayStatement)
    .filter(isPayStatement);
  const monthKey = selectCalculationMonthKey(projections, statements);
  const settingByWorkerId = indexBy(settings, (setting) => setting.workerId);
  const statementById = indexBy(statements, (statement) => statement.id);
  const statementByWorkerMonth = indexBy(statements, (statement) =>
    getWorkerMonthKey(statement.workerId, statement.monthKey),
  );
  const bonusesByWorkerMonth = groupBy(bonuses, (bonus) =>
    getWorkerMonthKey(bonus.workerId, bonus.monthKey),
  );
  const rows = projections
    .filter((row) => row.monthKey === monthKey)
    .sort(compareProjectionRows)
    .map((projection) => {
      const workerMonthKey = getWorkerMonthKey(
        projection.workerId,
        projection.monthKey,
      );

      return buildCalculationRow({
        bonuses: bonusesByWorkerMonth[workerMonthKey] ?? [],
        projection,
        setting: settingByWorkerId[projection.workerId],
        statement:
          (projection.payStatementId
            ? statementById[projection.payStatementId]
            : undefined) ?? statementByWorkerMonth[workerMonthKey],
      });
    });

  return {
    ...payrollCalculationFixture,
    details: payrollCalculationFixture.details,
    listCountText: `${rows.length}명`,
    rows,
    selectedMonthLabel: formatMonthDot(monthKey),
    selectedRowId: rows[0]?.id ?? "",
  };
}

function buildStatementViewModel(
  collections: PayrollCollections,
): PayrollStatementFixture {
  const managerStatements = collections.payStatements
    .map(mapPayStatement)
    .filter(isPayStatement);
  const workerStatements = collections.workerPayStatements
    .map(mapPayStatement)
    .filter(isPayStatement);
  const statements =
    managerStatements.length > 0 ? managerStatements : workerStatements;
  const projections = collections.payrollWorkerMonthRows.map(
    mapPayrollWorkerMonthProjection,
  );
  const settings = collections.payrollSettings.map(mapPayrollSetting);
  const monthKey = selectStatementMonthKey(statements, projections);
  const projectionByWorkerMonth = indexBy(projections, (row) =>
    getWorkerMonthKey(row.workerId, row.monthKey),
  );
  const settingByWorkerId = indexBy(settings, (setting) => setting.workerId);
  const rowsForMonth = statements
    .filter((statement) => statement.monthKey === monthKey)
    .sort(compareStatements);
  const rows = rowsForMonth.map((statement) =>
    buildStatementRow({
      projection:
        projectionByWorkerMonth[
          getWorkerMonthKey(statement.workerId, statement.monthKey)
        ],
      statement,
    }),
  );
  const detailsByRowId = Object.fromEntries(
    rowsForMonth.map((statement) => [
      statement.id,
      buildStatementDetail({
        projection:
          projectionByWorkerMonth[
            getWorkerMonthKey(statement.workerId, statement.monthKey)
          ],
        setting: settingByWorkerId[statement.workerId],
        statement,
      }),
    ]),
  );

  return {
    ...payrollStatementFixture,
    detailsByRowId,
    listCountText: `${rows.length}명`,
    rows,
    selectedDetail:
      detailsByRowId[rows[0]?.id ?? ""] ?? payrollStatementFixture.selectedDetail,
    selectedMonthLabel: formatMonthKorean(monthKey),
    selectedRowId: rows[0]?.id ?? "",
    summaryCards: buildStatementMetrics(rowsForMonth),
  };
}

function buildCalculationRow({
  bonuses,
  projection,
  setting,
  statement,
}: {
  bonuses: readonly BonusItem[];
  projection: PayrollWorkerMonthProjection;
  setting?: PayrollSetting;
  statement?: PayStatement;
}): PayrollCalculationRow {
  const finalAmount =
    projection.finalAmount ??
    statement?.currentFinalAmount ??
    statement?.finalAmount ??
    null;
  const overtimePay = statement?.overtimePay ?? 0;
  const taxAmount = statement?.taxAmount ?? estimateTaxAmount(finalAmount, setting);
  const bonusTotal = sumConfirmedBonuses(bonuses);
  const basePay = estimateBasePay(
    finalAmount,
    overtimePay,
    bonusTotal,
    taxAmount,
    setting,
  );
  const openItemCount = getOpenItemCount(projection, bonuses, statement);

  return {
    id: projection.id,
    basePay: formatWon(basePay),
    bonusDeduction: formatSignedWon(bonusTotal),
    detailButtonLabel: "상세보기",
    finalPay: formatWon(finalAmount),
    openItems: openItemCount > 0 ? `미처리 ${openItemCount}건` : "-",
    openItemsTone: openItemCount > 0 ? "orange" : "default",
    overtimePay: formatWon(overtimePay),
    status: getCalculationStatusLabel(projection.rowStatus),
    statusTone: getCalculationStatusTone(projection.rowStatus),
    tax: formatWon(taxAmount),
    workerName: projection.workerName,
  };
}

function buildStatementRow({
  projection,
  statement,
}: {
  projection?: PayrollWorkerMonthProjection;
  statement: PayStatement;
}): PayrollStatementRow {
  return {
    id: statement.id,
    confirmedAmount: formatWon(statement.finalAmount),
    confirmedDate:
      formatShortDate(statement.paidAt ?? statement.confirmedAt) ??
      formatShortDate(statement.scheduledPaymentDate) ??
      "-",
    detailButtonLabel: "상세보기",
    status: statement.status === "paid" ? "지급 완료" : "처리중",
    statusTone: statement.status === "paid" ? "green" : "pink",
    workerName: statement.workerName || projection?.workerName || "이름 없는 조교",
  };
}

function buildStatementDetail({
  projection,
  setting,
  statement,
}: {
  projection?: PayrollWorkerMonthProjection;
  setting?: PayrollSetting;
  statement: PayStatement;
}): PayrollStatementDetail {
  return {
    id: statement.id,
    bodySections: [],
    bodyState: "blank",
    confirmedAmount: formatWon(statement.finalAmount),
    confirmedDate:
      formatShortDate(statement.paidAt ?? statement.confirmedAt) ??
      formatShortDate(statement.scheduledPaymentDate) ??
      "-",
    headerTitle: "급여 명세 목록",
    monthLabel: formatMonthKorean(statement.monthKey),
    status: statement.status === "paid" ? "지급 완료" : "처리중",
    statusTone: statement.status === "paid" ? "green" : "pink",
    worker: buildWorkerSummary({
      finalAmount: statement.finalAmount,
      monthKey: statement.monthKey,
      projection: projection ?? {
        finalAmount: statement.finalAmount,
        hasBlockers: false,
        id: statement.id,
        monthKey: statement.monthKey,
        payStatementId: statement.id,
        rowStatus: statement.status,
        workerId: statement.workerId,
        workerName: statement.workerName,
      },
      setting,
    }),
  };
}

function buildStatementMetrics(
  statements: readonly PayStatement[],
): readonly PayrollStatementMetric[] {
  const paidCount = statements.filter((statement) => statement.status === "paid").length;
  const processingCount = statements.filter(
    (statement) => statement.status === "processing",
  ).length;

  return [
    {
      id: "total",
      label: "전체 명세",
      tone: "default",
      unit: "건",
      value: String(statements.length),
    },
    {
      id: "processing",
      label: "처리 중",
      tone: "pink",
      unit: "건",
      value: String(processingCount),
    },
    {
      id: "paid",
      label: "지급 완료",
      tone: "green",
      unit: "건",
      value: String(paidCount),
    },
  ];
}

function buildWorkerSummary({
  finalAmount,
  monthKey,
  projection,
  setting,
}: {
  finalAmount: number | null;
  monthKey: string;
  projection: PayrollWorkerMonthProjection;
  setting?: PayrollSetting;
}): PayrollWorkerSummary {
  return {
    id: projection.workerId,
    hourlyPayLabel: formatPayrollBasis(setting),
    monthlyWorkLabel:
      finalAmount == null
        ? `${formatMonthKorean(monthKey)} 산정 대기`
        : `${formatMonthKorean(monthKey)} 산정 ${formatWon(finalAmount)}`,
    name: projection.workerName,
    registeredDateLabel: setting?.effectiveFrom
      ? `${formatDateKeyDot(setting.effectiveFrom)} 등록`
      : "등록일 확인 필요",
    statusLabel: "활성",
    tagLabel: setting?.payrollType === "monthly" ? "월급제" : "시급제",
  };
}

function mapPayrollWorkerMonthProjection(
  document: PayrollDocument,
): PayrollWorkerMonthProjection {
  const data = document.data;
  const currentCalculationSummary = readRecord(data.currentCalculationSummary);
  const sortKeys = readRecord(data.sortKeys);

  return {
    finalAmount: readNullableNumber(currentCalculationSummary.finalAmount),
    hasBlockers: readBoolean(currentCalculationSummary.hasBlockers, false),
    id: document.id,
    monthKey: readMonthKey(data.monthKey),
    payStatementId: readNullableString(data.payStatementId),
    rowStatus: readPayrollRowStatus(data.rowStatus),
    workerId: readString(data.workerId, ""),
    workerName: readString(
      data.workerNameSnapshot,
      readString(sortKeys.workerName, "이름 없는 조교"),
    ),
  };
}

function mapPayrollSetting(document: PayrollDocument): PayrollSetting {
  const data = document.data;

  return {
    effectiveFrom: readNullableString(data.effectiveFrom),
    hourlyRate: readNullableNumber(data.hourlyRate),
    monthlySalary: readNullableNumber(data.monthlySalary),
    payrollType: readString(data.payrollType, "hourly"),
    taxRatePercent: readNullableNumber(data.taxRatePercent),
    workerId: readString(data.workerId, ""),
  };
}

function mapBonusItem(document: PayrollDocument): BonusItem {
  const data = document.data;

  return {
    amount: readNumber(data.amount, 0),
    monthKey: readMonthKey(data.monthKey),
    payrollStatus: readString(data.payrollStatus, "confirmed"),
    workerId: readString(data.workerId, ""),
  };
}

function mapPayStatement(document: PayrollDocument): PayStatement | null {
  const data = document.data;
  const status = readPayStatementStatus(data.status);
  const snapshot = readRecord(data.snapshot);
  const currentCalculationSummary = readRecord(data.currentCalculationSummary);

  if (!status) {
    return null;
  }

  return {
    confirmedAt: readTimestamp(data.confirmedAt),
    currentFinalAmount: readNullableNumber(currentCalculationSummary.finalAmount),
    finalAmount: readNullableNumber(snapshot.finalAmount),
    id: document.id,
    managerOnly: readRecord(data.managerOnly),
    monthKey: readMonthKey(data.monthKey),
    overtimePay: readNumber(snapshot.overtimePay, 0),
    paidAt: readTimestamp(data.paidAt),
    payrollType: readString(snapshot.payrollType, ""),
    scheduledPaymentDate: readNullableString(data.scheduledPaymentDate),
    status,
    taxAmount: readNumber(snapshot.taxAmount, 0),
    workerId: readString(data.workerId, ""),
    workerName: readString(data.workerName, "이름 없는 조교"),
  };
}

function mapDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): PayrollDocument {
  return {
    data: snapshot.data() as Record<string, unknown>,
    id: snapshot.id,
  };
}

function selectCalculationMonthKey(
  projections: readonly PayrollWorkerMonthProjection[],
  statements: readonly PayStatement[],
) {
  const monthKeys = unique([
    ...projections.map((row) => row.monthKey),
    ...statements.map((statement) => statement.monthKey),
  ]).sort(compareMonthKeyDesc);
  const readyMonth = monthKeys.find((monthKey) =>
    projections.some(
      (row) =>
        row.monthKey === monthKey &&
        (row.finalAmount != null || row.payStatementId != null),
    ),
  );

  return readyMonth ?? monthKeys[0] ?? "2026-04";
}

function selectStatementMonthKey(
  statements: readonly PayStatement[],
  projections: readonly PayrollWorkerMonthProjection[],
) {
  const statementMonth = unique(statements.map((statement) => statement.monthKey))
    .sort(compareMonthKeyDesc)
    .at(0);

  if (statementMonth) {
    return statementMonth;
  }

  return (
    unique(projections.map((row) => row.monthKey)).sort(compareMonthKeyDesc).at(0) ??
    "2026-04"
  );
}

function compareProjectionRows(
  left: PayrollWorkerMonthProjection,
  right: PayrollWorkerMonthProjection,
) {
  return left.workerName.localeCompare(right.workerName, "ko-KR");
}

function compareStatements(left: PayStatement, right: PayStatement) {
  return left.workerName.localeCompare(right.workerName, "ko-KR");
}

function compareMonthKeyDesc(left: string, right: string) {
  return right.localeCompare(left);
}

function estimateBasePay(
  finalAmount: number | null,
  overtimePay: number,
  bonusTotal: number,
  taxAmount: number,
  setting?: PayrollSetting,
) {
  if (setting?.payrollType === "monthly" && setting.monthlySalary != null) {
    return setting.monthlySalary;
  }

  if (finalAmount == null) {
    return null;
  }

  return Math.max(finalAmount - overtimePay - bonusTotal + taxAmount, 0);
}

function estimateTaxAmount(
  finalAmount: number | null,
  setting?: PayrollSetting,
) {
  if (finalAmount == null || setting?.taxRatePercent == null) {
    return 0;
  }

  return Math.max(Math.round(finalAmount * (setting.taxRatePercent / 100)), 0);
}

function sumConfirmedBonuses(items: readonly BonusItem[]) {
  return items
    .filter((item) => item.payrollStatus !== "held")
    .reduce((total, item) => total + item.amount, 0);
}

function getOpenItemCount(
  projection: PayrollWorkerMonthProjection,
  bonuses: readonly BonusItem[],
  statement?: PayStatement,
) {
  return (
    (projection.hasBlockers ? 1 : 0) +
    bonuses.filter((item) => item.payrollStatus === "held").length +
    (readBoolean(statement?.managerOnly.needsReconfirmation, false) ? 1 : 0)
  );
}

function getCalculationStatusLabel(status: PayrollRowStatus) {
  if (status === "unconfirmed") {
    return "미확정";
  }

  if (status === "needs_reconfirmation") {
    return "재확정 필요";
  }

  if (status === "paid") {
    return "지급 완료";
  }

  return "확정";
}

function getCalculationStatusTone(status: PayrollRowStatus): PayrollTone {
  if (status === "unconfirmed") {
    return "grey";
  }

  if (status === "needs_reconfirmation") {
    return "orange";
  }

  return "green";
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

function formatWon(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

function formatSignedWon(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value === 0) {
    return "-";
  }

  const sign = value > 0 ? "+ " : "- ";

  return `${sign}${formatWon(Math.abs(value))}`;
}

function formatMonthDot(monthKey: string) {
  const [year, month] = splitMonthKey(monthKey);

  return `${year}.${month}`;
}

function formatMonthKorean(monthKey: string) {
  const [year, month] = splitMonthKey(monthKey);

  return `${year}년 ${Number(month)}월`;
}

function formatDateKeyDot(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${year}.${month}.${day}`;
}

function formatShortDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const [, month, day] = value.split("-");

    return month && day ? `${month}.${day}` : null;
  }

  return `${String(value.getMonth() + 1).padStart(2, "0")}.${String(
    value.getDate(),
  ).padStart(2, "0")}`;
}

function splitMonthKey(monthKey: string) {
  const [year = "2026", month = "04"] = monthKey.split("-");

  return [year, month.padStart(2, "0")] as const;
}

function readPayrollRowStatus(value: unknown): PayrollRowStatus {
  if (
    value === "processing" ||
    value === "paid" ||
    value === "needs_reconfirmation"
  ) {
    return value;
  }

  return "unconfirmed";
}

function readPayStatementStatus(value: unknown) {
  if (value === "processing" || value === "paid") {
    return value;
  }

  return null;
}

function readMonthKey(value: unknown) {
  const monthKey = readString(value, "2026-04");

  return /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : "2026-04";
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

function readTimestamp(value: unknown) {
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

function getWorkerMonthKey(workerId: string, monthKey: string) {
  return `${workerId}::${monthKey}`;
}

function unique<T>(values: readonly T[]) {
  return Array.from(new Set(values));
}

function indexBy<T>(
  values: readonly T[],
  getKey: (value: T) => string,
): Record<string, T> {
  return Object.fromEntries(values.map((value) => [getKey(value), value]));
}

function groupBy<T>(
  values: readonly T[],
  getKey: (value: T) => string,
): Record<string, T[]> {
  return values.reduce<Record<string, T[]>>((groups, value) => {
    const key = getKey(value);

    groups[key] = [...(groups[key] ?? []), value];

    return groups;
  }, {});
}

function isPayStatement(value: PayStatement | null): value is PayStatement {
  return value !== null;
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
