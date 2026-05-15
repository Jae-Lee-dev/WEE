import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
// TODO(refactor): Before adding more payroll behavior, split this data source
// into Firestore collection readers, document mappers, payroll calculation
// builders, statement view-model builders, and formatting helpers with focused
// pure tests for the calculation and mapper layers.
import { resolveActiveWorkspaceId } from "@/entities/workspace";
import { readActiveWorkspaceId } from "@/entities/workspace";
import { getFirebaseDb, isMockFirebaseProject } from "@/shared/api/firebase/client";
import {
  payrollCalculationFixture,
  payrollRequiredSettingsFixture,
  payrollStatementFixture,
  type PayrollAdjustmentItem,
  type PayrollAdjustmentTaxScope,
  type PayrollAmountTone,
  type PayrollCalculationDetail,
  type PayrollCalculationFixture,
  type PayrollCalculationLine,
  type PayrollDetailStateId,
  type PayrollOpenItemCard,
  type PayrollOpenItemAction,
  type PayrollCalculationRow,
  type PayrollRequiredSettingsFieldId,
  type PayrollRequiredSettingsState,
  type PayrollStatementBodySection,
  type PayrollStatementDetail,
  type PayrollStatementFixture,
  type PayrollStatementMetric,
  type PayrollStatementRow,
  type PayrollTone,
  type PayrollWorkerSummary,
} from "../model/payroll-fixtures";

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
  createAdjustment: (
    input: PayrollAdjustmentInput,
  ) => Promise<PayrollCalculationFixture>;
  decidePayroll: (input: PayrollDecisionInput) => Promise<PayrollCalculationFixture>;
  deleteAdjustment: (
    input: PayrollDeleteAdjustmentInput,
  ) => Promise<PayrollCalculationFixture>;
  mode: PayrollDataSourceMode;
  loadCalculation: (
    target?: PayrollCalculationTarget,
  ) => Promise<PayrollCalculationFixture>;
  loadStatements: (
    target?: PayrollStatementTarget,
  ) => Promise<PayrollStatementFixture>;
  resolveOpenItem: (
    input: PayrollOpenItemResolutionInput,
  ) => Promise<PayrollCalculationFixture>;
  updateRequiredSettings: (input: PayrollRequiredSettingsInput) => Promise<void>;
};

export type PayrollMutationTarget = {
  focusId?: string;
  monthKey: string;
  workerId: string;
};

export type PayrollAdjustmentInput = PayrollMutationTarget & {
  amount: number;
  label: string;
  taxScope: "pre_tax" | "post_tax";
  workerName: string;
};

export type PayrollDeleteAdjustmentInput = PayrollMutationTarget & {
  adjustmentId: string;
};

export type PayrollDecisionInput = PayrollMutationTarget & {
  action: "confirm" | "reconfirm" | "mark_paid";
  scheduledPaymentDate?: string | null;
  workerName: string;
};

export type PayrollOpenItemResolutionInput = PayrollMutationTarget & {
  decision: "apply" | "exclude";
  itemId: string;
  itemType: "bonus" | "correction" | "overtime" | "workRecord";
  workerName: string;
};

export type PayrollRequiredSettingsInput = {
  payrollRoundingUnitWon: number;
  regularPaymentDay: number;
  workTimeRoundingUnitMinutes: number;
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
  workspace: PayrollDocument;
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

type PayrollCalculationRules = {
  payrollRoundingUnitWon: number;
  regularPaymentDay: number | null;
  workTimeRoundingUnitMinutes: number;
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
  basePay: number | null;
  bonusItemCount: number;
  calculationRules: PayrollCalculationRules | null;
  confirmedAt: Date | null;
  currentFinalAmount: number | null;
  finalAmount: number | null;
  id: string;
  managerOnly: Record<string, unknown>;
  monthKey: string;
  overtimePay: number;
  paidAt: Date | null;
  payrollSetting: PayrollSetting | null;
  payrollType: string;
  postTaxAdjustment: number;
  preTaxAdjustment: number;
  scheduledPaymentDate: string | null;
  status: "processing" | "paid";
  taxAmount: number;
  totalWorkMinutes: number | null;
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
  payrollApplication: string;
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
  amount: number | null;
  createdAt: Date | null;
  extraEndAt: Date | null;
  extraStartAt: Date | null;
  id: string;
  monthKey: string;
  payrollEffect: string;
  payrollPayMode: string;
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
  roundedFinalAmount: number | null;
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
    async createAdjustment() {
      return payrollCalculationFixture;
    },
    async decidePayroll() {
      return payrollCalculationFixture;
    },
    async deleteAdjustment() {
      return payrollCalculationFixture;
    },
    mode: "fixture",

    async loadCalculation() {
      return payrollCalculationFixture;
    },

    async loadStatements() {
      return payrollStatementFixture;
    },

    async resolveOpenItem() {
      return payrollCalculationFixture;
    },

    async updateRequiredSettings() {},
  };
}

function createFirestorePayrollDataSource(): PayrollDataSource {
  return {
    async createAdjustment(input) {
      const workspaceId = await requireActiveWorkspaceId();
      const collections = await loadPayrollCollections();
      const payrollContext = getPayrollMutationContext(collections, input);

      if (payrollContext.paid) {
        throw new Error("지급 완료된 월의 급여 조정 항목은 수정할 수 없습니다.");
      }

      const adjustmentRef = doc(getPayrollCollectionRef(workspaceId, "bonusItems"));
      const batch = writeBatch(getFirebaseDb());

      batch.set(adjustmentRef, {
        amount: input.amount,
        createdAt: serverTimestamp(),
        label: input.label,
        monthKey: input.monthKey,
        payrollStatus: "confirmed",
        taxScope: input.taxScope,
        updatedAt: serverTimestamp(),
        workerId: input.workerId,
        workerName: input.workerName,
        workspaceId,
      });
      queuePayrollReconfirmation({
        batch,
        reason: "급여 조정 항목 추가",
        workspaceId,
        ...payrollContext,
      });

      await batch.commit();

      return buildCalculationViewModel(await loadPayrollCollections(), input);
    },
    async decidePayroll(input) {
      const workspaceId = await requireActiveWorkspaceId();
      const collections = await loadPayrollCollections();
      const projection = collections.payrollWorkerMonthRows
        .map(mapPayrollWorkerMonthProjection)
        .find((row) =>
          row.id === input.focusId ||
          (row.workerId === input.workerId && row.monthKey === input.monthKey),
        );

      if (!projection) {
        throw new Error("급여 산정 대상을 찾을 수 없습니다.");
      }

      const workerMonthKey = getWorkerMonthKey(projection.workerId, projection.monthKey);
      const calculationRules = mapWorkspaceCalculationRules(collections.workspace);
      const settings = collections.payrollSettings.map(mapPayrollSetting);
      const resolveSetting = createPayrollSettingResolver(settings);
      const bonusesByWorkerMonth = groupBy(
        collections.bonusItems.map(mapBonusItem).filter((bonus) => bonus.payrollStatus !== "deleted"),
        (bonus) => getWorkerMonthKey(bonus.workerId, bonus.monthKey),
      );
      const recordsByWorkerMonth = groupBy(collections.workRecords.map(mapWorkRecord), (record) =>
        getWorkerMonthKey(record.workerId, record.dateKey.slice(0, 7)),
      );
      const overtimeByWorkerMonth = groupBy(
        collections.overtimeWorks.map(mapOvertimeWork),
        (work) => getWorkerMonthKey(work.workerId, work.monthKey),
      );
      const anomaliesByWorkerMonth = groupBy(
        collections.anomalyFlags.map(mapAnomalyFlag),
        (flag) => getWorkerMonthKey(flag.workerId, flag.dateKey.slice(0, 7)),
      );
      const correctionsByWorkerMonth = groupBy(
        collections.correctionRequests.map(mapCorrectionRequest),
        (request) => getWorkerMonthKey(request.workerId, request.monthKey),
      );
      const statements = collections.payStatements
        .map(mapPayStatement)
        .filter(isPayStatement);
      const statement =
        statements.find((item) => item.id === input.focusId) ??
        statements.find(
          (item) =>
            item.workerId === projection.workerId &&
            item.monthKey === projection.monthKey,
        );
      const setting = resolveSetting(projection.workerId, projection.monthKey);
      const blockingItemCount = getOpenItemCount({
        anomalyFlags: anomaliesByWorkerMonth[workerMonthKey] ?? [],
        bonuses: bonusesByWorkerMonth[workerMonthKey] ?? [],
        correctionRequests: correctionsByWorkerMonth[workerMonthKey] ?? [],
        overtimeWorks: overtimeByWorkerMonth[workerMonthKey] ?? [],
        projection,
        records: recordsByWorkerMonth[workerMonthKey] ?? [],
      });

      if (input.action !== "mark_paid" && blockingItemCount > 0) {
        throw new Error("미처리 항목을 처리해야 급여를 확정할 수 있습니다.");
      }

      const amounts = calculateAmounts({
        bonuses: bonusesByWorkerMonth[workerMonthKey] ?? [],
        overtimeWorks: overtimeByWorkerMonth[workerMonthKey] ?? [],
        projection,
        records: recordsByWorkerMonth[workerMonthKey] ?? [],
        calculationRules,
        setting,
        statement,
      });
      const statementId =
        statement?.id ?? `pay_${projection.monthKey.replace("-", "")}_${projection.workerId}`;
      const scheduledPaymentDate =
        input.scheduledPaymentDate ??
        getDefaultScheduledPaymentDate(
          projection.monthKey,
          calculationRules.regularPaymentDay,
        );

      if (input.action === "mark_paid") {
        await Promise.all([
          setDoc(
            doc(getFirebaseDb(), "workspaces", workspaceId, "payStatements", statementId),
            {
              paidAt: serverTimestamp(),
              status: "paid",
              updatedAt: serverTimestamp(),
              workspaceId,
            },
            { merge: true },
          ),
          updateDoc(
            doc(getFirebaseDb(), "workspaces", workspaceId, "payrollWorkerMonthRows", projection.id),
            {
              rowStatus: "paid",
              updatedAt: serverTimestamp(),
            },
          ),
        ]);
      } else {
        await Promise.all([
          setDoc(
            doc(getFirebaseDb(), "workspaces", workspaceId, "payStatements", statementId),
            {
              confirmedAt: serverTimestamp(),
              currentCalculationSummary: {
                finalAmount: amounts.finalAmount,
                sourceChangedAt: null,
              },
              managerOnly: {
                diffReason: null,
                needsReconfirmation: false,
              },
              monthKey: projection.monthKey,
              scheduledPaymentDate,
              snapshot: createPayStatementSnapshot({
                amounts,
                bonuses: bonusesByWorkerMonth[workerMonthKey] ?? [],
                calculationRules,
                setting,
              }),
              status: "processing",
              updatedAt: serverTimestamp(),
              workerId: projection.workerId,
              workerName: input.workerName,
              workspaceId,
            },
            { merge: true },
          ),
          updateDoc(
            doc(getFirebaseDb(), "workspaces", workspaceId, "payrollWorkerMonthRows", projection.id),
            {
              currentCalculationSummary: {
                finalAmount: amounts.finalAmount,
                hasBlockers: false,
              },
              payStatementId: statementId,
              rowStatus: "processing",
              updatedAt: serverTimestamp(),
            },
          ),
        ]);
      }

      return buildCalculationViewModel(await loadPayrollCollections(), {
        focusId: projection.id,
        monthKey: projection.monthKey,
        workerId: projection.workerId,
      });
    },
    async deleteAdjustment(input) {
      const workspaceId = await requireActiveWorkspaceId();
      const collections = await loadPayrollCollections();
      const payrollContext = getPayrollMutationContext(collections, input);

      if (payrollContext.paid) {
        throw new Error("지급 완료된 월의 급여 조정 항목은 수정할 수 없습니다.");
      }

      const batch = writeBatch(getFirebaseDb());

      batch.update(
        doc(getFirebaseDb(), "workspaces", workspaceId, "bonusItems", input.adjustmentId),
        {
          deletedAt: serverTimestamp(),
          payrollStatus: "deleted",
          updatedAt: serverTimestamp(),
        },
      );
      queuePayrollReconfirmation({
        batch,
        reason: "급여 조정 항목 삭제",
        workspaceId,
        ...payrollContext,
      });

      await batch.commit();

      return buildCalculationViewModel(await loadPayrollCollections(), input);
    },
    async resolveOpenItem(input) {
      const workspaceId = await requireActiveWorkspaceId();
      const collections = await loadPayrollCollections();
      const payrollContext = getPayrollMutationContext(collections, input);

      if (payrollContext.paid) {
        throw new Error("지급 완료된 월의 미처리 항목은 수정할 수 없습니다.");
      }

      const batch = writeBatch(getFirebaseDb());

      queueOpenItemResolution({
        batch,
        input,
        collections,
        workspaceId,
      });
      queuePayrollReconfirmation({
        batch,
        reason: getOpenItemResolutionReason(input),
        workspaceId,
        ...payrollContext,
      });

      await batch.commit();

      return buildCalculationViewModel(await loadPayrollCollections(), input);
    },
    mode: "firestore",

    async loadCalculation(target) {
      return buildCalculationViewModel(await loadPayrollCollections(), target);
    },

    async loadStatements(target) {
      return buildStatementViewModel(await loadPayrollCollections(), target);
    },

    async updateRequiredSettings(input) {
      const workspaceId = await requireActiveWorkspaceId();

      await updateDoc(doc(getFirebaseDb(), "workspaces", workspaceId), {
        "settings.payrollRoundingUnitWon": input.payrollRoundingUnitWon,
        "settings.regularPaymentDay": input.regularPaymentDay,
        "settings.workTimeRoundingUnitMinutes":
          input.workTimeRoundingUnitMinutes,
        updatedAt: serverTimestamp(),
      });
    },
  };
}

async function loadPayrollCollections(): Promise<PayrollCollections> {
  const workspaceId = await requireActiveWorkspaceId();
  const [
    workspaceSnapshot,
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
    getDoc(doc(getFirebaseDb(), "workspaces", workspaceId)),
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
    workspace: {
      data: (workspaceSnapshot.data() as Record<string, unknown> | undefined) ?? {},
      id: workspaceId,
    },
    workRecords,
  };
}

async function getPayrollCollection(workspaceId: string, name: string) {
  const snapshot = await getDocs(
    getPayrollCollectionRef(workspaceId, name),
  );

  return snapshot.docs.map(mapDocument);
}

function getPayrollCollectionRef(workspaceId: string, name: string) {
  return collection(getFirebaseDb(), "workspaces", workspaceId, name);
}

type PayrollMutationContext = {
  paid: boolean;
  row: PayrollDocument | null;
  statement: PayrollDocument | null;
};

function getPayrollMutationContext(
  collections: PayrollCollections,
  target: PayrollMutationTarget,
): PayrollMutationContext {
  const statement = collections.payStatements.find(
    (item) =>
      item.id === target.focusId ||
      (readString(item.data.workerId, "") === target.workerId &&
        readMonthKey(item.data.monthKey) === target.monthKey),
  ) ?? null;
  const row = collections.payrollWorkerMonthRows.find(
    (item) =>
      item.id === target.focusId ||
      (readString(item.data.workerId, "") === target.workerId &&
        readMonthKey(item.data.monthKey) === target.monthKey),
  ) ?? null;
  const paid =
    readString(statement?.data.status, "") === "paid" ||
    readString(row?.data.rowStatus, "") === "paid";

  return { paid, row, statement };
}

function queuePayrollReconfirmation({
  batch,
  reason,
  row,
  statement,
  workspaceId,
}: PayrollMutationContext & {
  batch: ReturnType<typeof writeBatch>;
  reason: string;
  workspaceId: string;
}) {
  const statementProcessing = readString(statement?.data.status, "") === "processing";
  const rowStatus = readString(row?.data.rowStatus, "");
  const rowProcessing = rowStatus === "processing" || rowStatus === "needs_reconfirmation";

  if (!statementProcessing && !rowProcessing) {
    return;
  }

  if (statement) {
    batch.set(
      doc(getFirebaseDb(), "workspaces", workspaceId, "payStatements", statement.id),
      {
        currentCalculationSummary: {
          sourceChangedAt: serverTimestamp(),
        },
        managerOnly: {
          diffReason: reason,
          needsReconfirmation: true,
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  if (row) {
    batch.set(
      doc(getFirebaseDb(), "workspaces", workspaceId, "payrollWorkerMonthRows", row.id),
      {
        rowStatus: "needs_reconfirmation",
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
}

function createPayStatementSnapshot({
  amounts,
  bonuses,
  calculationRules,
  setting,
}: {
  amounts: CalculationAmounts;
  bonuses: readonly BonusItem[];
  calculationRules: PayrollCalculationRules;
  setting?: PayrollSetting;
}) {
  return {
    basePay: amounts.basePay,
    bonusItemCount: bonuses.length,
    bonusItemIds: bonuses.map((bonus) => bonus.id),
    calculationRules,
    finalAmount: amounts.finalAmount,
    overtimePay: amounts.overtimePay,
    payrollSetting: setting
      ? {
          effectiveFrom: setting.effectiveFrom,
          hourlyRate: setting.hourlyRate,
          monthlySalary: setting.monthlySalary,
          payrollType: setting.payrollType,
          taxRatePercent: setting.taxRatePercent,
          workerId: setting.workerId,
        }
      : null,
    payrollType: setting?.payrollType ?? "hourly",
    postTaxAdjustment: amounts.postTaxAdjustment,
    preTaxAdjustment: amounts.preTaxAdjustment,
    roundedFinalAmount: amounts.roundedFinalAmount,
    taxAmount: amounts.taxAmount,
    totalWorkMinutes: amounts.totalWorkMinutes,
  };
}

function queueOpenItemResolution({
  batch,
  collections,
  input,
  workspaceId,
}: {
  batch: ReturnType<typeof writeBatch>;
  collections: PayrollCollections;
  input: PayrollOpenItemResolutionInput;
  workspaceId: string;
}) {
  const db = getFirebaseDb();
  const include = input.decision === "apply";

  if (input.itemType === "workRecord") {
    batch.update(
      doc(db, "workspaces", workspaceId, "workRecords", input.itemId),
      {
        "managerOnly.payrollApplication": include ? "applied" : "excluded",
        updatedAt: serverTimestamp(),
      },
    );
    return;
  }

  if (input.itemType === "overtime") {
    batch.update(
      doc(db, "workspaces", workspaceId, "overtimeWorks", input.itemId),
      {
        payrollEffect: include ? "immediate" : "none",
        payrollStatus: include ? "confirmed" : "none",
        updatedAt: serverTimestamp(),
      },
    );
    return;
  }

  if (input.itemType === "correction") {
    const request = collections.correctionRequests.find(
      (item) => item.id === input.itemId,
    );
    const workRecordId = readNullableString(request?.data.workRecordId);

    batch.update(
      doc(db, "workspaces", workspaceId, "correctionRequests", input.itemId),
      {
        payrollEffect: include ? "applied" : "none",
        payrollStatus: include ? "applied" : "none",
        updatedAt: serverTimestamp(),
      },
    );

    if (workRecordId) {
      batch.update(
        doc(db, "workspaces", workspaceId, "workRecords", workRecordId),
        {
          "managerOnly.payrollApplication": include ? "applied" : "excluded",
          updatedAt: serverTimestamp(),
        },
      );
    }
    return;
  }

  batch.update(
    doc(db, "workspaces", workspaceId, "bonusItems", input.itemId),
    {
      ...(include ? {} : { deletedAt: serverTimestamp() }),
      payrollStatus: include ? "confirmed" : "deleted",
      updatedAt: serverTimestamp(),
    },
  );
}

function getOpenItemResolutionReason(input: PayrollOpenItemResolutionInput) {
  const targetLabel =
    input.itemType === "workRecord"
      ? "근무기록"
      : input.itemType === "overtime"
        ? "추가근무"
        : input.itemType === "correction"
          ? "이의신청"
          : "보너스/차감";
  const decisionLabel = input.decision === "apply" ? "급여 반영" : "급여 제외";

  return `${targetLabel} 미처리 항목 ${decisionLabel}`;
}

function buildCalculationViewModel(
  collections: PayrollCollections,
  target: PayrollCalculationTarget = {},
): PayrollCalculationFixture {
  const projections = collections.payrollWorkerMonthRows.map(
    mapPayrollWorkerMonthProjection,
  );
  const calculationRules = mapWorkspaceCalculationRules(collections.workspace);
  const requiredSettings = mapWorkspaceRequiredSettings(collections.workspace);
  const settings = collections.payrollSettings.map(mapPayrollSetting);
  const bonuses = collections.bonusItems
    .map(mapBonusItem)
    .filter((bonus) => bonus.payrollStatus !== "deleted");
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
  const resolveSetting = createPayrollSettingResolver(settings);
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
      const setting = resolveSetting(projection.workerId, projection.monthKey);

      return buildCalculationRow({
        anomalyFlags: anomaliesByWorkerMonth[workerMonthKey] ?? [],
        bonuses: bonusesByWorkerMonth[workerMonthKey] ?? [],
        correctionRequests: correctionsByWorkerMonth[workerMonthKey] ?? [],
        overtimeWorks: overtimeByWorkerMonth[workerMonthKey] ?? [],
        projection,
        records: recordsByWorkerMonth[workerMonthKey] ?? [],
        calculationRules,
        setting,
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
      const setting = resolveSetting(projection.workerId, projection.monthKey);

      return [
        projection.id,
        buildCalculationDetailSet({
          anomalyFlags: anomaliesByWorkerMonth[workerMonthKey] ?? [],
          bonuses: bonusesByWorkerMonth[workerMonthKey] ?? [],
          correctionRequests: correctionsByWorkerMonth[workerMonthKey] ?? [],
          overtimeWorks: overtimeByWorkerMonth[workerMonthKey] ?? [],
          projection,
          records: recordsByWorkerMonth[workerMonthKey] ?? [],
          calculationRules,
          setting,
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
    requiredSettings,
    rows,
    selectedMonthLabel: formatMonthDot(monthKey),
    selectedRowId: rows[0]?.id ?? "",
  };
}

function buildCalculationRow({
  anomalyFlags,
  bonuses,
  calculationRules,
  correctionRequests,
  overtimeWorks,
  projection,
  records,
  setting,
  statement,
}: {
  anomalyFlags: readonly AnomalyFlag[];
  bonuses: readonly BonusItem[];
  calculationRules: PayrollCalculationRules;
  correctionRequests: readonly CorrectionRequest[];
  overtimeWorks: readonly OvertimeWork[];
  projection: PayrollWorkerMonthProjection;
  records: readonly WorkRecord[];
  setting?: PayrollSetting;
  statement?: PayStatement;
}): PayrollCalculationRow {
  const amounts = calculateAmounts({
    bonuses,
    overtimeWorks,
    projection,
    records,
    calculationRules,
    setting,
    statement,
  });
  const rowStatus = getEffectiveCalculationRowStatus({
    amounts,
    projection,
    statement,
  });
  const openItemCount = getOpenItemCount({
    anomalyFlags,
    bonuses,
    correctionRequests,
    overtimeWorks,
    projection,
    records,
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
    status: getCalculationStatusLabel(rowStatus),
    statusTone: getCalculationStatusTone(rowStatus),
    tax: amounts.taxAmount > 0 ? formatWon(amounts.taxAmount) : "-",
    monthKey: projection.monthKey,
    workerId: projection.workerId,
    workerName: projection.workerName,
  };
}

function buildCalculationDetailSet({
  anomalyFlags,
  bonuses,
  calculationRules,
  correctionRequests,
  overtimeWorks,
  projection,
  records,
  setting,
  statement,
}: {
  anomalyFlags: readonly AnomalyFlag[];
  bonuses: readonly BonusItem[];
  calculationRules: PayrollCalculationRules;
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
    calculationRules,
    correctionRequests,
    id: "detail",
    overtimeWorks,
    projection,
    records,
    setting,
    statement,
  });
  const noOpenItems = buildCalculationDetail({
    anomalyFlags: [],
    bonuses,
    calculationRules,
    correctionRequests: [],
    id: "no-open-items",
    overtimeWorks: [],
    projection,
    records,
    setting,
    statement,
  });

  return {
    detail,
    "no-open-items": noOpenItems,
  };
}

function buildCalculationDetail({
  anomalyFlags,
  bonuses,
  calculationRules,
  correctionRequests,
  id,
  overtimeWorks,
  projection,
  records,
  setting,
  statement,
}: {
  anomalyFlags: readonly AnomalyFlag[];
  bonuses: readonly BonusItem[];
  calculationRules: PayrollCalculationRules;
  correctionRequests: readonly CorrectionRequest[];
  id: PayrollDetailStateId;
  overtimeWorks: readonly OvertimeWork[];
  projection: PayrollWorkerMonthProjection;
  records: readonly WorkRecord[];
  setting?: PayrollSetting;
  statement?: PayStatement;
}): PayrollCalculationDetail {
  const amounts = calculateAmounts({
    bonuses,
    overtimeWorks,
    projection,
    records,
    calculationRules,
    setting,
    statement,
  });
  const rowStatus = getEffectiveCalculationRowStatus({
    amounts,
    projection,
    statement,
  });
  const openCards = buildOpenItemCards({
    anomalyFlags,
    bonuses,
    calculationRules,
    correctionRequests,
    currentFinalAmount: amounts.finalAmount,
    overtimeWorks,
    records,
    statement,
  });
  const openWorkRecordIds = collectOpenWorkRecordIds({
    anomalyFlags,
    correctionRequests,
    overtimeWorks,
    records,
  });
  const blockingOpenItemCount = openCards.filter(isBlockingOpenItemCard).length;
  const monthlyRecordCards = buildResolvedWorkRecordCards(
    records.filter((record) => !openWorkRecordIds.has(record.id)),
    calculationRules,
  );
  const workRecordCards = [...openCards, ...monthlyRecordCards];
  const footer = buildCalculationFooter({
    calculationRules,
    openItemCount: blockingOpenItemCount,
    projection: {
      ...projection,
      rowStatus,
    },
  });

  return {
    id,
    adjustmentForm: payrollCalculationFixture.details.detail.adjustmentForm,
    adjustmentItems: buildAdjustmentItems(bonuses),
    calculationRuleLabel: formatCalculationRules(calculationRules),
    calculationRows: buildCalculationLines({
      amounts,
      setting,
    }),
    calculationTitle: "급여 산정 내역",
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
      cards: workRecordCards,
      openCount:
        blockingOpenItemCount > 0
          ? `미처리 ${blockingOpenItemCount.toLocaleString("ko-KR")}건`
          : undefined,
      title: "월 근무기록",
      totalCount: `${records.length.toLocaleString("ko-KR")}건`,
    },
  };
}

function calculateAmounts({
  bonuses,
  calculationRules,
  overtimeWorks,
  projection,
  records,
  setting,
  statement,
}: {
  bonuses: readonly BonusItem[];
  calculationRules: PayrollCalculationRules;
  overtimeWorks: readonly OvertimeWork[];
  projection: PayrollWorkerMonthProjection;
  records: readonly WorkRecord[];
  setting?: PayrollSetting;
  statement?: PayStatement;
}): CalculationAmounts {
  const totalWorkMinutes = records.reduce(
    (total, record) => total + getPayrollRecordMinutes(record, calculationRules),
    0,
  );
  const basePay = estimateBasePayFromRecords(totalWorkMinutes, setting);
  const calculatedOvertimePay = sumConfirmedOvertimePay(overtimeWorks, setting);
  const overtimePay =
    projection.rowStatus === "paid"
      ? (statement?.overtimePay ?? calculatedOvertimePay)
      : calculatedOvertimePay;
  const preTaxAdjustment = sumBonusesByTaxScope(bonuses, "pre_tax");
  const postTaxAdjustment = sumBonusesByTaxScope(bonuses, "post_tax");
  const taxableSubtotal = (basePay ?? 0) + overtimePay + preTaxAdjustment;
  const lockedStatement =
    projection.rowStatus === "paid" ? statement : undefined;
  const taxAmount = lockedStatement
    ? lockedStatement.taxAmount
    : Math.max(
        Math.round(taxableSubtotal * ((setting?.taxRatePercent ?? 0) / 100)),
        0,
      );
  const calculatedFinalAmount =
    taxableSubtotal - taxAmount + postTaxAdjustment;
  const roundedFinalAmount =
    basePay == null
      ? null
      : roundUpToUnit(
          Math.max(Math.round(calculatedFinalAmount), 0),
          calculationRules.payrollRoundingUnitWon,
        );
  const finalAmount = resolveCalculationFinalAmount({
    calculatedFinalAmount: roundedFinalAmount,
    projection,
    statement,
  });

  return {
    basePay,
    finalAmount,
    overtimePay,
    postTaxAdjustment,
    preTaxAdjustment,
    roundedFinalAmount,
    taxAmount,
    totalWorkMinutes,
  };
}

function resolveCalculationFinalAmount({
  calculatedFinalAmount,
  projection,
  statement,
}: {
  calculatedFinalAmount: number | null;
  projection: PayrollWorkerMonthProjection;
  statement?: PayStatement;
}) {
  if (projection.rowStatus === "paid") {
    return (
      statement?.finalAmount ?? projection.finalAmount ?? calculatedFinalAmount
    );
  }

  return (
    calculatedFinalAmount ??
    projection.finalAmount ??
    statement?.currentFinalAmount ??
    statement?.finalAmount ??
    null
  );
}

function getEffectiveCalculationRowStatus({
  amounts,
  projection,
  statement,
}: {
  amounts: CalculationAmounts;
  projection: PayrollWorkerMonthProjection;
  statement?: PayStatement;
}): PayrollRowStatus {
  if (
    projection.rowStatus === "processing" &&
    hasStatementCalculationMismatch(statement, amounts.finalAmount)
  ) {
    return "needs_reconfirmation";
  }

  return projection.rowStatus;
}

function hasStatementCalculationMismatch(
  statement: PayStatement | undefined,
  currentFinalAmount: number | null,
) {
  return (
    statement?.status === "processing" &&
    statement.finalAmount != null &&
    currentFinalAmount != null &&
    statement.finalAmount !== currentFinalAmount
  );
}

function buildCalculationLines({
  amounts,
  setting,
}: {
  amounts: CalculationAmounts;
  setting?: PayrollSetting;
}): readonly PayrollCalculationLine[] {
  return [
    {
      id: "total-work-time",
      label: "총 근무 시간",
      value: formatTotalWorkTimeValue(amounts, setting),
    },
    {
      id: "base-pay",
      label: "기본 지급액",
      value: formatWon(amounts.basePay),
    },
    {
      id: "overtime",
      label: "추가근무 수당",
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
  ];
}

function formatTotalWorkTimeValue(
  amounts: CalculationAmounts,
  setting?: PayrollSetting,
) {
  const totalWorkTime = formatHours(amounts.totalWorkMinutes);

  if (setting?.payrollType !== "monthly" && setting?.hourlyRate != null) {
    return `${totalWorkTime} · 시급 ${formatWon(setting.hourlyRate)}`;
  }

  return totalWorkTime;
}

function buildAdjustmentItems(
  bonuses: readonly BonusItem[],
): readonly PayrollAdjustmentItem[] {
  return bonuses
    .filter((bonus) => bonus.payrollStatus !== "held")
    .map((bonus) => ({
      amount: formatSignedWon(bonus.amount),
      actionLabel: "삭제",
      id: bonus.id,
      label: bonus.label,
      taxScope: normalizeAdjustmentTaxScope(bonus.taxScope),
      tone: getAmountTone(bonus.amount),
    }));
}

function normalizeAdjustmentTaxScope(
  taxScope: string,
): PayrollAdjustmentTaxScope {
  return taxScope === "post_tax" ? "post_tax" : "pre_tax";
}

function buildOpenItemCards({
  anomalyFlags,
  bonuses,
  calculationRules,
  correctionRequests,
  currentFinalAmount,
  overtimeWorks,
  records,
  statement,
}: {
  anomalyFlags: readonly AnomalyFlag[];
  bonuses: readonly BonusItem[];
  calculationRules: PayrollCalculationRules;
  correctionRequests: readonly CorrectionRequest[];
  currentFinalAmount: number | null;
  overtimeWorks: readonly OvertimeWork[];
  records: readonly WorkRecord[];
  statement?: PayStatement;
}): readonly PayrollOpenItemCard[] {
  const recordById = new Map(records.map((record) => [record.id, record]));
  const heldCorrectionRecordIds = new Set(
    correctionRequests
      .filter((request) => request.payrollStatus === "held")
      .map((request) => request.workRecordId)
      .filter((id): id is string => Boolean(id)),
  );
  const heldRecordCards = records
    .filter(
      (record) =>
        record.payrollApplication === "hold" &&
        !heldCorrectionRecordIds.has(record.id),
    )
    .map((record) => ({
      actions: createPayrollResolutionActions("workRecord", record.id),
      dateLabel: formatDateKeyDisplay(record.dateKey),
      id: `${record.id}-payroll-hold`,
      lines: [
        {
          id: "payroll",
          label: "급여 처리",
          tone: "negative",
          value: "보류",
        },
          {
            id: "duration",
            label: "산정 제외 시간",
            value: formatHours(getRoundedRecordMinutes(record, calculationRules)),
          },
      ],
      locationName: record.locationName,
      state: "open",
      statusLabel: "근무기록",
      statusTone: "orange",
      timeLabel: formatRecordTime(record),
      title: record.dutyName,
    }) satisfies PayrollOpenItemCard);
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
            label: "연결 기록",
            value: formatWorkRecordReference(record),
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
      const actions =
        work.status === "submitted"
          ? [createRecordsOpenItemAction(work.workRecordId)]
          : createPayrollResolutionActions("overtime", work.id);

      return {
        actions,
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
      const actions =
        request.status === "submitted"
          ? [createRecordsOpenItemAction(request.workRecordId)]
          : createPayrollResolutionActions("correction", request.id);

      return {
        actions,
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
            ...createPayrollResolutionActions("bonus", bonus.id),
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
  const needsReconfirmationCard =
    readBoolean(statement?.managerOnly.needsReconfirmation, false) ||
    hasStatementCalculationMismatch(statement, currentFinalAmount);
  const reconfirmationCards = needsReconfirmationCard
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
              value: formatWon(currentFinalAmount ?? statement?.currentFinalAmount),
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
    ...heldRecordCards,
    ...anomalyCards,
    ...overtimeCards,
    ...correctionCards,
    ...bonusCards,
    ...reconfirmationCards,
  ];
}

function collectOpenWorkRecordIds({
  anomalyFlags,
  correctionRequests,
  overtimeWorks,
  records,
}: {
  anomalyFlags: readonly AnomalyFlag[];
  correctionRequests: readonly CorrectionRequest[];
  overtimeWorks: readonly OvertimeWork[];
  records: readonly WorkRecord[];
}) {
  const openWorkRecordIds = new Set<string>();
  const heldCorrectionRecordIds = new Set(
    correctionRequests
      .filter((request) => request.payrollStatus === "held")
      .map((request) => request.workRecordId)
      .filter((id): id is string => Boolean(id)),
  );

  records
    .filter(
      (record) =>
        record.payrollApplication === "hold" &&
        !heldCorrectionRecordIds.has(record.id),
    )
    .forEach((record) => openWorkRecordIds.add(record.id));

  anomalyFlags
    .filter((item) => item.status === "unresolved")
    .forEach((flag) => {
      if (flag.workRecordId) {
        openWorkRecordIds.add(flag.workRecordId);
      }
    });

  overtimeWorks
    .filter(
      (item) => item.status === "submitted" || item.payrollStatus === "held",
    )
    .forEach((work) => {
      if (work.workRecordId) {
        openWorkRecordIds.add(work.workRecordId);
      }
    });

  correctionRequests
    .filter(
      (item) => item.status === "submitted" || item.payrollStatus === "held",
    )
    .forEach((request) => {
      if (request.workRecordId) {
        openWorkRecordIds.add(request.workRecordId);
      }
    });

  return openWorkRecordIds;
}

function formatWorkRecordReference(record: WorkRecord | undefined) {
  if (!record) {
    return "연결 근무기록 없음";
  }

  const timeLabel = formatRecordTime(record);

  return timeLabel === "-" ? record.dutyName : `${record.dutyName} · ${timeLabel}`;
}

function createRecordsOpenItemAction(
  workRecordId: string | null,
): PayrollOpenItemAction {
  if (!workRecordId) {
    return {
      id: "record",
      label: "처리하기",
      unavailableLabel: "대상 기록 없음",
    };
  }

  return {
    id: "record",
    label: "처리하기",
    workRecordId,
  };
}

function createPayrollResolutionActions(
  itemType: NonNullable<PayrollOpenItemAction["resolution"]>["itemType"],
  itemId: string,
): readonly PayrollOpenItemAction[] {
  return [
    {
      id: `${itemType}-apply`,
      label: "급여 반영",
      resolution: {
        decision: "apply",
        itemId,
        itemType,
      },
    },
    {
      id: `${itemType}-exclude`,
      label: "급여 제외",
      resolution: {
        decision: "exclude",
        itemId,
        itemType,
      },
    },
  ];
}

function createPayrollStatementHref(statement: PayStatement) {
  const params = new URLSearchParams({
    focus: statement.id,
    month: statement.monthKey,
    workerId: statement.workerId,
  });

  return `/payroll/statements?${params.toString()}`;
}

function isBlockingOpenItemCard(card: PayrollOpenItemCard) {
  return card.statusLabel !== "재확정 필요";
}

function buildResolvedWorkRecordCards(
  records: readonly WorkRecord[],
  calculationRules: PayrollCalculationRules,
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
          value: formatHours(getPayrollRecordMinutes(record, calculationRules)),
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
  calculationRules,
  openItemCount,
  projection,
}: {
  calculationRules: PayrollCalculationRules;
  openItemCount: number;
  projection: PayrollWorkerMonthProjection;
}) {
  if (projection.rowStatus === "paid") {
    return {
      actionDisabled: true,
      actionLabel: "지급 완료됨",
      defaultScheduledPaymentDate: null,
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
      defaultScheduledPaymentDate: getDefaultScheduledPaymentDate(
        projection.monthKey,
        calculationRules.regularPaymentDay,
      ),
      description: "미처리 항목을 처리해야 급여 결정을 진행할 수 있습니다.",
      title: `${baseAction}하기`,
    };
  }

  return {
    actionDisabled: false,
    actionLabel: baseAction,
    defaultScheduledPaymentDate: getDefaultScheduledPaymentDate(
      projection.monthKey,
      calculationRules.regularPaymentDay,
    ),
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

function roundUpToUnit(value: number, unit: number) {
  if (!Number.isFinite(value) || unit <= 1) {
    return Math.max(Math.round(value), 0);
  }

  return Math.ceil(value / unit) * unit;
}

function getRecordMinutes(record: WorkRecord) {
  const start = record.effectiveStartAt ?? record.plannedStartAt;
  const end = record.effectiveEndAt ?? record.plannedEndAt;

  if (!start || !end) {
    return 0;
  }

  return Math.max(Math.round((end.getTime() - start.getTime()) / 60000), 0);
}

function getRoundedRecordMinutes(
  record: WorkRecord,
  calculationRules: PayrollCalculationRules,
) {
  return roundUpToUnit(
    getRecordMinutes(record),
    calculationRules.workTimeRoundingUnitMinutes,
  );
}

function getPayrollRecordMinutes(
  record: WorkRecord,
  calculationRules: PayrollCalculationRules,
) {
  return isRecordExcludedFromPayroll(record)
    ? 0
    : getRoundedRecordMinutes(record, calculationRules);
}

function isRecordExcludedFromPayroll(record: WorkRecord) {
  return (
    record.status === "deleted" ||
    record.payrollApplication === "hold" ||
    record.payrollApplication === "excluded"
  );
}

function sumConfirmedOvertimePay(
  overtimeWorks: readonly OvertimeWork[],
  setting?: PayrollSetting,
) {
  return overtimeWorks
    .filter(
      (work) =>
        work.status === "approved" &&
        work.payrollStatus === "confirmed" &&
        work.payrollEffect !== "none",
    )
    .reduce((total, work) => total + getOvertimePayAmount(work, setting), 0);
}

function getOvertimePayAmount(
  work: OvertimeWork,
  setting?: PayrollSetting,
) {
  if (work.payrollPayMode === "fixed" || (!work.payrollPayMode && work.amount != null)) {
    return work.amount ?? 0;
  }

  if (setting?.hourlyRate == null) {
    return 0;
  }

  return Math.round((getOvertimeMinutes(work) / 60) * setting.hourlyRate);
}

function getOvertimeMinutes(work: OvertimeWork) {
  const start = work.extraStartAt;
  const end = work.extraEndAt;

  if (!start || !end || end <= start) {
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
  if (value === "deleted") {
    return "삭제";
  }

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
  const calculationRules = mapWorkspaceCalculationRules(collections.workspace);
  const requiredSettings = mapWorkspaceRequiredSettings(collections.workspace);
  const settings = collections.payrollSettings.map(mapPayrollSetting);
  const monthKey = selectStatementMonthKey(statements, projections, target);
  const projectionByWorkerMonth = indexBy(projections, (row) =>
    getWorkerMonthKey(row.workerId, row.monthKey),
  );
  const resolveSetting = createPayrollSettingResolver(settings);
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
        calculationRules,
        projection:
          projectionByWorkerMonth[
            getWorkerMonthKey(statement.workerId, statement.monthKey)
          ],
        setting: resolveSetting(statement.workerId, statement.monthKey),
        statement,
      }),
    ]),
  );
  const selectedRowId = resolveStatementSelectedRowId(rows, target);

  return {
    ...payrollStatementFixture,
    detailsByRowId,
    listCountText: `${rows.length}명`,
    requiredSettings,
    rows,
    selectedDetail:
      detailsByRowId[selectedRowId] ??
      detailsByRowId[rows[0]?.id ?? ""] ??
      payrollStatementFixture.selectedDetail,
    selectedMonthLabel: formatMonthDot(monthKey),
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
  calculationRules,
  projection,
  setting,
  statement,
}: {
  calculationRules: PayrollCalculationRules;
  projection?: PayrollWorkerMonthProjection;
  setting?: PayrollSetting;
  statement: PayStatement;
}): PayrollStatementDetail {
  const statementSetting = statement.payrollSetting ?? setting;
  const bodySections = buildStatementBodySections(
    statement,
    statementSetting,
    statement.calculationRules ?? calculationRules,
  );

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
      setting: statementSetting,
      totalWorkMinutes: statement.totalWorkMinutes ?? undefined,
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
  calculationRules: PayrollCalculationRules = getDefaultCalculationRules(),
): readonly PayrollStatementBodySection[] {
  const finalAmount = statement.finalAmount;
  const taxAmount = statement.taxAmount;
  const overtimePay = statement.overtimePay;
  const basePay =
    statement.basePay ??
    estimateBasePay(
      finalAmount,
      overtimePay,
      statement.preTaxAdjustment + statement.postTaxAdjustment,
      taxAmount,
      setting,
    );
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
        {
          id: "setting-effective-from",
          label: "급여 설정 적용일",
          value: setting?.effectiveFrom ? formatDateKeyDot(setting.effectiveFrom) : "-",
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
          id: "pre-tax-adjustment",
          label: "세전 보너스/차감",
          tone: getAmountTone(statement.preTaxAdjustment),
          value: formatSignedWon(statement.preTaxAdjustment),
        },
        {
          id: "tax",
          label: "세금",
          tone: taxAmount > 0 ? "negative" : "muted",
          value: formatWon(taxAmount),
        },
        {
          id: "post-tax-adjustment",
          label: "세후 보너스/차감",
          tone: getAmountTone(statement.postTaxAdjustment),
          value: formatSignedWon(statement.postTaxAdjustment),
        },
        {
          id: "bonus-count",
          label: "보너스/차감 건수",
          value:
            statement.bonusItemCount > 0
              ? `${statement.bonusItemCount.toLocaleString("ko-KR")}건`
              : "-",
        },
      ],
    },
    {
      id: "calculation-metadata",
      title: "계산 기준",
      lines: [
        {
          id: "payroll-setting",
          label: "급여 설정",
          value: formatPayrollSettingSummary(setting),
        },
        {
          id: "total-work-minutes",
          label: "근무시간 합산",
          value:
            statement.totalWorkMinutes == null
              ? "-"
              : formatHours(statement.totalWorkMinutes),
        },
        {
          id: "work-rounding",
          label: "근무시간 올림",
          value: `${calculationRules.workTimeRoundingUnitMinutes}분 단위`,
        },
        {
          id: "pay-rounding",
          label: "급여 올림",
          value: formatPayRounding(calculationRules.payrollRoundingUnitWon),
        },
        {
          id: "regular-payment-day",
          label: "정기 지급일",
          value: formatRegularPaymentDay(calculationRules.regularPaymentDay),
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

function mapWorkspaceCalculationRules(
  document: PayrollDocument,
): PayrollCalculationRules {
  const data = document.data;
  const settings = readRecord(data.settings);

  return {
    payrollRoundingUnitWon: readPayrollRoundingUnit(
      readWorkspaceSettingValue(settings, data, "payrollRoundingUnitWon"),
    ),
    regularPaymentDay: readNullableBoundedInteger(
      readWorkspaceSettingValue(settings, data, "regularPaymentDay"),
      1,
      31,
    ),
    workTimeRoundingUnitMinutes: readBoundedInteger(
      readWorkspaceSettingValue(settings, data, "workTimeRoundingUnitMinutes"),
      6,
      1,
      60,
    ),
  };
}

function mapWorkspaceRequiredSettings(
  document: PayrollDocument,
): PayrollRequiredSettingsState {
  const data = document.data;
  const settings = readRecord(data.settings);
  const rawWorkTimeRounding =
    readWorkspaceSettingValue(settings, data, "workTimeRoundingUnitMinutes");
  const rawPayrollRounding =
    readWorkspaceSettingValue(settings, data, "payrollRoundingUnitWon");
  const rawRegularPaymentDay =
    readWorkspaceSettingValue(settings, data, "regularPaymentDay");
  const missingFieldIds = [
    isValidBoundedInteger(rawWorkTimeRounding, 1, 60)
      ? null
      : "workTimeRoundingUnitMinutes",
    isValidPayrollRoundingUnit(rawPayrollRounding)
      ? null
      : "payrollRoundingUnitWon",
    isValidBoundedInteger(rawRegularPaymentDay, 1, 31)
      ? null
      : "regularPaymentDay",
  ].filter((id): id is PayrollRequiredSettingsFieldId => id !== null);

  return {
    ...payrollRequiredSettingsFixture,
    fields: payrollRequiredSettingsFixture.fields.map((field) => {
      if (field.id === "workTimeRoundingUnitMinutes") {
        return {
          ...field,
          value: String(
            isValidBoundedInteger(rawWorkTimeRounding, 1, 60)
              ? rawWorkTimeRounding
              : 6,
          ),
        };
      }

      if (field.id === "payrollRoundingUnitWon") {
        return {
          ...field,
          value: String(
            isValidPayrollRoundingUnit(rawPayrollRounding)
              ? rawPayrollRounding
              : 1,
          ),
        };
      }

      return {
        ...field,
        value: String(
          isValidBoundedInteger(rawRegularPaymentDay, 1, 31)
            ? rawRegularPaymentDay
            : 5,
        ),
      };
    }),
    missingFieldIds,
  };
}

function readWorkspaceSettingValue(
  settings: Record<string, unknown>,
  workspaceData: Record<string, unknown>,
  key: string,
) {
  return Object.prototype.hasOwnProperty.call(settings, key)
    ? settings[key]
    : workspaceData[key];
}

function getDefaultCalculationRules(): PayrollCalculationRules {
  return {
    payrollRoundingUnitWon: 1,
    regularPaymentDay: null,
    workTimeRoundingUnitMinutes: 6,
  };
}

function readCalculationRulesSnapshot(
  value: unknown,
): PayrollCalculationRules | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const data = value as Record<string, unknown>;

  return {
    payrollRoundingUnitWon: readPayrollRoundingUnit(
      data.payrollRoundingUnitWon,
    ),
    regularPaymentDay: readNullableBoundedInteger(
      data.regularPaymentDay,
      1,
      31,
    ),
    workTimeRoundingUnitMinutes: readBoundedInteger(
      data.workTimeRoundingUnitMinutes,
      6,
      1,
      60,
    ),
  };
}

function readPayrollSettingSnapshot(value: unknown): PayrollSetting | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const data = value as Record<string, unknown>;
  const payrollType = readString(data.payrollType, "");

  if (!payrollType) {
    return null;
  }

  return {
    effectiveFrom: readNullableString(data.effectiveFrom),
    hourlyRate: readNullableNumber(data.hourlyRate),
    monthlySalary: readNullableNumber(data.monthlySalary),
    payrollType,
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
  const calculationRules = readCalculationRulesSnapshot(snapshot.calculationRules);
  const payrollSetting = readPayrollSettingSnapshot(snapshot.payrollSetting);
  const currentCalculationSummary = readRecord(data.currentCalculationSummary);

  if (!status) {
    return null;
  }

  return {
    basePay: readNullableNumber(snapshot.basePay),
    bonusItemCount:
      readStringArray(snapshot.bonusItemIds).length ||
      readNumber(snapshot.bonusItemCount, 0),
    calculationRules,
    confirmedAt: readTimestamp(data.confirmedAt),
    currentFinalAmount: readNullableNumber(currentCalculationSummary.finalAmount),
    finalAmount: readNullableNumber(snapshot.finalAmount),
    id: document.id,
    managerOnly: readRecord(data.managerOnly),
    monthKey: readMonthKey(data.monthKey),
    overtimePay: readNumber(snapshot.overtimePay, 0),
    paidAt: readTimestamp(data.paidAt),
    payrollSetting,
    payrollType: readString(snapshot.payrollType, ""),
    postTaxAdjustment: readNumber(snapshot.postTaxAdjustment, 0),
    preTaxAdjustment: readNumber(snapshot.preTaxAdjustment, 0),
    scheduledPaymentDate: readNullableString(data.scheduledPaymentDate),
    status,
    taxAmount: readNumber(snapshot.taxAmount, 0),
    totalWorkMinutes: readNullableNumber(snapshot.totalWorkMinutes),
    workerId: readString(data.workerId, ""),
    workerName: readString(data.workerName, "이름 없는 조교"),
  };
}

function mapWorkRecord(document: PayrollDocument): WorkRecord {
  const data = document.data;
  const managerOnly = readRecord(data.managerOnly);

  return {
    anomalyType: readString(data.anomalyType, "none"),
    dateKey: readString(data.dateKey ?? data.date, ""),
    dutyName: readString(data.dutyName, "근무 기록"),
    effectiveEndAt: readTimestamp(data.effectiveEndAt),
    effectiveStartAt: readTimestamp(data.effectiveStartAt),
    id: document.id,
    locationName: readString(data.locationName, "근무지 확인 필요"),
    payrollApplication: readString(managerOnly.payrollApplication, "immediate"),
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
    amount: readNullableNumber(data.amount) ?? readNullableNumber(data.fixedAmount),
    createdAt: readTimestamp(data.createdAt ?? data.submittedAt),
    extraEndAt: readTimestamp(data.extraEndAt),
    extraStartAt: readTimestamp(data.extraStartAt),
    id: document.id,
    monthKey: readMonthKey(data.monthKey),
    payrollEffect: readString(data.payrollEffect, ""),
    payrollPayMode: readString(data.payrollPayMode, ""),
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

function createPayrollSettingResolver(settings: readonly PayrollSetting[]) {
  const settingsByWorkerId = groupBy(settings, (setting) => setting.workerId);

  return (workerId: string, monthKey: string) =>
    findPayrollSettingForMonth(settingsByWorkerId[workerId] ?? [], monthKey);
}

function findPayrollSettingForMonth(
  settings: readonly PayrollSetting[],
  monthKey: string,
) {
  const monthEndKey = getMonthEndDateKey(monthKey);

  return settings
    .filter(
      (setting) =>
        !setting.effectiveFrom || setting.effectiveFrom <= monthEndKey,
    )
    .sort(comparePayrollSettings)[0];
}

function comparePayrollSettings(left: PayrollSetting, right: PayrollSetting) {
  return (right.effectiveFrom ?? "").localeCompare(left.effectiveFrom ?? "");
}

function getMonthEndDateKey(monthKey: string) {
  const [year, month] = splitMonthKey(monthKey);
  const lastDay = new Date(Number(year), Number(month), 0).getDate();

  return `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
}

function getDefaultScheduledPaymentDate(
  monthKey: string,
  regularPaymentDay: number | null,
) {
  if (regularPaymentDay == null) {
    return null;
  }

  const [year, month] = splitMonthKey(monthKey);
  const paymentDate = createPaymentDate(
    Number(year),
    Number(month),
    regularPaymentDay,
  );
  const today = startOfLocalDay(new Date());

  while (paymentDate < today) {
    const nextMonthDate = createPaymentDate(
      paymentDate.getFullYear(),
      paymentDate.getMonth() + 1,
      regularPaymentDay,
    );

    paymentDate.setTime(nextMonthDate.getTime());
  }

  return formatDateKey(paymentDate);
}

function createPaymentDate(year: number, monthIndex: number, day: number) {
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();

  return new Date(year, monthIndex, Math.min(day, lastDayOfMonth));
}

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
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
  records,
}: {
  anomalyFlags: readonly AnomalyFlag[];
  bonuses: readonly BonusItem[];
  correctionRequests: readonly CorrectionRequest[];
  overtimeWorks: readonly OvertimeWork[];
  projection: PayrollWorkerMonthProjection;
  records: readonly WorkRecord[];
}) {
  return (
    (projection.hasBlockers ? 1 : 0) +
    records.filter(
      (record) =>
        record.payrollApplication === "hold" &&
        !correctionRequests.some(
          (request) =>
            request.workRecordId === record.id &&
            request.payrollStatus === "held",
        ),
    ).length +
    anomalyFlags.filter((item) => item.status === "unresolved").length +
    overtimeWorks.filter(
      (item) => item.status === "submitted" || item.payrollStatus === "held",
    ).length +
    correctionRequests.filter(
      (item) => item.status === "submitted" || item.payrollStatus === "held",
    ).length +
    bonuses.filter((item) => item.payrollStatus === "held").length
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

function formatPayrollSettingSummary(setting?: PayrollSetting) {
  if (!setting) {
    return "급여 설정 확인 필요";
  }

  const payLabel =
    setting.payrollType === "monthly"
      ? `월급 ${formatWon(setting.monthlySalary)}`
      : `시급 ${formatWon(setting.hourlyRate)}`;
  const taxLabel =
    setting.taxRatePercent == null ? "세율 미설정" : `세율 ${setting.taxRatePercent}%`;

  return `${getPayrollTypeLabel(setting.payrollType)} · ${payLabel} · ${taxLabel}`;
}

function formatCalculationRules(rules: PayrollCalculationRules) {
  return `근무시간 ${rules.workTimeRoundingUnitMinutes}분 단위 · 급여 ${formatPayRounding(
    rules.payrollRoundingUnitWon,
  )}`;
}

function formatPayRounding(unit: number) {
  if (unit === 100) {
    return "백의 자리 올림";
  }

  if (unit === 10) {
    return "십의 자리 올림";
  }

  return "원 단위";
}

function formatRegularPaymentDay(day: number | null) {
  return day == null ? "미설정" : `매월 ${day}일`;
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

function formatDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(value.getDate()).padStart(2, "0")}`;
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

function readBoundedInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    return fallback;
  }

  return value;
}

function readNullableBoundedInteger(
  value: unknown,
  min: number,
  max: number,
) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    return null;
  }

  return value;
}

function readPayrollRoundingUnit(value: unknown) {
  return value === 10 || value === 100 ? value : 1;
}

function isValidBoundedInteger(value: unknown, min: number, max: number) {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

function isValidPayrollRoundingUnit(value: unknown) {
  return value === 1 || value === 10 || value === 100;
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
