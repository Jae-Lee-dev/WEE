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
  type PayrollAdjustmentItem,
  type PayrollAmountTone,
  type PayrollCalculationDetail,
  type PayrollCalculationFixture,
  type PayrollCalculationLine,
  type PayrollDetailStateId,
  type PayrollOpenItemCard,
  type PayrollOpenItemAction,
  type PayrollCalculationRow,
  type PayrollStatementBodySection,
  type PayrollStatementDetail,
  type PayrollStatementFixture,
  type PayrollStatementMetric,
  type PayrollStatementRow,
  type PayrollTone,
  type PayrollWorkerSummary,
} from "./payroll-fixtures";

export type PayrollDataSourceMode = "fixture" | "firestore";

export type PayrollCalculationTarget = {
  focusId?: string;
  monthKey?: string;
  workerId?: string;
};

export type PayrollStatementTarget = {
  focusId?: string;
  monthKey?: string;
  workerId?: string;
};

export type PayrollDataSource = {
  mode: PayrollDataSourceMode;
  loadCalculation: (
    target?: PayrollCalculationTarget,
  ) => Promise<PayrollCalculationFixture>;
  loadStatements: (
    target?: PayrollStatementTarget,
  ) => Promise<PayrollStatementFixture>;
};

type PayrollDocument = {
  data: Record<string, unknown>;
  id: string;
};

type PayrollCollections = {
  anomalyFlags: readonly PayrollDocument[];
  bonusItems: readonly PayrollDocument[];
  correctionRequests: readonly PayrollDocument[];
  overtimeWorks: readonly PayrollDocument[];
  payStatements: readonly PayrollDocument[];
  payrollSettings: readonly PayrollDocument[];
  payrollWorkerMonthRows: readonly PayrollDocument[];
  workerPayStatements: readonly PayrollDocument[];
  workRecords: readonly PayrollDocument[];
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
  createdAt: Date | null;
  id: string;
  label: string;
  monthKey: string;
  payrollStatus: string;
  taxScope: string;
  workerId: string;
};

type PayStatement = {
  bonusItemCount: number;
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

type WorkRecord = {
  anomalyType: string;
  dateKey: string;
  dutyName: string;
  effectiveEndAt: Date | null;
  effectiveStartAt: Date | null;
  id: string;
  locationName: string;
  plannedEndAt: Date | null;
  plannedStartAt: Date | null;
  status: string;
  workerId: string;
  workerName: string;
};

type AnomalyFlag = {
  anomalyType: string;
  createdAt: Date | null;
  dateKey: string;
  dutyName: string;
  id: string;
  status: string;
  workRecordId: string | null;
  workerId: string;
  workerName: string;
};

type OvertimeWork = {
  createdAt: Date | null;
  id: string;
  monthKey: string;
  payrollEffect: string;
  payrollStatus: string;
  reason: string;
  status: string;
  workRecordId: string | null;
  workerId: string;
  workerName: string;
};

type CorrectionRequest = {
  createdAt: Date | null;
  id: string;
  monthKey: string;
  payrollEffect: string;
  payrollStatus: string;
  reason: string;
  status: string;
  workRecordId: string | null;
  workerId: string;
  workerName: string;
};

type CalculationAmounts = {
  basePay: number | null;
  finalAmount: number | null;
  postTaxAdjustment: number;
  preTaxAdjustment: number;
  taxAmount: number;
  totalWorkMinutes: number;
  overtimePay: number;
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

    async loadCalculation(target) {
      return buildCalculationViewModel(await loadPayrollCollections(), target);
    },

    async loadStatements(target) {
      return buildStatementViewModel(await loadPayrollCollections(), target);
    },
  };
}

async function loadPayrollCollections(): Promise<PayrollCollections> {
  const workspaceId = await requireActiveWorkspaceId();
  const [
    anomalyFlags,
    payrollWorkerMonthRows,
    payStatements,
    workerPayStatements,
    bonusItems,
    payrollSettings,
    overtimeWorks,
    correctionRequests,
    workRecords,
  ] = await Promise.all([
    getPayrollCollection(workspaceId, "anomalyFlags"),
    getPayrollCollection(workspaceId, "payrollWorkerMonthRows"),
    getPayrollCollection(workspaceId, "payStatements"),
    getPayrollCollection(workspaceId, "workerPayStatements"),
    getPayrollCollection(workspaceId, "bonusItems"),
    getPayrollCollection(workspaceId, "payrollSettings"),
    getPayrollCollection(workspaceId, "overtimeWorks"),
    getPayrollCollection(workspaceId, "correctionRequests"),
    getPayrollCollection(workspaceId, "workRecords"),
  ]);

  return {
    anomalyFlags,
    bonusItems,
    correctionRequests,
    overtimeWorks,
    payStatements,
    payrollSettings,
    payrollWorkerMonthRows,
    workerPayStatements,
    workRecords,
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
  target: PayrollCalculationTarget = {},
): PayrollCalculationFixture {
  const projections = collections.payrollWorkerMonthRows.map(
    mapPayrollWorkerMonthProjection,
  );
  const settings = collections.payrollSettings.map(mapPayrollSetting);
  const bonuses = collections.bonusItems.map(mapBonusItem);
  const statements = collections.payStatements
    .map(mapPayStatement)
    .filter(isPayStatement);
  const workRecords = collections.workRecords.map(mapWorkRecord);
  const anomalyFlags = collections.anomalyFlags.map(mapAnomalyFlag);
  const overtimeWorks = collections.overtimeWorks.map(mapOvertimeWork);
  const correctionRequests = collections.correctionRequests.map(
    mapCorrectionRequest,
  );
  const monthKey = selectCalculationMonthKey(projections, statements, target);
  const settingByWorkerId = indexBy(settings, (setting) => setting.workerId);
  const statementById = indexBy(statements, (statement) => statement.id);
  const statementByWorkerMonth = indexBy(statements, (statement) =>
    getWorkerMonthKey(statement.workerId, statement.monthKey),
  );
  const bonusesByWorkerMonth = groupBy(bonuses, (bonus) =>
    getWorkerMonthKey(bonus.workerId, bonus.monthKey),
  );
  const recordsByWorkerMonth = groupBy(workRecords, (record) =>
    getWorkerMonthKey(record.workerId, record.dateKey.slice(0, 7)),
  );
  const anomaliesByWorkerMonth = groupBy(anomalyFlags, (flag) =>
    getWorkerMonthKey(flag.workerId, flag.dateKey.slice(0, 7)),
  );
  const overtimeByWorkerMonth = groupBy(overtimeWorks, (work) =>
    getWorkerMonthKey(work.workerId, work.monthKey),
  );
  const correctionsByWorkerMonth = groupBy(correctionRequests, (request) =>
    getWorkerMonthKey(request.workerId, request.monthKey),
  );
  const monthProjections = projections
    .filter((row) => row.monthKey === monthKey)
    .sort(compareProjectionRows);
  const rows = monthProjections
    .map((projection) => {
      const workerMonthKey = getWorkerMonthKey(
        projection.workerId,
        projection.monthKey,
      );

      return buildCalculationRow({
        anomalyFlags: anomaliesByWorkerMonth[workerMonthKey] ?? [],
        bonuses: bonusesByWorkerMonth[workerMonthKey] ?? [],
        correctionRequests: correctionsByWorkerMonth[workerMonthKey] ?? [],
        overtimeWorks: overtimeByWorkerMonth[workerMonthKey] ?? [],
        projection,
        records: recordsByWorkerMonth[workerMonthKey] ?? [],
        setting: settingByWorkerId[projection.workerId],
        statement:
          (projection.payStatementId
            ? statementById[projection.payStatementId]
            : undefined) ?? statementByWorkerMonth[workerMonthKey],
      });
    });
  const detailByRowId = Object.fromEntries(
    monthProjections.map((projection) => {
      const workerMonthKey = getWorkerMonthKey(
        projection.workerId,
        projection.monthKey,
      );
      const statement =
        (projection.payStatementId
          ? statementById[projection.payStatementId]
          : undefined) ?? statementByWorkerMonth[workerMonthKey];

      return [
        projection.id,
        buildCalculationDetailSet({
          anomalyFlags: anomaliesByWorkerMonth[workerMonthKey] ?? [],
          bonuses: bonusesByWorkerMonth[workerMonthKey] ?? [],
          correctionRequests: correctionsByWorkerMonth[workerMonthKey] ?? [],
          overtimeWorks: overtimeByWorkerMonth[workerMonthKey] ?? [],
          projection,
          records: recordsByWorkerMonth[workerMonthKey] ?? [],
          setting: settingByWorkerId[projection.workerId],
          statement,
        }),
      ];
    }),
  );
  const firstDetailSet = detailByRowId[rows[0]?.id ?? ""];

  return {
    ...payrollCalculationFixture,
    detailByRowId,
    details: firstDetailSet ?? payrollCalculationFixture.details,
    listCountText: `${rows.length}명`,
    rows,
    selectedMonthLabel: formatMonthDot(monthKey),
    selectedRowId: rows[0]?.id ?? "",
  };
}

function buildCalculationRow({
  anomalyFlags,
  bonuses,
  correctionRequests,
  overtimeWorks,
  projection,
  records,
  setting,
  statement,
}: {
  anomalyFlags: readonly AnomalyFlag[];
  bonuses: readonly BonusItem[];
  correctionRequests: readonly CorrectionRequest[];
  overtimeWorks: readonly OvertimeWork[];
  projection: PayrollWorkerMonthProjection;
  records: readonly WorkRecord[];
  setting?: PayrollSetting;
  statement?: PayStatement;
}): PayrollCalculationRow {
  const amounts = calculateAmounts({
    bonuses,
    projection,
    records,
    setting,
    statement,
  });
  const openItemCount = getOpenItemCount({
    anomalyFlags,
    bonuses,
    correctionRequests,
    overtimeWorks,
    projection,
    statement,
  });

  return {
    id: projection.id,
    basePay: formatWon(amounts.basePay),
    bonusDeduction: formatSignedWon(
      amounts.preTaxAdjustment + amounts.postTaxAdjustment,
    ),
    detailButtonLabel: "상세보기",
    finalPay: formatWon(amounts.finalAmount),
    openItems: openItemCount > 0 ? `미처리 ${openItemCount}건` : "-",
    openItemsTone: openItemCount > 0 ? "orange" : "default",
    overtimePay: formatWon(amounts.overtimePay),
    payStatementId: projection.payStatementId ?? undefined,
    status: getCalculationStatusLabel(projection.rowStatus),
    statusTone: getCalculationStatusTone(projection.rowStatus),
    tax: amounts.taxAmount > 0 ? formatWon(amounts.taxAmount) : "-",
    monthKey: projection.monthKey,
    workerId: projection.workerId,
    workerName: projection.workerName,
  };
}

function buildCalculationDetailSet({
  anomalyFlags,
  bonuses,
  correctionRequests,
  overtimeWorks,
  projection,
  records,
  setting,
  statement,
}: {
  anomalyFlags: readonly AnomalyFlag[];
  bonuses: readonly BonusItem[];
  correctionRequests: readonly CorrectionRequest[];
  overtimeWorks: readonly OvertimeWork[];
  projection: PayrollWorkerMonthProjection;
  records: readonly WorkRecord[];
  setting?: PayrollSetting;
  statement?: PayStatement;
}): Record<PayrollDetailStateId, PayrollCalculationDetail> {
  const detail = buildCalculationDetail({
    anomalyFlags,
    bonuses,
    correctionRequests,
    id: "detail",
    includeAdjustmentForm: false,
    overtimeWorks,
    projection,
    records,
    setting,
    statement,
  });
  const bonusAdd = buildCalculationDetail({
    anomalyFlags,
    bonuses,
    correctionRequests,
    id: "bonus-add",
    includeAdjustmentForm: true,
    overtimeWorks,
    projection,
    records,
    setting,
    statement,
  });
  const noOpenItems = buildCalculationDetail({
    anomalyFlags: [],
    bonuses,
    correctionRequests: [],
    id: "no-open-items",
    includeAdjustmentForm: false,
    overtimeWorks: [],
    projection,
    records,
    setting,
    statement,
  });

  return {
    detail,
    "bonus-add": bonusAdd,
    "no-open-items": noOpenItems,
  };
}

function buildCalculationDetail({
  anomalyFlags,
  bonuses,
  correctionRequests,
  id,
  includeAdjustmentForm,
  overtimeWorks,
  projection,
  records,
  setting,
  statement,
}: {
  anomalyFlags: readonly AnomalyFlag[];
  bonuses: readonly BonusItem[];
  correctionRequests: readonly CorrectionRequest[];
  id: PayrollDetailStateId;
  includeAdjustmentForm: boolean;
  overtimeWorks: readonly OvertimeWork[];
  projection: PayrollWorkerMonthProjection;
  records: readonly WorkRecord[];
  setting?: PayrollSetting;
  statement?: PayStatement;
}): PayrollCalculationDetail {
  const amounts = calculateAmounts({
    bonuses,
    projection,
    records,
    setting,
    statement,
  });
  const openCards = buildOpenItemCards({
    anomalyFlags,
    bonuses,
    correctionRequests,
    overtimeWorks,
    records,
    statement,
  });
  const resolvedCards =
    openCards.length > 0
      ? openCards
      : buildResolvedWorkRecordCards(records.slice(0, 8));
  const footer = buildCalculationFooter({
    openItemCount: openCards.length,
    projection,
  });

  return {
    id,
    addButtonLabel: "항목 추가",
    adjustmentForm: includeAdjustmentForm
      ? payrollCalculationFixture.details["bonus-add"].adjustmentForm
      : undefined,
    adjustmentItems: buildAdjustmentItems(bonuses),
    adjustmentsTitle: "수기 보너스 차감",
    calculationRows: buildCalculationLines({
      amounts,
      setting,
    }),
    calculationTitle: "현재 급여 계산",
    expectedPay: formatWon(amounts.finalAmount),
    expectedPayLabel: "지급 예상액",
    footer,
    headerTitle: "급여 산정 목록",
    worker: buildWorkerSummary({
      finalAmount: amounts.finalAmount,
      monthKey: projection.monthKey,
      projection,
      setting,
      totalWorkMinutes: amounts.totalWorkMinutes,
    }),
    workRecordSection: {
      cards: resolvedCards,
      openCount:
        openCards.length > 0
          ? `미처리 ${openCards.length.toLocaleString("ko-KR")}건`
          : undefined,
      title: "월 근무기록 · 미처리 항목",
      totalCount: `${Math.max(records.length, resolvedCards.length).toLocaleString("ko-KR")}건`,
    },
  };
}

function calculateAmounts({
  bonuses,
  projection,
  records,
  setting,
  statement,
}: {
  bonuses: readonly BonusItem[];
  projection: PayrollWorkerMonthProjection;
  records: readonly WorkRecord[];
  setting?: PayrollSetting;
  statement?: PayStatement;
}): CalculationAmounts {
  const totalWorkMinutes = records.reduce(
    (total, record) => total + getRecordMinutes(record),
    0,
  );
  const basePay = estimateBasePayFromRecords(totalWorkMinutes, setting);
  const overtimePay = statement?.overtimePay ?? 0;
  const preTaxAdjustment = sumBonusesByTaxScope(bonuses, "pre_tax");
  const postTaxAdjustment = sumBonusesByTaxScope(bonuses, "post_tax");
  const taxableSubtotal = (basePay ?? 0) + overtimePay + preTaxAdjustment;
  const taxAmount =
    statement?.taxAmount ??
    Math.max(
      Math.round(taxableSubtotal * ((setting?.taxRatePercent ?? 0) / 100)),
      0,
    );
  const calculatedFinalAmount =
    taxableSubtotal - taxAmount + postTaxAdjustment;
  const finalAmount =
    projection.finalAmount ??
    statement?.currentFinalAmount ??
    statement?.finalAmount ??
    (basePay == null ? null : Math.max(Math.round(calculatedFinalAmount), 0));

  return {
    basePay,
    finalAmount,
    overtimePay,
    postTaxAdjustment,
    preTaxAdjustment,
    taxAmount,
    totalWorkMinutes,
  };
}

function buildCalculationLines({
  amounts,
  setting,
}: {
  amounts: CalculationAmounts;
  setting?: PayrollSetting;
}): readonly PayrollCalculationLine[] {
  const payBasis =
    setting?.payrollType === "monthly"
      ? formatWon(setting.monthlySalary)
      : `${formatHours(amounts.totalWorkMinutes)} × ${formatWon(setting?.hourlyRate)}`;

  return [
    {
      id: "base-hours",
      label: "기준 근무 시간",
      value: `${formatHours(amounts.totalWorkMinutes)} (${payBasis})`,
    },
    {
      id: "base-pay",
      label: "기본 지급액",
      value: formatWon(amounts.basePay),
    },
    {
      id: "overtime",
      label: "추가근무 반영",
      tone: amounts.overtimePay > 0 ? "positive" : "muted",
      value: formatWon(amounts.overtimePay),
    },
    {
      id: "pre-pay-adjustment",
      label: "세전 보너스/차감",
      tone: getAmountTone(amounts.preTaxAdjustment),
      value: formatSignedWon(amounts.preTaxAdjustment),
    },
    {
      id: "tax",
      label: "공제",
      tone: amounts.taxAmount > 0 ? "negative" : "muted",
      value: amounts.taxAmount > 0 ? `- ${formatWon(amounts.taxAmount)}` : "-",
    },
    {
      id: "post-pay-adjustment",
      label: "세후 보너스/차감",
      tone: getAmountTone(amounts.postTaxAdjustment),
      value: formatSignedWon(amounts.postTaxAdjustment),
    },
    {
      id: "rounding",
      label: "올림 기준",
      value: "원 단위",
    },
  ];
}

function buildAdjustmentItems(
  bonuses: readonly BonusItem[],
): readonly PayrollAdjustmentItem[] {
  return bonuses.length > 0
    ? bonuses.map((bonus) => ({
        amount: formatSignedWon(bonus.amount),
        deleteLabel: bonus.payrollStatus === "held" ? "보류" : "삭제",
        id: bonus.id,
        label:
          bonus.payrollStatus === "held"
            ? `${bonus.label} (보류)`
            : bonus.label,
        tone: getAmountTone(bonus.amount),
      }))
    : [
        {
          amount: "-",
          deleteLabel: "없음",
          id: "empty",
          label: "등록된 보너스/차감 항목이 없습니다.",
          tone: "muted",
        },
      ];
}

function buildOpenItemCards({
  anomalyFlags,
  bonuses,
  correctionRequests,
  overtimeWorks,
  records,
  statement,
}: {
  anomalyFlags: readonly AnomalyFlag[];
  bonuses: readonly BonusItem[];
  correctionRequests: readonly CorrectionRequest[];
  overtimeWorks: readonly OvertimeWork[];
  records: readonly WorkRecord[];
  statement?: PayStatement;
}): readonly PayrollOpenItemCard[] {
  const recordById = new Map(records.map((record) => [record.id, record]));
  const anomalyCards = anomalyFlags
    .filter((item) => item.status === "unresolved")
    .map((flag) => {
      const record = flag.workRecordId
        ? recordById.get(flag.workRecordId)
        : undefined;
      const action = createRecordsOpenItemAction(flag.workRecordId);

      return {
        actions: [action],
        dateLabel: formatDateKeyDisplay(flag.dateKey),
        id: flag.id,
        lines: [
          {
            id: "anomaly",
            label: "감지 유형",
            value: getAnomalyLabel(flag.anomalyType),
          },
          {
            id: "record",
            label: "근무기록",
            value: flag.workRecordId ?? "-",
          },
        ],
        locationName: record?.locationName ?? "근무지 확인 필요",
        state: "open",
        statusLabel: "이상 플래그",
        statusTone: "pink",
        timeLabel: formatRecordTime(record),
        title: flag.dutyName || record?.dutyName || "근무 기록 확인 필요",
      } satisfies PayrollOpenItemCard;
    });
  const overtimeCards = overtimeWorks
    .filter(
      (item) => item.status === "submitted" || item.payrollStatus === "held",
    )
    .map((work) => {
      const record = work.workRecordId
        ? recordById.get(work.workRecordId)
        : undefined;
      const action = createRecordsOpenItemAction(work.workRecordId);

      return {
        actions: [action],
        dateLabel: formatDateKeyDisplay(record?.dateKey ?? ""),
        id: work.id,
        lines: [
          { id: "reason", label: "사유", value: work.reason },
          {
            id: "payroll",
            label: "급여 처리",
            tone: work.payrollStatus === "held" ? "negative" : "default",
            value: getPayrollStatusLabel(work.payrollStatus),
          },
        ],
        locationName: record?.locationName ?? "근무지 확인 필요",
        state: "open",
        statusLabel: "추가근무",
        statusTone: "orange",
        timeLabel: formatRecordTime(record),
        title: record?.dutyName ?? "추가근무",
      } satisfies PayrollOpenItemCard;
    });
  const correctionCards = correctionRequests
    .filter(
      (item) => item.status === "submitted" || item.payrollStatus === "held",
    )
    .map((request) => {
      const record = request.workRecordId
        ? recordById.get(request.workRecordId)
        : undefined;
      const action = createRecordsOpenItemAction(request.workRecordId);

      return {
        actions: [action],
        dateLabel: formatDateKeyDisplay(record?.dateKey ?? ""),
        id: request.id,
        lines: [
          { id: "reason", label: "조교 사유", value: request.reason },
          {
            id: "payroll",
            label: "급여 처리",
            tone: request.payrollStatus === "held" ? "negative" : "default",
            value: getPayrollStatusLabel(request.payrollStatus),
          },
        ],
        locationName: record?.locationName ?? "근무지 확인 필요",
        state: "open",
        statusLabel: "이의신청",
        statusTone: "orange",
        timeLabel: formatRecordTime(record),
        title: record?.dutyName ?? "이의신청",
      } satisfies PayrollOpenItemCard;
    });
  const bonusCards = bonuses
    .filter((item) => item.payrollStatus === "held")
    .map(
      (bonus) =>
        ({
          actions: [
            {
              id: "payroll",
              label: "반영 여부 결정",
              unavailableLabel: "산정 화면에서 확인",
            },
          ],
          dateLabel: formatShortDate(bonus.createdAt) ?? "-",
          id: bonus.id,
          lines: [
            {
              id: "amount",
              label: "금액",
              tone: getAmountTone(bonus.amount),
              value: formatSignedWon(bonus.amount),
            },
            {
              id: "tax-scope",
              label: "세율 반영",
              value: getTaxScopeLabel(bonus.taxScope),
            },
          ],
          locationName: "급여 산정",
          state: "open",
          statusLabel: "보너스/차감",
          statusTone: "grey",
          timeLabel: "보류",
          title: bonus.label,
        }) satisfies PayrollOpenItemCard,
    );
  const reconfirmationCards = readBoolean(
    statement?.managerOnly.needsReconfirmation,
    false,
  )
    ? [
        {
          actions: statement
            ? [
                {
                  href: createPayrollStatementHref(statement),
                  id: "statement",
                  label: "명세 확인",
                },
              ]
            : [
                {
                  id: "reconfirm",
                  label: "재확정",
                  unavailableLabel: "재확정 대상 없음",
                },
              ],
          dateLabel: formatMonthKorean(statement?.monthKey ?? ""),
          id: `${statement?.id ?? "statement"}-reconfirmation`,
          lines: [
            {
              id: "snapshot",
              label: "현재 스냅샷",
              value: formatWon(statement?.finalAmount),
            },
            {
              id: "current",
              label: "현재 산정",
              tone: "positive",
              value: formatWon(statement?.currentFinalAmount),
            },
          ],
          locationName: "급여 명세",
          state: "open",
          statusLabel: "재확정 필요",
          statusTone: "orange",
          timeLabel: "처리중 명세",
          title: "확정 후 산정 입력 변경",
        } satisfies PayrollOpenItemCard,
      ]
    : [];

  return [
    ...anomalyCards,
    ...overtimeCards,
    ...correctionCards,
    ...bonusCards,
    ...reconfirmationCards,
  ];
}

function createRecordsOpenItemAction(
  workRecordId: string | null,
): PayrollOpenItemAction {
  if (!workRecordId) {
    return {
      id: "record",
      label: "REC-01에서 처리",
      unavailableLabel: "대상 기록 없음",
    };
  }

  return {
    href: `/records?focus=${encodeURIComponent(workRecordId)}`,
    id: "record",
    label: "REC-01에서 처리",
  };
}

function createPayrollStatementHref(statement: PayStatement) {
  const params = new URLSearchParams({
    focus: statement.id,
    month: statement.monthKey,
    workerId: statement.workerId,
  });

  return `/payroll/statements?${params.toString()}`;
}

function buildResolvedWorkRecordCards(
  records: readonly WorkRecord[],
): readonly PayrollOpenItemCard[] {
  return records.map((record) => ({
    actions: [],
    dateLabel: formatDateKeyDisplay(record.dateKey),
    id: record.id,
    lines: [
      {
        id: "status",
        label: "상태",
        value: getWorkRecordStatusLabel(record.status),
      },
      {
        id: "duration",
        label: "반영 시간",
        value: formatHours(getRecordMinutes(record)),
      },
    ],
    locationName: record.locationName,
    state: "resolved",
    statusLabel: record.anomalyType === "none" ? "근무기록" : "이상 플래그",
    statusTone: record.anomalyType === "none" ? "grey" : "pink",
    timeLabel: formatRecordTime(record),
    title: record.dutyName,
  }));
}

function buildCalculationFooter({
  openItemCount,
  projection,
}: {
  openItemCount: number;
  projection: PayrollWorkerMonthProjection;
}) {
  if (projection.rowStatus === "paid") {
    return {
      actionDisabled: true,
      actionLabel: "지급 완료됨",
      description: "지급 완료된 월은 산정 입력 변경이 잠겨 있습니다.",
      title: "급여 지급 완료",
    };
  }

  const baseAction =
    projection.rowStatus === "needs_reconfirmation"
      ? "급여 재확정"
      : projection.rowStatus === "processing"
        ? "지급 완료"
        : "급여 확정";

  if (openItemCount > 0 || projection.hasBlockers) {
    const blockerCount = Math.max(openItemCount, projection.hasBlockers ? 1 : 0);

    return {
      actionDisabled: true,
      actionLabel: `${baseAction} (미처리 항목 ${blockerCount}/${blockerCount})`,
      description: "미처리 항목을 처리해야 급여 결정을 진행할 수 있습니다.",
      title: `${baseAction}하기`,
    };
  }

  return {
    actionDisabled: false,
    actionLabel: baseAction,
    description: "현재 산정 결과를 기준으로 다음 급여 결정을 진행할 수 있습니다.",
    title: `${baseAction}하기`,
  };
}

function estimateBasePayFromRecords(
  totalWorkMinutes: number,
  setting?: PayrollSetting,
) {
  if (!setting) {
    return null;
  }

  if (setting.payrollType === "monthly") {
    return setting.monthlySalary;
  }

  if (setting.hourlyRate == null) {
    return null;
  }

  return Math.round((totalWorkMinutes / 60) * setting.hourlyRate);
}

function getRecordMinutes(record: WorkRecord) {
  const start = record.effectiveStartAt ?? record.plannedStartAt;
  const end = record.effectiveEndAt ?? record.plannedEndAt;

  if (!start || !end) {
    return 0;
  }

  return Math.max(Math.round((end.getTime() - start.getTime()) / 60000), 0);
}

function sumBonusesByTaxScope(
  bonuses: readonly BonusItem[],
  taxScope: "pre_tax" | "post_tax",
) {
  return bonuses
    .filter(
      (item) =>
        item.payrollStatus !== "held" &&
        (item.taxScope === taxScope ||
          (taxScope === "pre_tax" && !item.taxScope)),
    )
    .reduce((total, item) => total + item.amount, 0);
}

function getAmountTone(value: number): PayrollAmountTone {
  if (value > 0) {
    return "positive";
  }

  if (value < 0) {
    return "negative";
  }

  return "muted";
}

function formatRecordTime(record: WorkRecord | undefined) {
  if (!record) {
    return "--:--~--:--";
  }

  return `${formatTime(record.effectiveStartAt ?? record.plannedStartAt)}~${formatTime(
    record.effectiveEndAt ?? record.plannedEndAt,
  )}`;
}

function formatTime(value: Date | null) {
  if (!value) {
    return "--:--";
  }

  return `${String(value.getHours()).padStart(2, "0")}:${String(
    value.getMinutes(),
  ).padStart(2, "0")}`;
}

function formatHours(minutes: number) {
  if (minutes <= 0) {
    return "0시간";
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest > 0 ? `${hours}시간 ${rest}분` : `${hours}시간`;
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

  return value === "none" ? "정상" : "확인 필요";
}

function getPayrollStatusLabel(value: string) {
  if (value === "held") {
    return "보류";
  }

  if (value === "confirmed" || value === "applied") {
    return "반영";
  }

  return value === "none" ? "미반영" : "확인 필요";
}

function getTaxScopeLabel(value: string) {
  return value === "post_tax" ? "세후 가산" : "세전 합산";
}

function getWorkRecordStatusLabel(value: string) {
  if (value === "resolved") {
    return "처리 완료";
  }

  if (value === "anomaly_unresolved") {
    return "확인 필요";
  }

  return "정상";
}

function formatDateKeyDisplay(value: string) {
  const [, month, day] = value.split("-");

  if (!month || !day) {
    return value || "-";
  }

  return `${month}.${day}`;
}

function buildStatementViewModel(
  collections: PayrollCollections,
  target: PayrollStatementTarget = {},
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
  const monthKey = selectStatementMonthKey(statements, projections, target);
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
  const selectedRowId = resolveStatementSelectedRowId(rows, target);

  return {
    ...payrollStatementFixture,
    detailsByRowId,
    listCountText: `${rows.length}명`,
    rows,
    selectedDetail:
      detailsByRowId[selectedRowId] ??
      detailsByRowId[rows[0]?.id ?? ""] ??
      payrollStatementFixture.selectedDetail,
    selectedMonthLabel: formatMonthKorean(monthKey),
    selectedRowId,
    summaryCards: buildStatementMetrics(rowsForMonth),
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
    monthKey: statement.monthKey,
    status: statement.status === "paid" ? "지급 완료" : "처리중",
    statusTone: statement.status === "paid" ? "green" : "pink",
    workerId: statement.workerId,
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
  const bodySections = buildStatementBodySections(statement, setting);

  return {
    id: statement.id,
    bodySections,
    bodyState: bodySections.length > 0 ? "ready" : "blank",
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

function buildStatementBodySections(
  statement: PayStatement,
  setting?: PayrollSetting,
): readonly PayrollStatementBodySection[] {
  const finalAmount = statement.finalAmount;
  const taxAmount = statement.taxAmount;
  const overtimePay = statement.overtimePay;
  const basePay = estimateBasePay(finalAmount, overtimePay, 0, taxAmount, setting);
  const paidOrScheduledDate =
    formatShortDate(statement.paidAt) ??
    formatShortDate(statement.scheduledPaymentDate) ??
    "-";

  return [
    {
      id: "snapshot-summary",
      title: "명세 스냅샷",
      lines: [
        {
          id: "final-amount",
          label: "최종 지급액",
          value: formatWon(finalAmount),
        },
        {
          id: "payment-date",
          label: statement.status === "paid" ? "지급일" : "지급 예정일",
          value: paidOrScheduledDate,
        },
        {
          id: "payroll-type",
          label: "급여 유형",
          value: getPayrollTypeLabel(statement.payrollType || setting?.payrollType),
        },
      ],
    },
    {
      id: "amount-breakdown",
      title: "금액 산정",
      lines: [
        {
          id: "base-pay",
          label: "기본급",
          value: formatWon(basePay),
        },
        {
          id: "overtime-pay",
          label: "추가근무",
          tone: overtimePay > 0 ? "positive" : "muted",
          value: formatWon(overtimePay),
        },
        {
          id: "bonus-count",
          label: "보너스/차감 반영",
          value:
            statement.bonusItemCount > 0
              ? `${statement.bonusItemCount.toLocaleString("ko-KR")}건`
              : "-",
        },
        {
          id: "tax",
          label: "세금",
          tone: taxAmount > 0 ? "negative" : "muted",
          value: formatWon(taxAmount),
        },
      ],
    },
  ];
}

function buildWorkerSummary({
  finalAmount,
  monthKey,
  projection,
  setting,
  totalWorkMinutes,
}: {
  finalAmount: number | null;
  monthKey: string;
  projection: PayrollWorkerMonthProjection;
  setting?: PayrollSetting;
  totalWorkMinutes?: number;
}): PayrollWorkerSummary {
  return {
    id: projection.workerId,
    hourlyPayLabel: formatPayrollBasis(setting),
    monthlyWorkLabel:
      totalWorkMinutes != null
        ? `${formatMonthKorean(monthKey)} ${formatHours(totalWorkMinutes)} 근무`
        : finalAmount == null
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
    createdAt: readTimestamp(data.createdAt),
    id: document.id,
    label: readString(data.label, "보너스/차감"),
    monthKey: readMonthKey(data.monthKey),
    payrollStatus: readString(data.payrollStatus, "confirmed"),
    taxScope: readString(data.taxScope, "pre_tax"),
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
    bonusItemCount: readStringArray(snapshot.bonusItemIds).length,
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

function mapWorkRecord(document: PayrollDocument): WorkRecord {
  const data = document.data;

  return {
    anomalyType: readString(data.anomalyType, "none"),
    dateKey: readString(data.dateKey ?? data.date, ""),
    dutyName: readString(data.dutyName, "근무 기록"),
    effectiveEndAt: readTimestamp(data.effectiveEndAt),
    effectiveStartAt: readTimestamp(data.effectiveStartAt),
    id: document.id,
    locationName: readString(data.locationName, "근무지 확인 필요"),
    plannedEndAt: readTimestamp(data.plannedEndAt),
    plannedStartAt: readTimestamp(data.plannedStartAt),
    status: readString(data.status, ""),
    workerId: readString(data.workerId, ""),
    workerName: readString(data.workerName, "이름 없는 조교"),
  };
}

function mapAnomalyFlag(document: PayrollDocument): AnomalyFlag {
  const data = document.data;

  return {
    anomalyType: readString(data.anomalyType, "none"),
    createdAt: readTimestamp(data.createdAt),
    dateKey: readString(data.dateKey, ""),
    dutyName: readString(data.dutyName, "근무 기록"),
    id: document.id,
    status: readString(data.status, ""),
    workRecordId: readNullableString(data.workRecordId),
    workerId: readString(data.workerId, ""),
    workerName: readString(data.workerName, "이름 없는 조교"),
  };
}

function mapOvertimeWork(document: PayrollDocument): OvertimeWork {
  const data = document.data;

  return {
    createdAt: readTimestamp(data.createdAt ?? data.submittedAt),
    id: document.id,
    monthKey: readMonthKey(data.monthKey),
    payrollEffect: readString(data.payrollEffect, ""),
    payrollStatus: readString(data.payrollStatus, "none"),
    reason: readString(data.reason, "사유 확인 필요"),
    status: readString(data.status, ""),
    workRecordId: readNullableString(data.workRecordId),
    workerId: readString(data.workerId, ""),
    workerName: readString(data.workerName, "이름 없는 조교"),
  };
}

function mapCorrectionRequest(document: PayrollDocument): CorrectionRequest {
  const data = document.data;

  return {
    createdAt: readTimestamp(data.createdAt ?? data.submittedAt),
    id: document.id,
    monthKey: readMonthKey(data.monthKey),
    payrollEffect: readString(data.payrollEffect, ""),
    payrollStatus: readString(data.payrollStatus, "none"),
    reason: readString(data.reason, "사유 확인 필요"),
    status: readString(data.status, ""),
    workRecordId: readNullableString(data.workRecordId),
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
  target: PayrollCalculationTarget,
) {
  const monthKeys = unique([
    ...projections.map((row) => row.monthKey),
    ...statements.map((statement) => statement.monthKey),
  ]).sort(compareMonthKeyDesc);
  const focusMonth = projections.find(
    (row) => row.id === target.focusId || row.payStatementId === target.focusId,
  )?.monthKey;
  const requestedMonth =
    target.monthKey && monthKeys.includes(target.monthKey)
      ? target.monthKey
      : focusMonth;
  const readyMonth = monthKeys.find((monthKey) =>
    projections.some(
      (row) =>
        row.monthKey === monthKey &&
        (row.finalAmount != null || row.payStatementId != null),
    ),
  );

  return requestedMonth ?? readyMonth ?? monthKeys[0] ?? "2026-04";
}

function selectStatementMonthKey(
  statements: readonly PayStatement[],
  projections: readonly PayrollWorkerMonthProjection[],
  target: PayrollStatementTarget,
) {
  const monthKeys = unique([
    ...statements.map((statement) => statement.monthKey),
    ...projections.map((row) => row.monthKey),
  ]).sort(compareMonthKeyDesc);
  const focusMonth = statements.find(
    (statement) => statement.id === target.focusId,
  )?.monthKey;
  const workerMonth =
    target.workerId && target.monthKey
      ? statements.find(
          (statement) =>
            statement.workerId === target.workerId &&
            statement.monthKey === target.monthKey,
        )?.monthKey
      : undefined;
  const requestedMonth =
    target.monthKey && monthKeys.includes(target.monthKey)
      ? target.monthKey
      : focusMonth ?? workerMonth;

  if (requestedMonth) {
    return requestedMonth;
  }

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

function resolveStatementSelectedRowId(
  rows: readonly PayrollStatementRow[],
  target: PayrollStatementTarget,
) {
  return (
    rows.find((row) => {
      const focusMatches = !target.focusId || row.id === target.focusId;
      const workerMatches = !target.workerId || row.workerId === target.workerId;
      const monthMatches = !target.monthKey || row.monthKey === target.monthKey;

      return focusMatches && workerMatches && monthMatches;
    })?.id ??
    rows[0]?.id ??
    ""
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

function getOpenItemCount({
  anomalyFlags,
  bonuses,
  correctionRequests,
  overtimeWorks,
  projection,
  statement,
}: {
  anomalyFlags: readonly AnomalyFlag[];
  bonuses: readonly BonusItem[];
  correctionRequests: readonly CorrectionRequest[];
  overtimeWorks: readonly OvertimeWork[];
  projection: PayrollWorkerMonthProjection;
  statement?: PayStatement;
}) {
  return (
    (projection.hasBlockers ? 1 : 0) +
    anomalyFlags.filter((item) => item.status === "unresolved").length +
    overtimeWorks.filter(
      (item) => item.status === "submitted" || item.payrollStatus === "held",
    ).length +
    correctionRequests.filter(
      (item) => item.status === "submitted" || item.payrollStatus === "held",
    ).length +
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

  return "처리중";
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

function getPayrollTypeLabel(type: string | null | undefined) {
  return type === "monthly" ? "월급제" : "시급제";
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

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
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
