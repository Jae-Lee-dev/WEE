import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { resolveActiveWorkspaceId } from "@/features/entry/workspace-data-source";
import { readActiveWorkspaceId } from "@/features/entry/workspace-onboarding-state";
import {
  getFirebaseAuth,
  getFirebaseDb,
  isMockFirebaseProject,
} from "@/lib/firebase/client";
import {
  anomalyHistoryFixtureViewModel,
  attendanceLogFixtureViewModel,
  correctionHistoryFixtureViewModel,
  recordMainFixtureViewModel,
  type AnomalyHistoryDetail,
  type AnomalyHistoryRow,
  type AnomalyHistoryStatus,
  type AnomalyHistoryViewModel,
  type AttendanceLogRow,
  type AttendanceLogStatus,
  type AttendanceLogViewModel,
  type CorrectionDetail,
  type CorrectionHistoryViewModel,
  type CorrectionRow,
  type CorrectionStatus,
  type RecordDetailAction,
  type RecordDetailLine,
  type RecordDetailState,
  type RecordDetailStateId,
  type RecordMainViewModel,
  type RecordsFilterOption,
  type RecordsMetricCard,
  type RecordsTone,
  type RecordTimelineBlock,
  type RecordTimelineBlockKind,
  type RecordTimelineDayId,
} from "./records-fixtures";

export type RecordsDataSource = {
  applyMainRecordAction: (input: RecordMainActionInput) => Promise<void>;
  getAnomalyHistory: () => Promise<AnomalyHistoryViewModel>;
  getAttendanceLogs: () => Promise<AttendanceLogViewModel>;
  getCorrections: () => Promise<CorrectionHistoryViewModel>;
  getMainRecords: () => Promise<RecordMainViewModel>;
};

export type RecordMainActionInput = {
  action: "delete" | "edit" | "mark-normal";
  endTime?: string;
  payrollEffect: "hold" | "immediate";
  reason: string;
  recordId: string;
  startTime?: string;
};

type FirestoreDocument = {
  data: Record<string, unknown>;
  id: string;
};

type RecordsCollections = {
  anomalyFlags: readonly FirestoreDocument[];
  anomalyResolutions: readonly FirestoreDocument[];
  attendanceLogs: readonly FirestoreDocument[];
  correctionRequests: readonly FirestoreDocument[];
  overtimeWorks: readonly FirestoreDocument[];
  workRecords: readonly FirestoreDocument[];
};

type WorkRecordModel = {
  anomalyType: string;
  attendanceLogId: string | null;
  dateKey: string;
  dutyName: string;
  effectiveEndAt: Date | null;
  effectiveStartAt: Date | null;
  hasPendingCorrection: boolean;
  hasPendingOvertime: boolean;
  hasUnresolvedAnomaly: boolean;
  id: string;
  locationName: string;
  plannedEndAt: Date | null;
  plannedStartAt: Date | null;
  status: string;
  workerName: string;
};

type AnomalyFlagModel = {
  anomalyType: string;
  createdAt: Date | null;
  dateKey: string;
  dutyName: string;
  id: string;
  status: string;
  workRecordId: string | null;
  workerName: string;
};

type AnomalyResolutionModel = {
  anomalyFlagId: string | null;
  createdAt: Date | null;
  decidedBy: string | null;
  decision: string;
  id: string;
  managerNote: string;
  payrollEffect: string;
  workRecordId: string | null;
};

type CorrectionRequestModel = {
  afterSnapshot: Record<string, unknown>;
  beforeSnapshot: Record<string, unknown>;
  createdAt: Date | null;
  decidedAt: Date | null;
  id: string;
  managerNote: string;
  payrollEffect: string;
  payrollStatus: string;
  reason: string;
  status: string;
  submittedAt: Date | null;
  workRecordId: string | null;
  workerName: string;
};

type OvertimeWorkModel = {
  createdAt: Date | null;
  id: string;
  payrollEffect: string;
  payrollStatus: string;
  status: string;
  workRecordId: string | null;
};

type AttendanceLogModel = {
  anomalyType: string;
  checkInAt: Date | null;
  checkInLocation: Record<string, unknown>;
  checkOutAt: Date | null;
  checkOutLocation: Record<string, unknown> | null;
  createdAt: Date | null;
  date: string;
  id: string;
  locationName: string;
  status: string;
  workerName: string;
};

const weekDayLabels = ["일", "월", "화", "수", "목", "금", "토"] as const;
const dayIdByDateIndex = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
] as const satisfies readonly RecordTimelineDayId[];

export function createRecordsDataSource(): RecordsDataSource {
  if (shouldUseRecordsFixtureDataSource()) {
    return createFixtureRecordsDataSource();
  }

  return createFirestoreRecordsDataSource();
}

export function shouldUseRecordsFixtureDataSource() {
  return isMockFirebaseProject() || readActiveWorkspaceId() === "workspace_visual";
}

function createFixtureRecordsDataSource(): RecordsDataSource {
  return {
    async applyMainRecordAction() {},
    async getAnomalyHistory() {
      return anomalyHistoryFixtureViewModel;
    },
    async getAttendanceLogs() {
      return attendanceLogFixtureViewModel;
    },
    async getCorrections() {
      return correctionHistoryFixtureViewModel;
    },
    async getMainRecords() {
      return recordMainFixtureViewModel;
    },
  };
}

function createFirestoreRecordsDataSource(): RecordsDataSource {
  return {
    async applyMainRecordAction(input) {
      const workspaceId = await requireActiveWorkspaceId();
      const db = getFirebaseDb();
      const recordRef = doc(
        db,
        "workspaces",
        workspaceId,
        "workRecords",
        input.recordId,
      );
      const recordSnapshot = await getDoc(recordRef);

      if (!recordSnapshot.exists()) {
        throw new Error("근무기록을 찾을 수 없습니다.");
      }

      const recordData = recordSnapshot.data() as Record<string, unknown>;
      const dateKey = readString(
        recordData.dateKey,
        readString(recordData.date, ""),
      );
      const workerId = readString(recordData.workerId, "");
      const flags = await readWorkspaceCollection(workspaceId, "anomalyFlags");
      const flag = flags.find(
        (item) => readString(item.data.workRecordId, "") === input.recordId,
      );
      const resolutionRef = doc(
        collection(db, "workspaces", workspaceId, "anomalyResolutions"),
      );
      const batch = writeBatch(db);
      const payrollApplication =
        input.payrollEffect === "hold" ? "hold" : "immediate";
      const recordUpdate: Record<string, unknown> = {
        "managerOnly.anomalyResolutionId": resolutionRef.id,
        "managerOnly.payrollApplication": payrollApplication,
        "managerOnly.reviewedBy": getFirebaseAuth().currentUser?.uid ?? null,
        hasUnresolvedAnomaly: false,
        status: input.action === "delete" ? "deleted" : "resolved",
        updatedAt: serverTimestamp(),
      };

      if (input.action === "edit") {
        const effectiveStartAt = parseRecordActionTimestamp(
          dateKey,
          input.startTime,
        );
        const effectiveEndAt = parseRecordActionTimestamp(dateKey, input.endTime);

        if (effectiveStartAt) {
          recordUpdate.effectiveStartAt = effectiveStartAt;
        }

        if (effectiveEndAt) {
          recordUpdate.effectiveEndAt = effectiveEndAt;
        }
      }

      if (input.action === "delete") {
        recordUpdate.deletedAt = serverTimestamp();
      }

      batch.update(recordRef, recordUpdate);

      if (flag) {
        batch.update(
          doc(db, "workspaces", workspaceId, "anomalyFlags", flag.id),
          {
            resolvedAt: serverTimestamp(),
            status: "resolved",
            updatedAt: serverTimestamp(),
          },
        );
      }

      batch.set(resolutionRef, {
        anomalyFlagId: flag?.id ?? null,
        createdAt: serverTimestamp(),
        decidedBy: getFirebaseAuth().currentUser?.uid ?? null,
        decision: getRecordActionDecision(input.action),
        managerNote: input.reason,
        payrollEffect: payrollApplication,
        status: "completed",
        workRecordId: input.recordId,
        workerId,
        workspaceId,
      });

      await batch.commit();
    },
    async getAnomalyHistory() {
      return mapAnomalyHistoryView(await loadRecordsCollections());
    },
    async getAttendanceLogs() {
      return mapAttendanceLogView(await loadRecordsCollections());
    },
    async getCorrections() {
      return mapCorrectionHistoryView(await loadRecordsCollections());
    },
    async getMainRecords() {
      return mapRecordMainView(await loadRecordsCollections());
    },
  };
}

async function loadRecordsCollections(): Promise<RecordsCollections> {
  const workspaceId = await requireActiveWorkspaceId();
  const [
    workRecords,
    anomalyFlags,
    anomalyResolutions,
    correctionRequests,
    overtimeWorks,
    attendanceLogs,
  ] = await Promise.all([
    readWorkspaceCollection(workspaceId, "workRecords"),
    readWorkspaceCollection(workspaceId, "anomalyFlags"),
    readWorkspaceCollection(workspaceId, "anomalyResolutions"),
    readWorkspaceCollection(workspaceId, "correctionRequests"),
    readWorkspaceCollection(workspaceId, "overtimeWorks"),
    readWorkspaceCollection(workspaceId, "attendanceLogs"),
  ]);

  return {
    anomalyFlags,
    anomalyResolutions,
    attendanceLogs,
    correctionRequests,
    overtimeWorks,
    workRecords,
  };
}

async function requireActiveWorkspaceId() {
  const workspaceId = await resolveActiveWorkspaceId();

  if (!workspaceId) {
    throw new Error("활성 소속을 확인할 수 없습니다.");
  }

  return workspaceId;
}

async function readWorkspaceCollection(
  workspaceId: string,
  collectionName: keyof RecordsCollections,
): Promise<readonly FirestoreDocument[]> {
  const snapshot = await getDocs(
    collection(getFirebaseDb(), "workspaces", workspaceId, collectionName),
  );

  return snapshot.docs.map((document) => ({
    data: document.data() as Record<string, unknown>,
    id: document.id,
  }));
}

function getRecordActionDecision(action: RecordMainActionInput["action"]) {
  switch (action) {
    case "delete":
      return "delete_record";
    case "edit":
      return "modify_record";
    default:
      return "mark_normal";
  }
}

function parseRecordActionTimestamp(dateKey: string, timeValue: string | undefined) {
  if (!dateKey || !timeValue || !timeValue.match(/^\d{2}:\d{2}$/)) {
    return null;
  }

  const date = new Date(`${dateKey}T${timeValue}:00+09:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Timestamp.fromDate(date);
}

function mapRecordMainView(collections: RecordsCollections): RecordMainViewModel {
  const records = collections.workRecords.map(mapWorkRecord).sort(compareRecords);
  const attendanceById = toMap(
    collections.attendanceLogs.map(mapAttendanceLog),
    (log) => log.id,
  );
  const anomalyFlags = collections.anomalyFlags.map(mapAnomalyFlag);
  const correctionRequests = collections.correctionRequests.map(
    mapCorrectionRequest,
  );
  const overtimeWorks = collections.overtimeWorks.map(mapOvertimeWork);
  const flagsByRecordId = toMap(
    anomalyFlags.filter(hasWorkRecordId),
    (flag) => flag.workRecordId,
  );
  const correctionIdsByRecordId = groupIdsByWorkRecordId(
    correctionRequests.filter((request) => request.status === "submitted"),
  );
  const overtimeIdsByRecordId = groupIdsByWorkRecordId(
    overtimeWorks.filter((work) => work.status === "submitted"),
  );
  const pendingCorrectionIds = new Set(correctionIdsByRecordId.keys());
  const pendingOvertimeIds = new Set(overtimeIdsByRecordId.keys());
  const weekNavigation = createWeekNavigation(records);
  const initialWeekStartKey = weekNavigation.initialWeekStartKey;
  const selectedRecord = selectInitialRecord(records, {
    flagsByRecordId,
    weekStartKey: initialWeekStartKey,
  });
  const initialDetailStateId = selectedRecord
    ? isUnresolvedAnomaly(selectedRecord, flagsByRecordId)
      ? "anomaly-step-1"
      : "normal-selected"
    : "empty";
  const blocks = records.map((record) =>
    mapTimelineBlock(record, {
      correctionIdsByRecordId,
      flag: flagsByRecordId.get(record.id),
      overtimeIdsByRecordId,
      pendingCorrectionIds,
      pendingOvertimeIds,
    }),
  );
  const detailStatesByBlockId = createDetailStatesByBlockId(records, {
    attendanceById,
    flagsByRecordId,
  });

  return {
    blocks,
    detailStates: createDetailStates({
      attendance: selectedRecord?.attendanceLogId
        ? attendanceById.get(selectedRecord.attendanceLogId) ?? null
        : null,
      flag: selectedRecord ? flagsByRecordId.get(selectedRecord.id) ?? null : null,
      record: selectedRecord,
    }),
    detailStatesByBlockId,
    initialBlockId: selectedRecord?.id ?? null,
    initialWeekStartKey,
    initialDetailStateId,
    timeline: {
      ...recordMainFixtureViewModel.timeline,
      weekNavigation,
      filters: createMainFilters(records),
      weekLabel: initialWeekStartKey
        ? formatWeekLabelFromStartKey(initialWeekStartKey)
        : createWeekLabel(records),
    },
  };
}

function mapAnomalyHistoryView(
  collections: RecordsCollections,
): AnomalyHistoryViewModel {
  const recordsById = toMap(collections.workRecords.map(mapWorkRecord), (record) => record.id);
  const resolutions = collections.anomalyResolutions.map(mapAnomalyResolution);
  const resolutionByFlagId = toMap(
    resolutions.filter((resolution) => resolution.anomalyFlagId),
    (resolution) => resolution.anomalyFlagId,
  );
  const resolutionByRecordId = toMap(
    resolutions.filter((resolution) => resolution.workRecordId),
    (resolution) => resolution.workRecordId,
  );
  const flags = collections.anomalyFlags.map(mapAnomalyFlag).sort((first, second) => {
    return getSortTime(second.createdAt) - getSortTime(first.createdAt);
  });
  const rows = flags.map((flag) => {
    const record = flag.workRecordId ? recordsById.get(flag.workRecordId) : null;
    const resolution =
      resolutionByFlagId.get(flag.id) ??
      (flag.workRecordId ? resolutionByRecordId.get(flag.workRecordId) : undefined);

    return mapAnomalyHistoryRow(flag, record ?? null, resolution ?? null);
  });

  return {
    details: Object.fromEntries(
      flags.map((flag) => {
        const record = flag.workRecordId ? recordsById.get(flag.workRecordId) : null;
        const resolution =
          resolutionByFlagId.get(flag.id) ??
          (flag.workRecordId
            ? resolutionByRecordId.get(flag.workRecordId)
            : undefined);
        const detail = mapAnomalyHistoryDetail(flag, record ?? null, resolution ?? null);

        return [detail.id, detail];
      }),
    ),
    emptyDetailText: ["왼쪽 리스트에서", "이상감지처리 이력을 선택하세요."],
    filters: createAnomalyHistoryFilters(rows),
    metrics: createAnomalyHistoryMetrics(rows),
    rows,
  };
}

function mapCorrectionHistoryView(
  collections: RecordsCollections,
): CorrectionHistoryViewModel {
  const recordsById = toMap(collections.workRecords.map(mapWorkRecord), (record) => record.id);
  const requests = collections.correctionRequests
    .map(mapCorrectionRequest)
    .sort((first, second) => {
      return getSortTime(second.submittedAt ?? second.createdAt) -
        getSortTime(first.submittedAt ?? first.createdAt);
    });
  const rows = requests.map((request) =>
    mapCorrectionRow(
      request,
      request.workRecordId ? recordsById.get(request.workRecordId) ?? null : null,
    ),
  );

  return {
    details: Object.fromEntries(
      requests.map((request) => {
        const detail = mapCorrectionDetail(
          request,
          request.workRecordId
            ? recordsById.get(request.workRecordId) ?? null
            : null,
        );

        return [detail.id, detail];
      }),
    ),
    emptyDetailText: ["왼쪽 리스트에서", "이의신청 이력을 선택하세요."],
    filters: createCorrectionFilters(rows),
    metrics: createCorrectionMetrics(rows),
    rows,
  };
}

function mapAttendanceLogView(
  collections: RecordsCollections,
): AttendanceLogViewModel {
  const rows = collections.attendanceLogs
    .map(mapAttendanceLog)
    .sort((first, second) => {
      return getSortTime(second.checkInAt ?? second.createdAt) -
        getSortTime(first.checkInAt ?? first.createdAt);
    })
    .map(mapAttendanceLogRow);
  const anomalyCount = rows.filter((row) => row.locationStatus === "이상").length;

  return {
    columns: attendanceLogFixtureViewModel.columns,
    filters: [
      { id: "all", label: `전체 로그 (${rows.length})`, selected: true },
      { id: "anomaly", label: `이상 표시 (${anomalyCount})` },
    ],
    rows,
  };
}

function mapWorkRecord(document: FirestoreDocument): WorkRecordModel {
  const data = document.data;
  const dateKey = readString(data.dateKey, readString(data.date, ""));

  return {
    anomalyType: readString(data.anomalyType, "none"),
    attendanceLogId: readNullableString(data.attendanceLogId),
    dateKey,
    dutyName: readString(data.dutyName, "근무 이름 없음"),
    effectiveEndAt: readDate(data.effectiveEndAt),
    effectiveStartAt: readDate(data.effectiveStartAt),
    hasPendingCorrection: readBoolean(data.hasPendingCorrection),
    hasPendingOvertime: readBoolean(data.hasPendingOvertime),
    hasUnresolvedAnomaly: readBoolean(data.hasUnresolvedAnomaly),
    id: document.id,
    locationName: readString(data.locationName, "근무지 미지정"),
    plannedEndAt: readDate(data.plannedEndAt),
    plannedStartAt: readDate(data.plannedStartAt),
    status: readString(data.status, ""),
    workerName: readString(data.workerName, "이름 없는 조교"),
  };
}

function mapAnomalyFlag(document: FirestoreDocument): AnomalyFlagModel {
  const data = document.data;

  return {
    anomalyType: readString(data.anomalyType, "unknown"),
    createdAt: readDate(data.createdAt),
    dateKey: readString(data.dateKey, ""),
    dutyName: readString(data.dutyName, "근무 이름 없음"),
    id: document.id,
    status: readString(data.status, "unresolved"),
    workRecordId: readNullableString(data.workRecordId),
    workerName: readString(data.workerName, "이름 없는 조교"),
  };
}

function mapAnomalyResolution(
  document: FirestoreDocument,
): AnomalyResolutionModel {
  const data = document.data;

  return {
    anomalyFlagId: readNullableString(data.anomalyFlagId),
    createdAt: readDate(data.createdAt),
    decidedBy: readNullableString(data.decidedBy),
    decision: readString(data.decision, ""),
    id: document.id,
    managerNote: readString(data.managerNote, ""),
    payrollEffect: readString(data.payrollEffect, "none"),
    workRecordId: readNullableString(data.workRecordId),
  };
}

function mapCorrectionRequest(document: FirestoreDocument): CorrectionRequestModel {
  const data = document.data;

  return {
    afterSnapshot: readRecord(data.afterSnapshot),
    beforeSnapshot: readRecord(data.beforeSnapshot),
    createdAt: readDate(data.createdAt),
    decidedAt: readDate(data.decidedAt),
    id: document.id,
    managerNote: readString(data.managerNote, ""),
    payrollEffect: readString(data.payrollEffect, "none"),
    payrollStatus: readString(data.payrollStatus, "none"),
    reason: readString(data.reason, "사유가 등록되지 않았습니다."),
    status: readString(data.status, "submitted"),
    submittedAt: readDate(data.submittedAt),
    workRecordId: readNullableString(data.workRecordId),
    workerName: readString(data.workerName, "이름 없는 조교"),
  };
}

function mapOvertimeWork(document: FirestoreDocument): OvertimeWorkModel {
  const data = document.data;

  return {
    createdAt: readDate(data.createdAt),
    id: document.id,
    payrollEffect: readString(data.payrollEffect, "none"),
    payrollStatus: readString(data.payrollStatus, "none"),
    status: readString(data.status, "submitted"),
    workRecordId: readNullableString(data.workRecordId),
  };
}

function mapAttendanceLog(document: FirestoreDocument): AttendanceLogModel {
  const data = document.data;

  return {
    anomalyType: readString(data.anomalyType, "none"),
    checkInAt: readDate(data.checkInAt),
    checkInLocation: readRecord(data.checkInLocation),
    checkOutAt: readDate(data.checkOutAt),
    checkOutLocation: readNullableRecord(data.checkOutLocation),
    createdAt: readDate(data.createdAt),
    date: readString(data.date, ""),
    id: document.id,
    locationName: readString(data.locationName, "근무지 미지정"),
    status: readString(data.status, ""),
    workerName: readString(data.workerName, "이름 없는 조교"),
  };
}

function mapTimelineBlock(
  record: WorkRecordModel,
  options: {
    correctionIdsByRecordId: ReadonlyMap<string, readonly string[]>;
    flag?: AnomalyFlagModel;
    overtimeIdsByRecordId: ReadonlyMap<string, readonly string[]>;
    pendingCorrectionIds: ReadonlySet<string>;
    pendingOvertimeIds: ReadonlySet<string>;
  },
): RecordTimelineBlock {
  const hasUnresolvedFlag = isUnresolvedAnomaly(record, new Map([[record.id, options.flag]]));
  const kind = getTimelineBlockKind(record, {
    hasUnresolvedFlag,
    pendingCorrectionIds: options.pendingCorrectionIds,
    pendingOvertimeIds: options.pendingOvertimeIds,
  });

  return {
    id: record.id,
    dateKey: getRecordDateKey(record) || undefined,
    dayId: getRecordDayId(record),
    dutyName: record.dutyName,
    endHour: getRecordEndHour(record),
    endTime: formatTime(record.effectiveEndAt ?? record.plannedEndAt),
    focusIds: [
      record.attendanceLogId,
      options.flag?.id,
      ...(options.correctionIdsByRecordId.get(record.id) ?? []),
      ...(options.overtimeIdsByRecordId.get(record.id) ?? []),
    ].filter((id): id is string => Boolean(id)),
    kind,
    locationName: record.locationName,
    selectedStateId: hasUnresolvedFlag ? "anomaly-step-1" : "normal-selected",
    startHour: getRecordStartHour(record),
    startTime: formatTime(record.effectiveStartAt ?? record.plannedStartAt),
    tone: getTimelineBlockTone(kind),
    workerName: record.workerName,
  };
}

function groupIdsByWorkRecordId<
  T extends { id: string; workRecordId: string | null },
>(
  items: readonly T[],
) {
  const idsByRecordId = new Map<string, string[]>();

  for (const item of items) {
    if (!item.workRecordId) {
      continue;
    }

    idsByRecordId.set(item.workRecordId, [
      ...(idsByRecordId.get(item.workRecordId) ?? []),
      item.id,
    ]);
  }

  return idsByRecordId;
}

function createDetailStatesByBlockId(
  records: readonly WorkRecordModel[],
  options: {
    attendanceById: ReadonlyMap<string, AttendanceLogModel>;
    flagsByRecordId: ReadonlyMap<string, AnomalyFlagModel | undefined>;
  },
) {
  const detailStatesByBlockId: Record<
    string,
    Record<RecordDetailStateId, RecordDetailState>
  > = {};

  for (const record of records) {
    detailStatesByBlockId[record.id] = createDetailStates({
      attendance: record.attendanceLogId
        ? options.attendanceById.get(record.attendanceLogId) ?? null
        : null,
      flag: options.flagsByRecordId.get(record.id) ?? null,
      record,
    });
  }

  return detailStatesByBlockId;
}

function createWeekNavigation(records: readonly WorkRecordModel[]) {
  const currentWeekStartKey = formatDateKey(startOfWeekSunday(new Date()));
  const recordWeekStartKeys = records
    .map(getRecordDate)
    .filter((date): date is Date => Boolean(date))
    .map((date) => formatDateKey(startOfWeekSunday(date)));
  const weekStartKeys = [...new Set([currentWeekStartKey, ...recordWeekStartKeys])].sort();

  return {
    initialWeekStartKey: currentWeekStartKey,
    maxWeekStartKey: weekStartKeys.at(-1) ?? currentWeekStartKey,
    minWeekStartKey: weekStartKeys[0] ?? currentWeekStartKey,
  };
}

function selectInitialRecord(
  records: readonly WorkRecordModel[],
  options: {
    flagsByRecordId: ReadonlyMap<string, AnomalyFlagModel | undefined>;
    weekStartKey: string | null;
  },
) {
  const weekStartKey = options.weekStartKey;
  const scopedRecords = weekStartKey
    ? records.filter((record) => isRecordInWeek(record, weekStartKey))
    : records;

  return (
    scopedRecords.find((record) => isUnresolvedAnomaly(record, options.flagsByRecordId)) ??
    scopedRecords[0] ??
    null
  );
}

function createDetailStates({
  attendance,
  flag,
  record,
}: {
  attendance: AttendanceLogModel | null;
  flag: AnomalyFlagModel | null;
  record: WorkRecordModel | null;
}): Record<RecordDetailStateId, RecordDetailState> {
  const empty = createEmptyDetailState(
    record
      ? ["왼쪽 리스트에서", "근무 기록을 선택하세요."]
      : ["표시할 근무 기록이 없습니다."],
  );

  if (!record) {
    return {
      empty,
      "normal-selected": createPlaceholderNormalDetail(),
      "anomaly-step-1": createPlaceholderAnomalyDetail("anomaly-step-1"),
      "anomaly-step-2": createPlaceholderAnomalyDetail("anomaly-step-2"),
      "anomaly-step-3": createPlaceholderAnomalyDetail("anomaly-step-3"),
      "anomaly-step-4": createPlaceholderAnomalyDetail("anomaly-step-4"),
    };
  }

  const normal = createNormalDetailState(record, attendance);
  const hasUnresolvedFlag = Boolean(flag) &&
    isUnresolvedAnomaly(record, new Map([[record.id, flag ?? undefined]]));
  const actionBase = hasUnresolvedFlag
    ? createAnomalyDetailBase(record, attendance, flag)
    : createRecordActionDetailBase(record, attendance);

  return {
    empty,
    "normal-selected": normal,
    "anomaly-step-1": actionBase,
    "anomaly-step-2": {
      ...actionBase,
      id: "anomaly-step-2",
      actions: createRecordActionButtons(hasUnresolvedFlag, "mark-normal"),
      confirmLabel: "확인",
      helperText:
        "이상이 없다고 판단하여 플래그를 닫습니다. 근무기록은 변경되지 않습니다.",
    },
    "anomaly-step-3": {
      ...actionBase,
      id: "anomaly-step-3",
      actions: createRecordActionButtons(hasUnresolvedFlag, "edit"),
      confirmLabel: "확인",
      payrollMode: {
        label: "급여 반영",
        options: [
          { id: "immediate", label: "즉시", active: true },
          { id: "hold", label: "보류" },
        ],
      },
      reasonField: {
        label: "수정 사유",
        placeholder: "수정 사유를 입력하세요",
      },
      timeFields: [
        {
          id: "check-in",
          label: "출근 시간",
          value: formatKoreanTime(record.effectiveStartAt ?? record.plannedStartAt),
        },
        {
          id: "check-out",
          label: "퇴근 시간",
          value: formatKoreanTime(record.effectiveEndAt ?? record.plannedEndAt),
        },
      ],
    },
    "anomaly-step-4": {
      ...actionBase,
      id: "anomaly-step-4",
      actions: createRecordActionButtons(hasUnresolvedFlag, "delete"),
      confirmLabel: "확인",
      helperText: "해당 근무기록이 삭제되어 결근으로 처리됩니다.",
      payrollMode: {
        label: "급여 반영",
        options: [
          { id: "immediate", label: "즉시", active: true },
          { id: "hold", label: "보류" },
        ],
      },
    },
  };
}

function createNormalDetailState(
  record: WorkRecordModel,
  attendance: AttendanceLogModel | null,
): RecordDetailState {
  return {
    actions: createRecordActionButtons(false),
    id: "normal-selected",
    lines: createRecordDetailLines(record, attendance, false),
    statusLabel: "정상",
    statusTone: "green",
    title: `${record.workerName} · ${record.dutyName}`,
  };
}

function createRecordActionDetailBase(
  record: WorkRecordModel,
  attendance: AttendanceLogModel | null,
): RecordDetailState {
  return {
    actions: createRecordActionButtons(false),
    id: "normal-selected",
    lines: createRecordDetailLines(record, attendance, false),
    statusLabel: "정상",
    statusTone: "green",
    title: `${record.workerName} · ${record.dutyName}`,
  };
}

function createRecordActionButtons(
  hasAnomalyAction: boolean,
  activeAction?: string,
): readonly RecordDetailAction[] {
  return [
    ...(hasAnomalyAction
      ? [{ id: "mark-normal", label: "정상 처리", active: activeAction === "mark-normal" }]
      : []),
    { id: "edit", label: "수정", active: activeAction === "edit" },
    { id: "delete", label: "삭제", active: activeAction === "delete" },
  ];
}

function createAnomalyDetailBase(
  record: WorkRecordModel,
  attendance: AttendanceLogModel | null,
  flag: AnomalyFlagModel | null,
): RecordDetailState {
  const anomalyType = flag?.anomalyType ?? record.anomalyType;

  return {
    actions: [
      { id: "mark-normal", label: "정상 처리" },
      { id: "edit", label: "수정" },
      { id: "delete", label: "삭제" },
    ],
    alertText: getAnomalyAlertText(anomalyType),
    id: "anomaly-step-1",
    lines: createRecordDetailLines(record, attendance, true),
    statusLabel: getAnomalyTypeLabel(anomalyType),
    statusTone: "pink",
    title: `${record.workerName} · ${record.dutyName}`,
  };
}

function createEmptyDetailState(emptyText: readonly string[]): RecordDetailState {
  return {
    emptyText,
    id: "empty",
  };
}

function createPlaceholderNormalDetail(): RecordDetailState {
  return {
    id: "normal-selected",
    lines: [],
    statusLabel: "정상",
    statusTone: "green",
    title: "근무 기록",
  };
}

function createPlaceholderAnomalyDetail(id: RecordDetailStateId): RecordDetailState {
  return {
    id,
    lines: [],
    statusLabel: "위치이상",
    statusTone: "pink",
    title: "근무 기록",
  };
}

function createRecordDetailLines(
  record: WorkRecordModel,
  attendance: AttendanceLogModel | null,
  anomaly: boolean,
): readonly RecordDetailLine[] {
  return [
    detailLine(
      "check-in",
      "출근",
      formatTime(attendance?.checkInAt ?? record.effectiveStartAt),
    ),
    detailLine(
      "check-out",
      "퇴근",
      formatTime(attendance?.checkOutAt ?? record.effectiveEndAt),
    ),
    detailLine(
      "location",
      "위치",
      anomaly ? getLocationAnomalyText(record, attendance) : "정상 (반경 내)",
      anomaly ? "pink" : undefined,
    ),
  ];
}

function mapAnomalyHistoryRow(
  flag: AnomalyFlagModel,
  record: WorkRecordModel | null,
  resolution: AnomalyResolutionModel | null,
): AnomalyHistoryRow {
  return {
    anomalyType: getAnomalyTypeLabel(flag.anomalyType),
    detailButtonLabel: "상세보기",
    dutyName: record?.dutyName ?? flag.dutyName,
    id: flag.id,
    payrollResult: getPayrollEffectLabel(resolution?.payrollEffect ?? "none"),
    referenceDate: formatShortDateTime(flag.createdAt ?? parseDateKey(flag.dateKey)),
    result: getAnomalyResolutionLabel(resolution?.decision ?? null, flag.status),
    status: getAnomalyHistoryStatus(flag.status, resolution),
    workerName: record?.workerName ?? flag.workerName,
  };
}

function mapAnomalyHistoryDetail(
  flag: AnomalyFlagModel,
  record: WorkRecordModel | null,
  resolution: AnomalyResolutionModel | null,
): AnomalyHistoryDetail {
  const status = getAnomalyHistoryStatus(flag.status, resolution);

  return {
    afterLines: [
      detailLine("status", "처리", status === "처리 완료" ? "완료" : "대기"),
      detailLine(
        "record",
        "근무기록",
        getAnomalyResolutionLabel(resolution?.decision ?? null, flag.status),
      ),
    ],
    afterTitle: "처리 후",
    badges: [
      { label: getAnomalyTypeLabel(flag.anomalyType), tone: "pink" },
      { label: status, tone: status === "처리 완료" ? "green" : "orange" },
    ],
    beforeLines: record
      ? createRecordDetailLines(record, null, true)
      : [
          detailLine("check-in", "출근", "미기록"),
          detailLine("check-out", "퇴근", "미기록"),
          detailLine("location", "위치", getAnomalyTypeLabel(flag.anomalyType), "pink"),
        ],
    beforeTitle: "처리 전",
    id: flag.id,
    infoLines: [
      detailLine("handler", "처리자", resolution?.decidedBy ? "관리자" : "-"),
      detailLine("academy", "학원명", record?.locationName ?? "근무지 미지정"),
    ],
    infoTitle: "처리 정보",
    subtitle: `${formatRecordDate(record?.dateKey ?? flag.dateKey)} 근무`,
    title: `${record?.workerName ?? flag.workerName} · ${
      record?.dutyName ?? flag.dutyName
    }`,
  };
}

function mapCorrectionRow(
  request: CorrectionRequestModel,
  record: WorkRecordModel | null,
): CorrectionRow {
  const status = getCorrectionStatus(request.status);

  return {
    detailButtonLabel: "상세보기",
    id: request.id,
    payrollResult: getPayrollEffectLabel(
      request.payrollEffect || request.payrollStatus,
    ),
    recordName:
      record?.dutyName ??
      readString(request.beforeSnapshot.dutyName, "대상 근무기록"),
    result: getCorrectionResultLabel(request),
    status,
    submittedAt: formatShortDateTime(request.submittedAt ?? request.createdAt),
    workerName: record?.workerName ?? request.workerName,
  };
}

function mapCorrectionDetail(
  request: CorrectionRequestModel,
  record: WorkRecordModel | null,
): CorrectionDetail {
  const status = getCorrectionStatus(request.status);
  const payrollLabel = getPayrollEffectLabel(
    request.payrollEffect || request.payrollStatus,
  );

  return {
    approvedLines: createSnapshotLines(request.afterSnapshot, record, "after"),
    approvedTitle: status === "승인" ? "승인 결과" : "처리 결과",
    badges: [
      { label: status, tone: getCorrectionStatusTone(status) },
      { label: payrollLabel, tone: payrollLabel === "즉시" ? "green" : "grey" },
    ],
    id: request.id,
    noteText: request.managerNote || getCorrectionResultLabel(request),
    originalLines: createSnapshotLines(request.beforeSnapshot, record, "before"),
    originalTitle: "당시 기록",
    reasonText: request.reason,
    reasonTitle: "조교 사유",
    subtitle: `${formatRecordDate(record?.dateKey ?? readString(request.beforeSnapshot.date, ""))} 근무`,
    title: `${record?.workerName ?? request.workerName} · ${
      record?.dutyName ?? readString(request.beforeSnapshot.dutyName, "대상 근무기록")
    }`,
  };
}

function mapAttendanceLogRow(log: AttendanceLogModel): AttendanceLogRow {
  return {
    checkIn: formatTime(log.checkInAt),
    checkOut: formatTime(log.checkOutAt),
    date: formatShortDateTime(log.checkInAt ?? log.createdAt ?? parseDateKey(log.date)),
    id: log.id,
    locationName: log.locationName,
    locationStatus: getAttendanceLogStatus(log),
    workerName: log.workerName,
  };
}

function createMainFilters(
  records: readonly WorkRecordModel[],
): Record<string, readonly RecordsFilterOption[]> {
  return {
    location: createWorkerFilterOptions(records.map((record) => record.workerName)),
    status: recordMainFixtureViewModel.timeline.filters.status,
    type: recordMainFixtureViewModel.timeline.filters.type,
  };
}

function createAnomalyHistoryFilters(
  rows: readonly AnomalyHistoryRow[],
): Record<string, readonly RecordsFilterOption[]> {
  return {
    location: createWorkerFilterOptions(rows.map((row) => row.workerName)),
    result: anomalyHistoryFixtureViewModel.filters.result,
    status: anomalyHistoryFixtureViewModel.filters.status,
    payroll: anomalyHistoryFixtureViewModel.filters.payroll,
  };
}

function createCorrectionFilters(
  rows: readonly CorrectionRow[],
): Record<string, readonly RecordsFilterOption[]> {
  return {
    location: createWorkerFilterOptions(rows.map((row) => row.workerName)),
    payroll: correctionHistoryFixtureViewModel.filters.payroll,
    status: correctionHistoryFixtureViewModel.filters.status.map((option) =>
      option.id === "rejected"
        ? {
            ...option,
            label: "반려/철회",
          }
        : option,
    ),
  };
}

function createWorkerFilterOptions(names: readonly string[]) {
  const uniqueNames = [...new Set(names.filter(Boolean))].sort((first, second) =>
    first.localeCompare(second, "ko-KR"),
  );

  return [
    { id: "all", label: "조교 (전체)", selected: true },
    ...uniqueNames.map((name) => ({
      id: createStableId(name),
      label: name,
    })),
  ] satisfies readonly RecordsFilterOption[];
}

function createAnomalyHistoryMetrics(
  rows: readonly AnomalyHistoryRow[],
): readonly RecordsMetricCard[] {
  const pendingCount = rows.filter((row) => row.status === "처리 대기").length;
  const changedCount = rows.filter(
    (row) => row.result === "수정" || row.result === "삭제",
  ).length;

  return [
    { id: "submitted", label: "제출 유형", value: `${rows.length}건`, tone: "green" },
    { id: "pending", label: "처리 대기", value: `${pendingCount}건`, tone: "orange" },
    {
      id: "edited-or-deleted",
      label: "수정/삭제",
      value: `${changedCount}건`,
      tone: "pink",
    },
  ];
}

function createCorrectionMetrics(
  rows: readonly CorrectionRow[],
): readonly RecordsMetricCard[] {
  const pendingCount = rows.filter((row) => row.status === "처리 대기").length;
  const approvedCount = rows.filter((row) => row.status === "승인").length;
  const rejectedOrWithdrawnCount = rows.filter(
    (row) => row.status === "반려" || row.status === "철회",
  ).length;

  return [
    { id: "submitted", label: "제출 유형", value: `${rows.length}건`, tone: "green" },
    { id: "pending", label: "처리 대기", value: `${pendingCount}건`, tone: "orange" },
    { id: "approved", label: "승인", value: `${approvedCount}건`, tone: "green" },
    {
      id: "rejected-or-withdrawn",
      label: "반려/철회",
      value: `${rejectedOrWithdrawnCount}건`,
      tone: "pink",
    },
  ];
}

function createSnapshotLines(
  snapshot: Record<string, unknown>,
  record: WorkRecordModel | null,
  mode: "before" | "after",
): readonly RecordDetailLine[] {
  const startAt =
    readDate(snapshot.effectiveStartAt) ??
    readDate(snapshot.plannedStartAt) ??
    record?.effectiveStartAt ??
    record?.plannedStartAt ??
    null;
  const endAt =
    readDate(snapshot.effectiveEndAt) ??
    readDate(snapshot.plannedEndAt) ??
    record?.effectiveEndAt ??
    record?.plannedEndAt ??
    null;
  const payrollTone: RecordsTone | undefined = mode === "after" ? "green" : undefined;

  return [
    detailLine("check-in", "출근", formatTime(startAt), payrollTone),
    detailLine("check-out", "퇴근", formatTime(endAt)),
    detailLine(
      "manager-action",
      mode === "after" ? "처리" : "관리자 처리",
      getSnapshotChangeLabel(snapshot),
    ),
  ];
}

function getTimelineBlockKind(
  record: WorkRecordModel,
  options: {
    hasUnresolvedFlag: boolean;
    pendingCorrectionIds: ReadonlySet<string>;
    pendingOvertimeIds: ReadonlySet<string>;
  },
): RecordTimelineBlockKind {
  if (options.hasUnresolvedFlag) {
    return "location-anomaly";
  }

  if (record.hasPendingCorrection || options.pendingCorrectionIds.has(record.id)) {
    return "correction";
  }

  if (record.hasPendingOvertime || options.pendingOvertimeIds.has(record.id)) {
    return "overtime";
  }

  return "normal";
}

function getTimelineBlockTone(kind: RecordTimelineBlockKind): RecordsTone {
  if (kind === "location-anomaly") {
    return "pink";
  }

  if (kind === "correction") {
    return "orange";
  }

  if (kind === "overtime") {
    return "blue";
  }

  return "green";
}

function isUnresolvedAnomaly(
  record: WorkRecordModel,
  flagsByRecordId: ReadonlyMap<string, AnomalyFlagModel | undefined>,
) {
  const flag = flagsByRecordId.get(record.id);

  return (
    record.hasUnresolvedAnomaly ||
    record.status === "anomaly_unresolved" ||
    (flag?.status ?? "") === "unresolved"
  );
}

function hasWorkRecordId(
  flag: AnomalyFlagModel,
): flag is AnomalyFlagModel & { workRecordId: string } {
  return Boolean(flag.workRecordId);
}

function getAnomalyHistoryStatus(
  status: string,
  resolution: AnomalyResolutionModel | null,
): AnomalyHistoryStatus {
  return status === "resolved" || resolution ? "처리 완료" : "처리 대기";
}

function getCorrectionStatus(status: string): CorrectionStatus {
  if (status === "approved") {
    return "승인";
  }

  if (status === "rejected") {
    return "반려";
  }

  if (status === "withdrawn") {
    return "철회";
  }

  return "처리 대기";
}

function getCorrectionStatusTone(status: CorrectionStatus): RecordsTone {
  if (status === "승인") {
    return "green";
  }

  if (status === "처리 대기") {
    return "orange";
  }

  return "pink";
}

function getAttendanceLogStatus(log: AttendanceLogModel): AttendanceLogStatus {
  if (
    log.anomalyType !== "none" ||
    log.status === "needs_review" ||
    readString(log.checkInLocation.result, "inside_radius") !== "inside_radius" ||
    (log.checkOutLocation &&
      readString(log.checkOutLocation.result, "inside_radius") !== "inside_radius")
  ) {
    return "이상";
  }

  return "정상";
}

function getAnomalyTypeLabel(type: string) {
  if (type === "location_mismatch") {
    return "위치이상";
  }

  if (type === "time_mismatch") {
    return "시간이상";
  }

  if (type === "missing_checkout") {
    return "퇴근 미처리";
  }

  if (type === "absence_candidate") {
    return "결근 후보";
  }

  if (type === "location_unknown") {
    return "위치 미확인";
  }

  return "이상";
}

function getAnomalyAlertText(type: string) {
  if (type === "time_mismatch") {
    return "출퇴근 시각이 시간표 기준 허용 범위를 벗어났습니다.";
  }

  if (type === "missing_checkout") {
    return "출근 로그는 있으나 퇴근 기록이 누락되었습니다.";
  }

  if (type === "absence_candidate") {
    return "해당 근무와 매칭되는 출퇴근 로그가 없어 결근 후보로 표시되었습니다.";
  }

  if (type === "location_unknown") {
    return "GPS 수집 실패로 위치 확인이 필요합니다.";
  }

  return "퇴근 시 근무지 반경 외부에서 기록되었습니다.";
}

function getLocationAnomalyText(
  record: WorkRecordModel,
  attendance: AttendanceLogModel | null,
) {
  if (record.anomalyType === "missing_checkout") {
    return "퇴근 미기록";
  }

  if (record.anomalyType === "absence_candidate") {
    return "출퇴근 없음";
  }

  if (record.anomalyType === "location_unknown") {
    return "위치 미확인";
  }

  const radiusMeters = readNumber(attendance?.checkOutLocation?.radiusMeters, 0);

  if (record.anomalyType === "location_mismatch" && radiusMeters > 0) {
    return `반경 외 ${radiusMeters}m`;
  }

  if (record.anomalyType === "time_mismatch") {
    return "시간 오차";
  }

  return "확인 필요";
}

function getAnomalyResolutionLabel(decision: string | null, status: string) {
  if (!decision && status !== "resolved") {
    return "미처리";
  }

  if (decision === "modify_record") {
    return "수정";
  }

  if (decision === "delete_record") {
    return "삭제";
  }

  return "변경 없음";
}

function getCorrectionResultLabel(request: CorrectionRequestModel) {
  if (request.status === "approved") {
    const label = getSnapshotChangeLabel(request.afterSnapshot);

    return label === "변경 없음" ? "승인" : label;
  }

  if (request.status === "rejected") {
    return "반려";
  }

  if (request.status === "withdrawn") {
    return "철회";
  }

  return "처리 대기";
}

function getSnapshotChangeLabel(snapshot: Record<string, unknown>) {
  const changeType = readString(snapshot.changeType, "");
  const reason = readString(snapshot.changeReason, "");

  if (changeType === "deleted") {
    return "삭제";
  }

  if (changeType === "modified") {
    return reason || "수정";
  }

  return reason || "변경 없음";
}

function getPayrollEffectLabel(effect: string) {
  if (effect === "immediate" || effect === "applied" || effect === "confirmed") {
    return "즉시";
  }

  if (effect === "hold" || effect === "held") {
    return "보류";
  }

  return "변경 없음";
}

function getRecordDayId(record: WorkRecordModel): RecordTimelineDayId {
  const date = parseDateKey(record.dateKey) ?? record.plannedStartAt;

  return date ? dayIdByDateIndex[date.getDay()] : "mon";
}

function getRecordStartHour(record: WorkRecordModel) {
  return (record.plannedStartAt ?? record.effectiveStartAt)?.getHours() ?? 8;
}

function getRecordEndHour(record: WorkRecordModel) {
  const endAt = record.plannedEndAt ?? record.effectiveEndAt;
  const startHour = getRecordStartHour(record);

  return endAt?.getHours() ?? Math.min(startHour + 1, 24);
}

function createWeekLabel(records: readonly WorkRecordModel[]) {
  const anchor = getLatestRecordDate(records) ?? new Date();
  const sunday = startOfWeekSunday(anchor);
  const saturday = addDays(sunday, 6);

  return `${formatMonthDay(sunday)} (${weekDayLabels[sunday.getDay()]}) ~ ${formatMonthDay(
    saturday,
  )} (${weekDayLabels[saturday.getDay()]})`;
}

function getLatestRecordDate(records: readonly WorkRecordModel[]) {
  return records
    .map(getRecordDate)
    .filter((date): date is Date => Boolean(date))
    .sort((first, second) => second.getTime() - first.getTime())[0] ?? null;
}

function getRecordDate(record: WorkRecordModel) {
  return parseDateKey(record.dateKey) ?? record.plannedStartAt ?? record.effectiveStartAt;
}

function getRecordDateKey(record: WorkRecordModel) {
  if (parseDateKey(record.dateKey)) {
    return record.dateKey;
  }

  const date = getRecordDate(record);

  return date ? formatDateKey(date) : "";
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate(),
  )}`;
}

function compareRecords(first: WorkRecordModel, second: WorkRecordModel) {
  return (
    getSortTime(second.plannedStartAt ?? parseDateKey(second.dateKey)) -
      getSortTime(first.plannedStartAt ?? parseDateKey(first.dateKey)) ||
    first.workerName.localeCompare(second.workerName, "ko-KR")
  );
}

function isRecordInWeek(record: WorkRecordModel, weekStartKey: string) {
  const date = getRecordDate(record);
  const weekStart = parseDateKey(weekStartKey);

  if (!date || !weekStart) {
    return false;
  }

  const nextWeekStart = addDays(weekStart, 7);

  return date >= weekStart && date < nextWeekStart;
}

function formatWeekLabelFromStartKey(weekStartKey: string) {
  const sunday = parseDateKey(weekStartKey);

  if (!sunday) {
    return weekStartKey || "-";
  }

  const saturday = addDays(sunday, 6);

  return `${formatMonthDay(sunday)} (${weekDayLabels[sunday.getDay()]}) ~ ${formatMonthDay(
    saturday,
  )} (${weekDayLabels[saturday.getDay()]})`;
}

function startOfWeekSunday(date: Date) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  next.setDate(next.getDate() - next.getDay());

  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  next.setDate(next.getDate() + days);

  return next;
}

function parseDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatRecordDate(value: string) {
  const date = parseDateKey(value);

  if (!date) {
    return value || "-";
  }

  return `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(
    date.getDate(),
  )}`;
}

function formatMonthDay(date: Date) {
  return `${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;
}

function formatShortDateTime(date: Date | null) {
  if (!date) {
    return "-";
  }

  return `${formatMonthDay(date)} ${formatTime(date)}`;
}

function formatTime(date: Date | null | undefined) {
  if (!date) {
    return "미기록";
  }

  return `${date.getHours()}:${pad2(date.getMinutes())}`;
}

function formatKoreanTime(date: Date | null | undefined) {
  if (!date) {
    return "미기록";
  }

  const hour = date.getHours();
  const period = hour < 12 ? "오전" : "오후";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${period} ${pad2(displayHour)}:${pad2(date.getMinutes())}`;
}

function getSortTime(date: Date | null | undefined) {
  return date?.getTime() ?? 0;
}

function detailLine(
  id: string,
  label: string,
  value: string,
  tone?: RecordsTone,
): RecordDetailLine {
  return {
    id,
    label,
    tone,
    value,
  };
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value ? value : fallback;
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function readBoolean(value: unknown) {
  return value === true;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readNullableRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
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

  if (typeof value === "object") {
    const record = value as {
      _seconds?: unknown;
      nanoseconds?: unknown;
      seconds?: unknown;
      toDate?: unknown;
    };

    if (typeof record.toDate === "function") {
      const date = record.toDate() as Date;

      return Number.isNaN(date.getTime()) ? null : date;
    }

    const seconds =
      typeof record.seconds === "number"
        ? record.seconds
        : typeof record._seconds === "number"
          ? record._seconds
          : null;

    if (seconds != null) {
      return new Date(seconds * 1000);
    }
  }

  return null;
}

function toMap<T, K extends string | null>(
  values: readonly T[],
  getKey: (value: T) => K,
) {
  const map = new Map<NonNullable<K>, T>();

  for (const value of values) {
    const key = getKey(value);

    if (key) {
      map.set(key as NonNullable<K>, value);
    }
  }

  return map;
}

function createStableId(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("ko-KR")
    .replace(/[^0-9a-z가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}
