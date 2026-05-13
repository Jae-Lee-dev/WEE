import {
  collection,
  getDocs,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { resolveActiveWorkspaceId } from "@/entities/workspace";
import { readActiveWorkspaceId } from "@/entities/workspace";
import { getFirebaseDb, isMockFirebaseProject } from "@/shared/api/firebase/client";
import {
  dashboardAiMonitoringFixture,
  dashboardLocationOptions,
  dashboardLocationPeriodOptions,
  dashboardLocationSummaries,
  dashboardLocationWorkerRows,
  dashboardWorkerSummaries,
  dashboardWorkerTagOptions,
  type DashboardAiPatternRow,
  type DashboardLocationId,
  type DashboardLocationPeriodId,
  type DashboardLocationSummary,
  type DashboardLocationWorkerRow,
  type DashboardOperationalMetric,
  type DashboardSelectOption,
  type DashboardWorkerSummary,
  type DashboardWorkerTagId,
} from "../model/dashboard-fixtures";

type FirestoreDocument = {
  data: Record<string, unknown>;
  id: string;
};

export type DashboardLocationsViewModel = {
  defaultLocationId: DashboardLocationId;
  defaultPeriodId: DashboardLocationPeriodId;
  locationOptions: readonly DashboardSelectOption<DashboardLocationId>[];
  periodOptions: readonly DashboardSelectOption<DashboardLocationPeriodId>[];
  rowsByLocationPeriod: Record<
    DashboardLocationId,
    Record<DashboardLocationPeriodId, readonly DashboardLocationWorkerRow[]>
  >;
  summaries: Record<
    DashboardLocationId,
    Record<DashboardLocationPeriodId, DashboardLocationSummary>
  >;
};

export type DashboardWorkersViewModel = {
  summaries: readonly DashboardWorkerSummary[];
  tagOptions: readonly DashboardSelectOption<DashboardWorkerTagId>[];
};

export type DashboardAiMonitoringViewModel = {
  lastRunAt: string;
  metrics: readonly DashboardOperationalMetric[];
  patternRows: readonly DashboardAiPatternRow[];
};

export type DashboardSummaryDataSourceMode = "fixture" | "firestore";

export type DashboardLocationsDataSource = {
  initialData: DashboardLocationsViewModel;
  load: () => Promise<DashboardLocationsViewModel>;
  mode: DashboardSummaryDataSourceMode;
};

export type DashboardWorkersDataSource = {
  initialData: DashboardWorkersViewModel;
  load: () => Promise<DashboardWorkersViewModel>;
  mode: DashboardSummaryDataSourceMode;
};

export type DashboardAiMonitoringDataSource = {
  initialData: DashboardAiMonitoringViewModel;
  load: () => Promise<DashboardAiMonitoringViewModel>;
  mode: DashboardSummaryDataSourceMode;
};

type LocationModel = {
  id: string;
  name: string;
  status: string;
};

type WorkerModel = {
  id: string;
  name: string;
  status: string;
  tagIds: readonly string[];
};

type TagModel = {
  id: string;
  label: string;
};

type WorkRecordModel = {
  anomalyType: string;
  dateKey: string;
  effectiveEndAt: Date | null;
  effectiveStartAt: Date | null;
  id: string;
  locationId: string;
  locationName: string;
  monthKey: string;
  plannedEndAt: Date | null;
  plannedStartAt: Date | null;
  status: string;
  workerId: string;
  workerName: string;
};

type AnomalyFlagModel = {
  anomalyType: string;
  id: string;
  locationId: string;
  status: string;
  severity: string;
  workRecordId: string;
  workerId: string;
  workerName: string;
};

type PayrollRowModel = {
  finalAmount: number | null;
  monthKey: string;
  rowStatus: string;
  workerId: string;
  workerName: string;
};

type PayStatementModel = {
  finalAmount: number;
  monthKey: string;
  status: string;
  workerId: string;
};

type AiRunModel = {
  candidates: readonly AiCandidateModel[];
  completedAt: Date | null;
  id: string;
  status: string;
};

type AiCandidateModel = {
  evidenceWorkRecordIds: readonly string[];
  id: string;
  severity: string;
  summary: string;
  targetWorkerId: string;
};

type DashboardCollections = {
  aiRuns: readonly FirestoreDocument[];
  anomalyFlags: readonly FirestoreDocument[];
  locations: readonly FirestoreDocument[];
  payStatements: readonly FirestoreDocument[];
  payrollWorkerMonthRows: readonly FirestoreDocument[];
  workers: readonly FirestoreDocument[];
  workerTags: readonly FirestoreDocument[];
  workRecords: readonly FirestoreDocument[];
};

const emptyLocationSummary: DashboardLocationSummary = {
  activeWorkers: 0,
  lateRate: 0,
  totalHours: 0,
  unresolvedFlags: 0,
};

export function createDashboardLocationsDataSource(): DashboardLocationsDataSource {
  const initialData = getFixtureLocationsViewModel();

  if (shouldUseFixtureDataSource()) {
    return {
      initialData,
      mode: "fixture",
      async load() {
        return initialData;
      },
    };
  }

  return {
    initialData: getEmptyLocationsViewModel(),
    mode: "firestore",
    async load() {
      return mapLocationsViewModel(await readDashboardCollections());
    },
  };
}

export function createDashboardWorkersDataSource(): DashboardWorkersDataSource {
  const initialData = getFixtureWorkersViewModel();

  if (shouldUseFixtureDataSource()) {
    return {
      initialData,
      mode: "fixture",
      async load() {
        return initialData;
      },
    };
  }

  return {
    initialData: getEmptyWorkersViewModel(),
    mode: "firestore",
    async load() {
      return mapWorkersViewModel(await readDashboardCollections());
    },
  };
}

export function createDashboardAiMonitoringDataSource(): DashboardAiMonitoringDataSource {
  const initialData = getFixtureAiMonitoringViewModel();

  if (shouldUseFixtureDataSource()) {
    return {
      initialData,
      mode: "fixture",
      async load() {
        return initialData;
      },
    };
  }

  return {
    initialData: getEmptyAiMonitoringViewModel(),
    mode: "firestore",
    async load() {
      return mapAiMonitoringViewModel(await readDashboardCollections());
    },
  };
}

function getFixtureLocationsViewModel(): DashboardLocationsViewModel {
  const rowsByLocationPeriod = Object.fromEntries(
    dashboardLocationOptions.map((location) => [
      location.id,
      Object.fromEntries(
        dashboardLocationPeriodOptions.map((period) => [
          period.id,
          dashboardLocationWorkerRows[location.id] ?? [],
        ]),
      ),
    ]),
  );

  return {
    defaultLocationId: dashboardLocationOptions[0]?.id ?? "",
    defaultPeriodId: dashboardLocationPeriodOptions[0]?.id ?? "",
    locationOptions: dashboardLocationOptions,
    periodOptions: dashboardLocationPeriodOptions,
    rowsByLocationPeriod,
    summaries: dashboardLocationSummaries,
  };
}

function getFixtureWorkersViewModel(): DashboardWorkersViewModel {
  return {
    summaries: dashboardWorkerSummaries,
    tagOptions: dashboardWorkerTagOptions,
  };
}

function getFixtureAiMonitoringViewModel(): DashboardAiMonitoringViewModel {
  return {
    lastRunAt: dashboardAiMonitoringFixture.lastRunAt,
    metrics: dashboardAiMonitoringFixture.metrics,
    patternRows: dashboardAiMonitoringFixture.patternRows,
  };
}

function getEmptyLocationsViewModel(): DashboardLocationsViewModel {
  return {
    defaultLocationId: "" as DashboardLocationId,
    defaultPeriodId: "" as DashboardLocationPeriodId,
    locationOptions: [],
    periodOptions: [],
    rowsByLocationPeriod: {},
    summaries: {},
  };
}

function getEmptyWorkersViewModel(): DashboardWorkersViewModel {
  return {
    summaries: [],
    tagOptions: [],
  };
}

function getEmptyAiMonitoringViewModel(): DashboardAiMonitoringViewModel {
  return {
    lastRunAt: "",
    metrics: [],
    patternRows: [],
  };
}

async function readDashboardCollections(): Promise<DashboardCollections> {
  const workspaceId = await requireActiveWorkspaceId();
  const [
    aiRuns,
    anomalyFlags,
    locations,
    payStatements,
    payrollWorkerMonthRows,
    workers,
    workerTags,
    workRecords,
  ] = await Promise.all([
    readWorkspaceCollection(workspaceId, "aiRuns"),
    readWorkspaceCollection(workspaceId, "anomalyFlags"),
    readWorkspaceCollection(workspaceId, "locations"),
    readWorkspaceCollection(workspaceId, "payStatements"),
    readWorkspaceCollection(workspaceId, "payrollWorkerMonthRows"),
    readWorkspaceCollection(workspaceId, "workers"),
    readWorkspaceCollection(workspaceId, "workerTags"),
    readWorkspaceCollection(workspaceId, "workRecords"),
  ]);

  return {
    aiRuns,
    anomalyFlags,
    locations,
    payStatements,
    payrollWorkerMonthRows,
    workers,
    workerTags,
    workRecords,
  };
}

async function readWorkspaceCollection(
  workspaceId: string,
  collectionName: keyof DashboardCollections,
): Promise<readonly FirestoreDocument[]> {
  const snapshot = await getDocs(
    collection(getFirebaseDb(), "workspaces", workspaceId, collectionName),
  );

  return snapshot.docs.map(mapDocument);
}

function mapLocationsViewModel(
  collections: DashboardCollections,
): DashboardLocationsViewModel {
  const locations = collections.locations
    .map(mapLocation)
    .filter((location) => location.status !== "deleted");
  const workRecords = collections.workRecords.map(mapWorkRecord);
  const flags = collections.anomalyFlags.map(mapAnomalyFlag);
  const workersById = toMap(collections.workers.map(mapWorker), (worker) => worker.id);
  const periodOptions = createLocationPeriodOptions(workRecords);
  const locationOptions = locations.map((location) => ({
    id: location.id,
    label: location.name,
  }));
  const summaries: DashboardLocationsViewModel["summaries"] = {};
  const rowsByLocationPeriod: DashboardLocationsViewModel["rowsByLocationPeriod"] = {};

  for (const location of locations) {
    summaries[location.id] = {};
    rowsByLocationPeriod[location.id] = {};

    for (const period of periodOptions) {
      const locationRecords = workRecords.filter(
        (record) =>
          record.locationId === location.id && record.monthKey === period.id,
      );
      const locationFlags = flags.filter((flag) =>
        locationRecords.some((record) => record.id === flag.workRecordId),
      );

      summaries[location.id][period.id] = createLocationSummary(
        locationRecords,
        locationFlags,
      );
      rowsByLocationPeriod[location.id][period.id] = createLocationWorkerRows(
        locationRecords,
        locationFlags,
        workersById,
      );
    }
  }

  return {
    defaultLocationId: locationOptions[0]?.id ?? "",
    defaultPeriodId: periodOptions[0]?.id ?? "",
    locationOptions,
    periodOptions,
    rowsByLocationPeriod,
    summaries,
  };
}

function mapWorkersViewModel(
  collections: DashboardCollections,
): DashboardWorkersViewModel {
  const workers = collections.workers
    .map(mapWorker)
    .filter((worker) => worker.status === "active");
  const tags = collections.workerTags.map(mapTag);
  const tagById = toMap(tags, (tag) => tag.id);
  const records = collections.workRecords.map(mapWorkRecord);
  const flags = collections.anomalyFlags.map(mapAnomalyFlag);
  const payrollRows = collections.payrollWorkerMonthRows.map(mapPayrollRow);
  const statements = collections.payStatements.map(mapPayStatement);
  const latestMonthKey = getLatestMonthKey(records.map((record) => record.monthKey));
  const summaries = workers.map((worker) =>
    createWorkerSummary({
      flags,
      latestMonthKey,
      payrollRows,
      records,
      statements,
      tagById,
      worker,
    }),
  );

  return {
    summaries,
    tagOptions: [
      { id: "all", label: "태그: 전체" },
      ...tags.map((tag) => ({ id: tag.id, label: tag.label })),
    ],
  };
}

function mapAiMonitoringViewModel(
  collections: DashboardCollections,
): DashboardAiMonitoringViewModel {
  const flags = collections.anomalyFlags.map(mapAnomalyFlag);
  const recordsById = toMap(collections.workRecords.map(mapWorkRecord), (record) => record.id);
  const workersById = toMap(collections.workers.map(mapWorker), (worker) => worker.id);
  const aiRuns = collections.aiRuns.map(mapAiRun).sort(compareAiRuns);
  const latestRun = aiRuns[0] ?? null;
  const unresolvedFlags = flags.filter((flag) => flag.status !== "resolved");
  const riskLocationCount = new Set(
    unresolvedFlags
      .map((flag) => recordsById[flag.workRecordId]?.locationId || flag.locationId)
      .filter(Boolean),
  ).size;
  const patternRows =
    latestRun?.candidates.map((candidate) =>
      mapAiPatternRow(candidate, workersById, recordsById),
    ) ?? [];

  return {
    lastRunAt: formatDateTime(latestRun?.completedAt),
    metrics: [
      {
        id: "status",
        label: "AI 분석 상태",
        value: latestRun?.status === "completed" ? "활성" : "대기",
        subLabel: "Standard 플랜",
        tone: latestRun?.status === "completed" ? "green" : "grey",
      },
      {
        id: "patterns",
        label: "탐지 패턴",
        value: String(patternRows.length),
        unit: "건",
        subLabel: "최근 실행 기준",
        tone: patternRows.length > 0 ? "orange" : "green",
      },
      {
        id: "open-flags",
        label: "미처리 이상 플래그",
        value: String(unresolvedFlags.length),
        unit: "건",
        subLabel: "전체 기간 기준",
        tone: unresolvedFlags.length > 0 ? "orange" : "green",
      },
      {
        id: "risk-locations",
        label: "주의 근무지",
        value: String(riskLocationCount),
        unit: "곳",
        subLabel: "미처리 플래그 기준",
        tone: riskLocationCount > 0 ? "blue" : "green",
      },
    ],
    patternRows,
  };
}

function createLocationSummary(
  records: readonly WorkRecordModel[],
  flags: readonly AnomalyFlagModel[],
): DashboardLocationSummary {
  if (records.length === 0) {
    return emptyLocationSummary;
  }

  const lateCount = records.filter((record) => isLateRecord(record)).length;

  return {
    activeWorkers: new Set(records.map((record) => record.workerId)).size,
    lateRate: (lateCount / records.length) * 100,
    totalHours: Math.round(sum(records.map(getRecordHours))),
    unresolvedFlags: flags.filter((flag) => flag.status !== "resolved").length,
  };
}

function createLocationWorkerRows(
  records: readonly WorkRecordModel[],
  flags: readonly AnomalyFlagModel[],
  workersById: Record<string, WorkerModel>,
): readonly DashboardLocationWorkerRow[] {
  const workerIds = unique(records.map((record) => record.workerId));

  return workerIds
    .map((workerId) => {
      const workerRecords = records.filter((record) => record.workerId === workerId);
      const workerFlags = flags.filter((flag) => flag.workerId === workerId);
      const anomalyCount = workerRecords.filter(isAnomalyRecord).length;
      const workerName = workersById[workerId]?.name ?? workerRecords[0]?.workerName ?? "조교";

      return {
        absenceCount: workerRecords.filter((record) => record.anomalyType === "absence_candidate").length,
        action: {
          actionType: "open-worker-summary" as const,
          targetId: workerId,
          recordType: "worker-attendance-summary" as const,
        },
        anomalyRate:
          workerRecords.length > 0 ? (anomalyCount / workerRecords.length) * 100 : 0,
        id: `${workerId}-attendance`,
        lateCount: workerRecords.filter(isLateRecord).length,
        locationAnomalyCount: workerFlags.filter(
          (flag) => flag.anomalyType === "location_mismatch",
        ).length,
        workHours: Math.round(sum(workerRecords.map(getRecordHours))),
        workerId,
        workerName,
      };
    })
    .sort((left, right) => right.workHours - left.workHours);
}

function createWorkerSummary({
  flags,
  latestMonthKey,
  payrollRows,
  records,
  statements,
  tagById,
  worker,
}: {
  flags: readonly AnomalyFlagModel[];
  latestMonthKey: string;
  payrollRows: readonly PayrollRowModel[];
  records: readonly WorkRecordModel[];
  statements: readonly PayStatementModel[];
  tagById: Record<string, TagModel>;
  worker: WorkerModel;
}): DashboardWorkerSummary {
  const workerRecords = records.filter(
    (record) => record.workerId === worker.id && record.monthKey === latestMonthKey,
  );
  const workerFlags = flags.filter((flag) => flag.workerId === worker.id);
  const baseHours = Math.round(sum(workerRecords.map(getRecordHours)));
  const latestPayroll = payrollRows
    .filter((row) => row.workerId === worker.id)
    .sort(comparePayrollRows)[0];
  const paidStatement = statements
    .filter((statement) => statement.workerId === worker.id)
    .sort(compareStatements)[0];
  const basePay =
    latestPayroll?.finalAmount ?? paidStatement?.finalAmount ?? estimatePay(baseHours);
  const tagLabels = worker.tagIds.map((tagId) => tagById[tagId]?.label).filter(Boolean);

  return {
    action: {
      actionType: "open-worker-summary",
      targetId: worker.id,
      recordType: "worker-attendance-summary",
    },
    baseFlags: workerFlags.filter((flag) => flag.status !== "resolved").length,
    baseHours,
    basePay,
    flagDistribution: createFlagDistribution(workerFlags),
    id: worker.id,
    initials: worker.name.slice(0, 1),
    lateRate:
      workerRecords.length > 0
        ? (workerRecords.filter(isLateRecord).length / workerRecords.length) * 100
        : 0,
    memoPoints: [
      `${latestMonthKey || "최근"} 기준 ${workerRecords.length}개 근무기록`,
      `미처리 이상 플래그 ${workerFlags.filter((flag) => flag.status !== "resolved").length}건`,
      tagLabels.length > 0 ? `태그 ${tagLabels.join(", ")}` : "태그 미지정",
    ],
    memoSummary:
      workerRecords.length > 0
        ? "실제 근무기록과 급여 projection 기준으로 집계되었습니다."
        : "선택 기간에 집계 가능한 근무기록이 없습니다.",
    memoUpdatedAt: "실시간 Firestore",
    name: worker.name,
    payrollHistory: createPayrollHistory(worker.id, payrollRows, statements),
    tags: worker.tagIds,
  };
}

function createFlagDistribution(
  flags: readonly AnomalyFlagModel[],
): DashboardWorkerSummary["flagDistribution"] {
  const items = [
    ["location_mismatch", "위치이상", "red"],
    ["time_mismatch", "시간이상", "orange"],
    ["missing_checkout", "퇴근미처리", "red"],
    ["absence_candidate", "결근후보", "red"],
  ] as const;

  return items.map(([id, label, tone]) => {
    const count = flags.filter((flag) => flag.anomalyType === id).length;

    return {
      count,
      tone: count > 0 ? tone : "grey",
      type: label,
    };
  });
}

function createPayrollHistory(
  workerId: string,
  payrollRows: readonly PayrollRowModel[],
  statements: readonly PayStatementModel[],
): DashboardWorkerSummary["payrollHistory"] {
  const statementByMonth = toMap(
    statements.filter((statement) => statement.workerId === workerId),
    (statement) => statement.monthKey,
  );

  return payrollRows
    .filter((row) => row.workerId === workerId)
    .sort(comparePayrollRows)
    .slice(0, 3)
    .map((row) => {
      const statement = statementByMonth[row.monthKey];
      const status = getPayrollStatusLabel(statement?.status ?? row.rowStatus);

      return {
        finalPay: row.finalAmount ?? statement?.finalAmount ?? 0,
        month: formatMonthKorean(row.monthKey),
        status,
        tone: status === "지급 완료" ? "green" : status.includes("재확인") ? "orange" : "grey",
      };
    });
}

function mapAiPatternRow(
  candidate: AiCandidateModel,
  workersById: Record<string, WorkerModel>,
  recordsById: Record<string, WorkRecordModel>,
): DashboardAiPatternRow {
  const worker = workersById[candidate.targetWorkerId];
  const evidence = candidate.evidenceWorkRecordIds
    .map((recordId) => recordsById[recordId])
    .filter(Boolean);

  return {
    action: {
      actionType: "open-ai-pattern-record",
      targetId: candidate.evidenceWorkRecordIds[0] ?? candidate.id,
      recordType: "ai-pattern",
    },
    evidence:
      evidence.length > 0
        ? `${evidence.length}개 근무기록 근거`
        : "근거 기록 확인 필요",
    id: candidate.id,
    pattern: candidate.summary,
    severity: candidate.severity === "high" ? "고위험" : "주의",
    severityTone: candidate.severity === "high" ? "red" : "orange",
    status: "검토 필요",
    statusTone: "orange",
    target: worker?.name ?? candidate.targetWorkerId,
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

function mapLocation(document: FirestoreDocument): LocationModel {
  const data = document.data;

  return {
    id: document.id,
    name: readString(data.name, "근무지"),
    status: readString(data.status, "active"),
  };
}

function mapWorker(document: FirestoreDocument): WorkerModel {
  const data = document.data;

  return {
    id: document.id,
    name: readString(data.name, "이름 없는 조교"),
    status: readString(data.status, "active"),
    tagIds: readStringArray(data.tagIds),
  };
}

function mapTag(document: FirestoreDocument): TagModel {
  const data = document.data;

  return {
    id: document.id,
    label: readString(data.name, readString(data.label, "태그")),
  };
}

function mapWorkRecord(document: FirestoreDocument): WorkRecordModel {
  const data = document.data;

  return {
    anomalyType: readString(data.anomalyType, "none"),
    dateKey: readString(data.dateKey, readString(data.date, "")),
    effectiveEndAt: readDate(data.effectiveEndAt),
    effectiveStartAt: readDate(data.effectiveStartAt),
    id: document.id,
    locationId: readString(data.locationId, ""),
    locationName: readString(data.locationName, "근무지"),
    monthKey: readString(data.monthKey, readString(data.dateKey, "").slice(0, 7)),
    plannedEndAt: readDate(data.plannedEndAt),
    plannedStartAt: readDate(data.plannedStartAt),
    status: readString(data.status, ""),
    workerId: readString(data.workerId, ""),
    workerName: readString(data.workerName, "조교"),
  };
}

function mapAnomalyFlag(document: FirestoreDocument): AnomalyFlagModel {
  const data = document.data;

  return {
    anomalyType: readString(data.anomalyType, ""),
    id: document.id,
    locationId: readString(data.locationId, ""),
    severity: readString(data.severity, ""),
    status: readString(data.status, "unresolved"),
    workRecordId: readString(data.workRecordId, ""),
    workerId: readString(data.workerId, ""),
    workerName: readString(data.workerName, "조교"),
  };
}

function mapPayrollRow(document: FirestoreDocument): PayrollRowModel {
  const data = document.data;
  const summary = readRecord(data.currentCalculationSummary);
  const sortKeys = readRecord(data.sortKeys);

  return {
    finalAmount: readNullableNumber(summary.finalAmount),
    monthKey: readString(data.monthKey, ""),
    rowStatus: readString(data.rowStatus, ""),
    workerId: readString(data.workerId, ""),
    workerName: readString(data.workerNameSnapshot, readString(sortKeys.workerName, "조교")),
  };
}

function mapPayStatement(document: FirestoreDocument): PayStatementModel {
  const data = document.data;
  const snapshot = readRecord(data.snapshot);

  return {
    finalAmount: readNumber(snapshot.finalAmount, 0),
    monthKey: readString(data.monthKey, ""),
    status: readString(data.status, ""),
    workerId: readString(data.workerId, ""),
  };
}

function mapAiRun(document: FirestoreDocument): AiRunModel {
  const data = document.data;

  return {
    candidates: readAiCandidates(data.candidates),
    completedAt: readDate(data.completedAt),
    id: document.id,
    status: readString(data.status, ""),
  };
}

function readAiCandidates(value: unknown): readonly AiCandidateModel[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const candidate = readRecord(item);

    return {
      evidenceWorkRecordIds: readStringArray(candidate.evidenceWorkRecordIds),
      id: readString(candidate.id, ""),
      severity: readString(candidate.severity, "medium"),
      summary: readString(candidate.summary, "이상 패턴"),
      targetWorkerId: readString(candidate.targetWorkerId, ""),
    };
  });
}

function createLocationPeriodOptions(
  records: readonly WorkRecordModel[],
): readonly DashboardSelectOption<DashboardLocationPeriodId>[] {
  const monthKeys = unique(records.map((record) => record.monthKey).filter(Boolean))
    .sort()
    .reverse();

  return (monthKeys.length > 0 ? monthKeys : [""]).map((monthKey) => ({
    id: monthKey,
    label: formatMonthKorean(monthKey),
  }));
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

function compareAiRuns(left: AiRunModel, right: AiRunModel) {
  return getTime(right.completedAt) - getTime(left.completedAt);
}

function comparePayrollRows(left: PayrollRowModel, right: PayrollRowModel) {
  return right.monthKey.localeCompare(left.monthKey);
}

function compareStatements(left: PayStatementModel, right: PayStatementModel) {
  return right.monthKey.localeCompare(left.monthKey);
}

function getLatestMonthKey(monthKeys: readonly string[]) {
  return unique(monthKeys.filter(Boolean)).sort().at(-1) ?? "";
}

function getPayrollStatusLabel(status: string) {
  if (status === "paid") {
    return "지급 완료";
  }

  if (status === "needs_reconfirmation") {
    return "재확인 필요";
  }

  if (status === "processing") {
    return "처리중";
  }

  return "확정 대기";
}

function isLateRecord(record: WorkRecordModel) {
  if (record.anomalyType === "time_mismatch") {
    return true;
  }

  const planned = getTime(record.plannedStartAt);
  const actual = getTime(record.effectiveStartAt);

  return planned > 0 && actual > planned + 5 * 60 * 1000;
}

function isAnomalyRecord(record: WorkRecordModel) {
  return record.anomalyType !== "none" || record.status.startsWith("anomaly");
}

function getRecordHours(record: WorkRecordModel) {
  const start = getTime(record.effectiveStartAt ?? record.plannedStartAt);
  const end = getTime(record.effectiveEndAt ?? record.plannedEndAt);

  if (start <= 0 || end <= start) {
    return 0;
  }

  return (end - start) / (60 * 60 * 1000);
}

function estimatePay(hours: number) {
  return Math.round(hours * 12000);
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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
    return new Date(timestamp.seconds * 1000);
  }

  return null;
}

function formatMonthKorean(monthKey: string) {
  const [year, month] = monthKey.split("-");

  return year && month ? `${year}년 ${Number(month)}월` : "기간 미지정";
}

function formatDateTime(date: Date | null | undefined) {
  if (!date) {
    return "-";
  }

  return `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())} ${pad2(
    date.getHours(),
  )}:${pad2(date.getMinutes())}`;
}

function sum(values: readonly number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function toMap<T>(
  items: readonly T[],
  getId: (item: T) => string,
): Record<string, T> {
  return Object.fromEntries(items.map((item) => [getId(item), item]));
}

function unique(values: readonly string[]) {
  return Array.from(new Set(values));
}

function getTime(date: Date | null | undefined) {
  return date?.getTime() ?? 0;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}
