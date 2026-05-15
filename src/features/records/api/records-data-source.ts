import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
  type DocumentReference,
  type WriteBatch,
} from "firebase/firestore";
// TODO(refactor): Before adding more record-processing behavior, split this
// data source into Firestore adapters, document mappers, record action writers,
// timeline/detail view-model builders, and date/status formatting helpers with
// pure tests around mapper and action-decision behavior.
import { resolveActiveWorkspaceId } from "@/entities/workspace";
import { readActiveWorkspaceId } from "@/entities/workspace";
import {
  getFirebaseAuth,
  getFirebaseDb,
  isMockFirebaseProject,
} from "@/shared/api/firebase/client";
import {
  anomalyHistoryFixtureViewModel,
  attendanceLogFixtureViewModel,
  correctionHistoryFixtureViewModel,
  overtimeHistoryFixtureViewModel,
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
  type OvertimeHistoryDetail,
  type OvertimeHistoryRow,
  type OvertimeHistoryStatus,
  type OvertimeHistoryViewModel,
  type RecordDetailAction,
  type RecordDetailLine,
  type RecordDetailLineSection,
  type RecordDetailState,
  type RecordDetailStateId,
  type RecordMainViewModel,
  type RecordOvertimeCreateCandidate,
  type RecordProcessingAction,
  type RecordsFilterOption,
  type RecordsMetricCard,
  type RecordsTone,
  type RecordTimelineBlock,
  type RecordTimelineBlockKind,
  type RecordTimelineDayId,
} from "../model/records-fixtures";
import {
  createAttendanceLogLineSection,
  createOvertimeLineSection,
  createRecordDetailLine as detailLine,
  createRecordLineSections,
} from "../model/record-detail-lines";

export type RecordsDataSource = {
  applyMainRecordAction: (input: RecordMainActionInput) => Promise<void>;
  createOvertimeWork: (input: RecordOvertimeCreateInput) => Promise<void>;
  getAnomalyHistory: () => Promise<AnomalyHistoryViewModel>;
  getAttendanceLogs: () => Promise<AttendanceLogViewModel>;
  getCorrections: () => Promise<CorrectionHistoryViewModel>;
  getMainRecords: () => Promise<RecordMainViewModel>;
  getOvertimeHistory: () => Promise<OvertimeHistoryViewModel>;
};

type PayrollEffect = "none" | "hold" | "immediate";
type AnomalyResolutionPayrollEffect =
  | "applied"
  | "hold"
  | "immediate"
  | "unchanged";
type OvertimePayMode = "fixed" | "hourly";

export type RecordMainActionInput = {
  action: RecordProcessingAction;
  amount?: number | null;
  endTime?: string;
  overtimePayMode?: OvertimePayMode | null;
  payrollEffect: PayrollEffect;
  reason: string;
  recordId: string;
  resolveAnomaly?: boolean;
  startTime?: string;
};

export type RecordOvertimeCreateInput = {
  endTime: string;
  reason: string;
  recordId: string;
  startTime: string;
};

type FirestoreDocument = {
  data: Record<string, unknown>;
  id: string;
};

type RecordsCollections = {
  anomalyFlags: readonly FirestoreDocument[];
  anomalyResolutions: readonly FirestoreDocument[];
  attendanceLogs: readonly FirestoreDocument[];
  bonusItems: readonly FirestoreDocument[];
  correctionRequests: readonly FirestoreDocument[];
  overtimeWorks: readonly FirestoreDocument[];
  payStatements: readonly FirestoreDocument[];
  payrollSettings: readonly FirestoreDocument[];
  payrollWorkerMonthRows: readonly FirestoreDocument[];
  workers: readonly FirestoreDocument[];
  workRecords: readonly FirestoreDocument[];
};

type WorkerModel = {
  id: string;
  name: string;
  status: string;
  membershipStatus: string;
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
  managerOnly: Record<string, unknown>;
  plannedEndAt: Date | null;
  plannedStartAt: Date | null;
  status: string;
  workerId: string;
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
  amount: number | null;
  approvedAt: Date | null;
  attendanceLogId: string | null;
  createdAt: Date | null;
  decidedAt: Date | null;
  extraEndAt: Date | null;
  extraStartAt: Date | null;
  id: string;
  managerNote: string;
  monthKey: string;
  payrollEffect: string;
  payrollPayMode: string;
  payrollStatus: string;
  reason: string;
  rejectedReason: string;
  status: string;
  submittedAt: Date | null;
  workRecordId: string | null;
  workerId: string;
  workerName: string;
};

type PayrollSettingModel = {
  effectiveFrom: string | null;
  hourlyRate: number | null;
  monthlySalary: number | null;
  payrollType: string;
  workerId: string;
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
  return (
    isMockFirebaseProject() || readActiveWorkspaceId() === "workspace_visual"
  );
}

function createFixtureRecordsDataSource(): RecordsDataSource {
  return {
    async applyMainRecordAction() {},
    async createOvertimeWork() {},
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
    async getOvertimeHistory() {
      return overtimeHistoryFixtureViewModel;
    },
  };
}

function createFirestoreRecordsDataSource(): RecordsDataSource {
  return {
    async applyMainRecordAction(input) {
      const workspaceId = await requireActiveWorkspaceId();
      const db = getFirebaseDb();
      const managerUid = getFirebaseAuth().currentUser?.uid ?? null;

      if (isOvertimeAction(input.action)) {
        await applyOvertimeMainRecordAction({
          db,
          input,
          managerUid,
          workspaceId,
        });
        return;
      }

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
      const monthKey = dateKey.slice(0, 7);
      const collections = await loadRecordsCollections();
      const payrollContext = getWorkerMonthPayrollContext(collections, {
        monthKey,
        workerId,
      });

      if (payrollContext.paid) {
        throw new Error("지급 완료된 월의 근무기록은 수정할 수 없습니다.");
      }

      const flag = collections.anomalyFlags.find(
        (item) => readString(item.data.workRecordId, "") === input.recordId,
      );
      const resolutionRef = doc(
        collection(db, "workspaces", workspaceId, "anomalyResolutions"),
      );
      const batch = writeBatch(db);
      const workRecordPayrollEffect: AnomalyResolutionPayrollEffect =
        input.action === "mark-normal" ? "unchanged" : "applied";

      if (isRecordEditAction(input.action)) {
        const change = queueRecordEditAction({
          batch,
          dateKey,
          db,
          flag,
          input,
          managerUid,
          payrollEffect: workRecordPayrollEffect,
          recordData,
          recordRef,
          resolutionId: resolutionRef.id,
          workspaceId,
        });

        batch.set(resolutionRef, {
          anomalyFlagId: flag?.id ?? null,
          createdAt: serverTimestamp(),
          decidedBy: managerUid,
          decision: getRecordActionDecision(input.action),
          managerNote: input.reason,
          payrollEffect: workRecordPayrollEffect,
          status: "completed",
          workRecordId: input.recordId,
          workerId,
          workspaceId,
        });

        if (change.notifyWorker) {
          queueWorkerNotification({
            batch,
            db,
            eventType: "work_record_changed",
            payload: {
              afterSnapshot: change.afterSnapshot,
              beforeSnapshot: change.beforeSnapshot,
              managerNote: input.reason,
              payrollEffect: workRecordPayrollEffect,
              targetFocusId: input.recordId,
              targetScreen: "worker_work_record_detail",
              workRecordId: input.recordId,
            },
            relatedEntityId: input.recordId,
            relatedEntityType: "workRecord",
            recipientId: workerId,
            workspaceId,
          });
        }

        if (change.affectsPayroll) {
          queueMonthlyRecordAdjustment({
            batch,
            collections,
            db,
            input,
            monthKey,
            newEndAt: change.newEndAt,
            newStartAt: change.newStartAt,
            recordData,
            sourceId: resolutionRef.id,
            workspaceId,
          });
          queueReconfirmationAlert({
            batch,
            db,
            reason: "근무기록 처리 후 산정 입력 변경",
            workspaceId,
            ...payrollContext,
          });
        }
      } else if (
        input.action === "approve-correction" ||
        input.action === "reject-correction"
      ) {
        queueCorrectionAction({
          batch,
          collections,
          dateKey,
          db,
          flag,
          input,
          managerUid,
          monthKey,
          payrollEffect: input.payrollEffect,
          payrollContext,
          recordData,
          recordRef,
          resolutionId: resolutionRef.id,
          workspaceId,
        });
      } else {
        throw new Error("지원하지 않는 근무기록 처리입니다.");
      }

      await batch.commit();
    },
    async createOvertimeWork(input) {
      await createFirestoreOvertimeWork(input);
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
    async getOvertimeHistory() {
      return mapOvertimeHistoryView(await loadRecordsCollections());
    },
  };
}

async function applyOvertimeMainRecordAction({
  db,
  input,
  managerUid,
  workspaceId,
}: {
  db: ReturnType<typeof getFirebaseDb>;
  input: RecordMainActionInput;
  managerUid: string | null;
  workspaceId: string;
}) {
  const collections = await loadRecordsCollections();
  const overtime = findSubmittedOvertimeForAction(collections, input.recordId);

  if (!overtime) {
    throw new Error("처리할 추가근무 신청을 찾을 수 없습니다.");
  }

  const overtimeModel = mapOvertimeWork(overtime);
  const attendance = overtimeModel.attendanceLogId
    ? collections.attendanceLogs.find(
        (item) => item.id === overtimeModel.attendanceLogId,
      ) ?? null
    : null;
  const attendanceModel = attendance ? mapAttendanceLog(attendance) : null;
  const linkedRecordId = overtimeModel.workRecordId;
  const linkedRecordRef = linkedRecordId
    ? doc(db, "workspaces", workspaceId, "workRecords", linkedRecordId)
    : null;
  const linkedRecordSnapshot = linkedRecordRef
    ? await getDoc(linkedRecordRef)
    : null;
  const recordRef =
    linkedRecordRef && linkedRecordSnapshot?.exists() ? linkedRecordRef : null;
  const recordData = linkedRecordSnapshot?.exists()
    ? (linkedRecordSnapshot.data() as Record<string, unknown>)
    : null;
  const workerId = overtimeModel.workerId || readString(recordData?.workerId, "");
  const monthKey = getOvertimeMonthKey(overtimeModel, attendanceModel);

  if (!workerId) {
    throw new Error("조교 정보를 확인할 수 없습니다.");
  }

  if (!monthKey) {
    throw new Error("추가근무 정산 월을 확인할 수 없습니다.");
  }

  const payrollContext = getWorkerMonthPayrollContext(collections, {
    monthKey,
    workerId,
  });

  if (payrollContext.paid) {
    throw new Error("지급 완료된 월의 추가근무는 수정할 수 없습니다.");
  }

  const batch = writeBatch(db);

  queueOvertimeAction({
    batch,
    db,
    input,
    managerUid,
    overtime,
    payrollContext,
    payrollEffect: input.payrollEffect,
    recordData,
    recordRef,
    workspaceId,
  });

  await batch.commit();
}

function isOvertimeAction(
  action: RecordMainActionInput["action"],
): action is "approve-overtime" | "reject-overtime" {
  return action === "approve-overtime" || action === "reject-overtime";
}

function findSubmittedOvertimeForAction(
  collections: RecordsCollections,
  targetId: string,
) {
  return (
    collections.overtimeWorks.find(
      (item) =>
        item.id === targetId &&
        readString(item.data.status, "submitted") === "submitted",
    ) ??
    collections.overtimeWorks.find(
      (item) =>
        readString(item.data.workRecordId, "") === targetId &&
        readString(item.data.status, "submitted") === "submitted",
    ) ??
    null
  );
}

function isVisibleTimelineOvertime(work: OvertimeWorkModel) {
  return work.status !== "rejected";
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
    payStatements,
    payrollWorkerMonthRows,
    payrollSettings,
    bonusItems,
    workers,
  ] = await Promise.all([
    readWorkspaceCollection(workspaceId, "workRecords"),
    readWorkspaceCollection(workspaceId, "anomalyFlags"),
    readWorkspaceCollection(workspaceId, "anomalyResolutions"),
    readWorkspaceCollection(workspaceId, "correctionRequests"),
    readWorkspaceCollection(workspaceId, "overtimeWorks"),
    readWorkspaceCollection(workspaceId, "attendanceLogs"),
    readWorkspaceCollection(workspaceId, "payStatements"),
    readWorkspaceCollection(workspaceId, "payrollWorkerMonthRows"),
    readWorkspaceCollection(workspaceId, "payrollSettings"),
    readWorkspaceCollection(workspaceId, "bonusItems"),
    readWorkspaceCollection(workspaceId, "workers"),
  ]);

  return {
    anomalyFlags,
    anomalyResolutions,
    attendanceLogs,
    bonusItems,
    correctionRequests,
    overtimeWorks,
    payStatements,
    payrollSettings,
    payrollWorkerMonthRows,
    workers,
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

async function createFirestoreOvertimeWork(input: RecordOvertimeCreateInput) {
  if (!input.reason.trim()) {
    throw new Error("추가근무 사유를 입력해 주세요.");
  }

  const workspaceId = await requireActiveWorkspaceId();
  const db = getFirebaseDb();
  const managerUid = getFirebaseAuth().currentUser?.uid ?? null;

  if (!managerUid) {
    throw new Error("관리자 세션을 확인할 수 없습니다.");
  }

  const recordRef = doc(
    db,
    "workspaces",
    workspaceId,
    "workRecords",
    input.recordId,
  );
  const recordSnapshot = await getDoc(recordRef);

  if (!recordSnapshot.exists()) {
    throw new Error("연결할 출퇴근 기록을 찾을 수 없습니다.");
  }

  const recordData = recordSnapshot.data() as Record<string, unknown>;
  const dateKey = readString(
    recordData.dateKey,
    readString(recordData.date, ""),
  );
  const workerId = readString(recordData.workerId, "");
  const workerName = readString(recordData.workerName, "");
  const attendanceLogId = readNullableString(recordData.attendanceLogId);
  const { endAt, startAt } = parseOvertimeCreateTimestamps({
    dateKey,
    endTime: input.endTime,
    startTime: input.startTime,
  });
  const monthKey = formatDateKey(startAt).slice(0, 7);
  const collections = await loadRecordsCollections();
  const payrollContext = getWorkerMonthPayrollContext(collections, {
    monthKey,
    workerId,
  });
  const payrollSetting =
    findPayrollSettingForMonth(
      collections.payrollSettings.map(mapPayrollSetting),
      workerId,
      monthKey,
    ) ?? null;
  const payrollPayMode = getManagerCreatedOvertimePayMode(payrollSetting);

  if (payrollContext.paid) {
    throw new Error("지급 완료된 월에는 추가근무를 등록할 수 없습니다.");
  }

  if (!workerId) {
    throw new Error("조교 정보를 확인할 수 없습니다.");
  }

  if (!attendanceLogId) {
    throw new Error("연결된 출퇴근 기록이 없어 추가근무를 등록할 수 없습니다.");
  }

  const attendanceLog = collections.attendanceLogs.find(
    (item) => item.id === attendanceLogId,
  );

  if (!attendanceLog) {
    throw new Error("연결된 출퇴근 기록을 찾을 수 없습니다.");
  }

  const existingActiveOvertime = collections.overtimeWorks.find((item) => {
    const status = readString(item.data.status, "submitted");
    const sameRecord =
      readString(item.data.workRecordId, "") === input.recordId ||
      readString(item.data.attendanceLogId, "") === attendanceLogId;

    return sameRecord && status !== "rejected" && status !== "withdrawn";
  });

  if (existingActiveOvertime) {
    throw new Error("이미 등록된 추가근무가 있습니다.");
  }

  const batch = writeBatch(db);
  const overtimeRef = doc(
    collection(db, "workspaces", workspaceId, "overtimeWorks"),
  );
  const extraStartAt = Timestamp.fromDate(startAt);
  const extraEndAt = Timestamp.fromDate(endAt);

  batch.set(overtimeRef, {
    amount: null,
    approvedAt: serverTimestamp(),
    attendanceLogId,
    createdAt: serverTimestamp(),
    decidedAt: serverTimestamp(),
    decidedBy: managerUid,
    extraEndAt,
    extraStartAt,
    managerNote: null,
    monthKey,
    payrollEffect: "immediate",
    payrollPayMode,
    payrollStatus: "confirmed",
    reason: input.reason.trim(),
    rejectedReason: null,
    status: "approved",
    submittedAt: null,
    updatedAt: serverTimestamp(),
    workRecordId: input.recordId,
    workerId,
    workerName,
    workspaceId,
  });
  batch.update(recordRef, {
    hasPendingOvertime: false,
    updatedAt: serverTimestamp(),
  });
  queueWorkerNotification({
    batch,
    db,
    eventType: "overtime_registered_by_manager",
    payload: {
      endTime: input.endTime,
      managerNote: input.reason.trim(),
      overtimeWorkId: overtimeRef.id,
      startTime: input.startTime,
      targetFocusId: input.recordId,
      targetScreen: "worker_work_record_detail",
    },
    relatedEntityId: overtimeRef.id,
    relatedEntityType: "overtimeWork",
    recipientId: workerId,
    workspaceId,
  });
  queueReconfirmationAlert({
    batch,
    db,
    reason: "관리자 추가근무 확정 등록",
    workspaceId,
    ...payrollContext,
  });

  await batch.commit();
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

function parseRecordActionTimestamp(
  dateKey: string,
  timeValue: string | undefined,
) {
  const date = parseDateKeyTime(dateKey, timeValue);

  if (!date) {
    return null;
  }

  return Timestamp.fromDate(date);
}

function parseDateKeyTime(dateKey: string, timeValue: string | undefined) {
  if (!dateKey || !timeValue || !timeValue.match(/^\d{2}:\d{2}$/)) {
    return null;
  }

  const date = new Date(`${dateKey}T${timeValue}:00+09:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function parseOvertimeCreateTimestamps({
  dateKey,
  endTime,
  startTime,
}: {
  dateKey: string;
  endTime: string;
  startTime: string;
}) {
  const startAt = parseDateKeyTime(dateKey, startTime);
  const endAt = parseDateKeyTime(dateKey, endTime);

  if (!startAt || !endAt) {
    throw new Error("추가근무 시작과 종료 시각을 입력해 주세요.");
  }

  if (endAt.getTime() === startAt.getTime()) {
    throw new Error("추가근무 종료 시각은 시작 시각과 달라야 합니다.");
  }

  if (endAt < startAt) {
    endAt.setDate(endAt.getDate() + 1);
  }

  return { endAt, startAt };
}

function isRecordEditAction(
  action: RecordProcessingAction,
): action is "delete" | "edit" | "mark-normal" {
  return action === "delete" || action === "edit" || action === "mark-normal";
}

function queueRecordEditAction({
  batch,
  dateKey,
  db,
  flag,
  input,
  managerUid,
  payrollEffect,
  recordData,
  recordRef,
  resolutionId,
  workspaceId,
}: {
  batch: WriteBatch;
  dateKey: string;
  db: ReturnType<typeof getFirebaseDb>;
  flag?: FirestoreDocument;
  input: RecordMainActionInput;
  managerUid: string | null;
  payrollEffect: AnomalyResolutionPayrollEffect;
  recordData: Record<string, unknown>;
  recordRef: DocumentReference;
  resolutionId: string;
  workspaceId: string;
}) {
  if (input.action === "edit" && !input.reason.trim()) {
    throw new Error("수정 사유를 입력해 주세요.");
  }

  const beforeSnapshot = createWorkerSafeRecordSnapshot(recordData, {
    changeType: "before",
  });
  const recordUpdate: Record<string, unknown> = {
    "managerOnly.anomalyResolutionId": resolutionId,
    "managerOnly.payrollApplication": payrollEffect,
    "managerOnly.reviewedBy": managerUid,
    hasUnresolvedAnomaly: false,
    status: input.action === "delete" ? "deleted" : "resolved",
    updatedAt: serverTimestamp(),
  };
  let newStartAt = getRecordStartDate(recordData);
  let newEndAt = getRecordEndDate(recordData);

  if (input.action === "edit") {
    const effectiveStartAt = parseRecordActionTimestamp(
      dateKey,
      input.startTime,
    );
    const effectiveEndAt = parseRecordActionTimestamp(dateKey, input.endTime);

    if (effectiveStartAt) {
      recordUpdate.effectiveStartAt = effectiveStartAt;
      newStartAt = effectiveStartAt.toDate();
    }

    if (effectiveEndAt) {
      recordUpdate.effectiveEndAt = effectiveEndAt;
      newEndAt = effectiveEndAt.toDate();
    }
  }

  if (input.action === "delete") {
    recordUpdate.deletedAt = serverTimestamp();
    newStartAt = null;
    newEndAt = null;
  }

  batch.update(recordRef, recordUpdate);

  if (flag) {
    batch.update(doc(db, "workspaces", workspaceId, "anomalyFlags", flag.id), {
      resolvedAt: serverTimestamp(),
      status: "resolved",
      updatedAt: serverTimestamp(),
    });
  }

  const afterSnapshot = createWorkerSafeRecordSnapshot(
    {
      ...recordData,
      effectiveStartAt: newStartAt ? Timestamp.fromDate(newStartAt) : null,
      effectiveEndAt: newEndAt ? Timestamp.fromDate(newEndAt) : null,
      status: input.action === "delete" ? "deleted" : "resolved",
    },
    {
      changeReason: input.reason,
      changeType: input.action === "delete" ? "deleted" : "modified",
    },
  );

  return {
    affectsPayroll: input.action === "delete" || input.action === "edit",
    afterSnapshot,
    beforeSnapshot,
    newEndAt,
    newStartAt,
    notifyWorker: input.action === "delete" || input.action === "edit",
  };
}

function queueCorrectionAnomalyResolution({
  batch,
  db,
  decision,
  flag,
  managerNote,
  managerUid,
  payrollEffect,
  recordId,
  resolutionId,
  workerId,
  workspaceId,
}: {
  batch: WriteBatch;
  db: ReturnType<typeof getFirebaseDb>;
  decision: "mark_normal" | "modify_record";
  flag?: FirestoreDocument;
  managerNote: string;
  managerUid: string | null;
  payrollEffect: AnomalyResolutionPayrollEffect;
  recordId: string;
  resolutionId: string;
  workerId: string;
  workspaceId: string;
}): Record<string, unknown> {
  if (!isUnresolvedFlagDocument(flag)) {
    return {};
  }

  batch.update(doc(db, "workspaces", workspaceId, "anomalyFlags", flag.id), {
    resolvedAt: serverTimestamp(),
    status: "resolved",
    updatedAt: serverTimestamp(),
  });
  batch.set(
    doc(db, "workspaces", workspaceId, "anomalyResolutions", resolutionId),
    {
      anomalyFlagId: flag.id,
      createdAt: serverTimestamp(),
      decidedBy: managerUid,
      decision,
      managerNote,
      payrollEffect,
      status: "completed",
      workRecordId: recordId,
      workerId,
      workspaceId,
    },
  );

  return {
    "managerOnly.anomalyResolutionId": resolutionId,
    "managerOnly.payrollApplication": payrollEffect,
    "managerOnly.reviewedBy": managerUid,
    hasUnresolvedAnomaly: false,
    status: "resolved",
  };
}

function isUnresolvedFlagDocument(
  flag?: FirestoreDocument,
): flag is FirestoreDocument {
  return Boolean(
    flag && readString(flag.data.status, "unresolved") === "unresolved",
  );
}

function queueCorrectionAction({
  batch,
  collections,
  dateKey,
  db,
  flag,
  input,
  managerUid,
  monthKey,
  payrollEffect,
  payrollContext,
  recordData,
  recordRef,
  resolutionId,
  workspaceId,
}: {
  batch: WriteBatch;
  collections: RecordsCollections;
  dateKey: string;
  db: ReturnType<typeof getFirebaseDb>;
  flag?: FirestoreDocument;
  input: RecordMainActionInput;
  managerUid: string | null;
  monthKey: string;
  payrollEffect: PayrollEffect;
  payrollContext: WorkerMonthPayrollContext;
  recordData: Record<string, unknown>;
  recordRef: DocumentReference;
  resolutionId: string;
  workspaceId: string;
}) {
  const request = collections.correctionRequests.find(
    (item) =>
      readString(item.data.workRecordId, "") === input.recordId &&
      readString(item.data.status, "submitted") === "submitted",
  );

  if (!request) {
    throw new Error("처리할 이의신청을 찾을 수 없습니다.");
  }

  const requestRef = doc(
    db,
    "workspaces",
    workspaceId,
    "correctionRequests",
    request.id,
  );
  const workerId = readString(
    request.data.workerId,
    readString(recordData.workerId, ""),
  );
  const beforeRequestSnapshot = readRecord(request.data.beforeSnapshot);
  const afterRequestSnapshot = readRecord(request.data.afterSnapshot);

  if (input.action === "reject-correction") {
    if (!input.reason.trim()) {
      throw new Error("반려 사유를 입력해 주세요.");
    }

    batch.update(requestRef, {
      decidedAt: serverTimestamp(),
      decidedBy: managerUid,
      managerNote: input.reason,
      payrollEffect: "none",
      payrollStatus: "none",
      rejectedReason: input.reason,
      status: "rejected",
      updatedAt: serverTimestamp(),
    });
    const recordUpdate: Record<string, unknown> = {
      hasPendingCorrection: false,
      updatedAt: serverTimestamp(),
    };

    if (input.resolveAnomaly) {
      Object.assign(
        recordUpdate,
        queueCorrectionAnomalyResolution({
          batch,
          db,
          decision: "mark_normal",
          flag,
          managerNote: input.reason,
          managerUid,
          payrollEffect: "unchanged",
          recordId: input.recordId,
          resolutionId,
          workerId,
          workspaceId,
        }),
      );
    }

    batch.update(recordRef, recordUpdate);
    queueWorkerNotification({
      batch,
      db,
      eventType: "correction_rejected",
      payload: {
        correctionRequestId: request.id,
        reason: input.reason,
        targetFocusId: input.recordId,
        targetScreen: "worker_work_record_detail",
      },
      relatedEntityId: request.id,
      relatedEntityType: "correctionRequest",
      recipientId: workerId,
      workspaceId,
    });

    return;
  }

  if (
    isCorrectionSnapshotForOvertime(beforeRequestSnapshot, afterRequestSnapshot)
  ) {
    const overtime = findCorrectionOvertimeDocument(
      collections,
      request,
      input.recordId,
    );

    if (!overtime) {
      throw new Error("이의신청과 연결된 추가근무를 찾을 수 없습니다.");
    }

    const overtimeRef = doc(
      db,
      "workspaces",
      workspaceId,
      "overtimeWorks",
      overtime.id,
    );
    const nextExtraStartAt = resolveActionTimestamp({
      dateKey,
      fallback:
        readDate(afterRequestSnapshot.extraStartAt) ??
        readDate(afterRequestSnapshot.overtimeStartAt) ??
        readDate(overtime.data.extraStartAt) ??
        getRecordStartDate(recordData),
      timeValue: input.startTime,
    });
    const nextExtraEndAt = resolveActionTimestamp({
      dateKey,
      fallback:
        readDate(afterRequestSnapshot.extraEndAt) ??
        readDate(afterRequestSnapshot.overtimeEndAt) ??
        readDate(overtime.data.extraEndAt) ??
        getRecordEndDate(recordData),
      timeValue: input.endTime,
    });
    const payMode = getConfirmedOvertimePayMode(input);
    const fixedAmount = getConfirmedOvertimeFixedAmount(input, payMode);
    const payrollStatus = getOvertimePayrollStatus(payrollEffect);

    batch.update(overtimeRef, {
      amount: fixedAmount,
      decidedAt: serverTimestamp(),
      decidedBy: managerUid,
      extraEndAt: toTimestampOrNull(nextExtraEndAt),
      extraStartAt: toTimestampOrNull(nextExtraStartAt),
      managerNote: input.reason,
      payrollEffect,
      payrollPayMode: payMode,
      payrollStatus,
      status: "approved",
      updatedAt: serverTimestamp(),
    });
    const recordUpdate: Record<string, unknown> = {
      hasPendingCorrection: false,
      updatedAt: serverTimestamp(),
    };
    Object.assign(
      recordUpdate,
      queueCorrectionAnomalyResolution({
        batch,
        db,
        decision: "mark_normal",
        flag,
        managerNote: input.reason,
        managerUid,
        payrollEffect: "unchanged",
        recordId: input.recordId,
        resolutionId,
        workerId,
        workspaceId,
      }),
    );

    batch.update(recordRef, recordUpdate);
    batch.update(requestRef, {
      amount: fixedAmount,
      afterSnapshot: {
        ...afterRequestSnapshot,
        changeReason: input.reason || null,
        changeType: "modified",
        extraEndAt: toTimestampOrNull(nextExtraEndAt),
        extraStartAt: toTimestampOrNull(nextExtraStartAt),
        overtimeWorkId: overtime.id,
        targetType: "overtime",
      },
      decidedAt: serverTimestamp(),
      decidedBy: managerUid,
      managerNote: input.reason,
      overtimeWorkId: overtime.id,
      payrollEffect,
      payrollPayMode: payMode,
      payrollStatus,
      status: "approved",
      targetType: "overtime",
      updatedAt: serverTimestamp(),
    });
    queueWorkerNotification({
      batch,
      db,
      eventType: "correction_approved",
      payload: {
        amount: fixedAmount,
        correctionRequestId: request.id,
        managerNote: input.reason,
        overtimePayMode: payMode,
        overtimeWorkId: overtime.id,
        payrollEffect,
        targetFocusId: input.recordId,
        targetScreen: "worker_work_record_detail",
        targetType: "overtime",
      },
      relatedEntityId: request.id,
      relatedEntityType: "correctionRequest",
      recipientId: workerId,
      workspaceId,
    });

    if (payrollEffect === "immediate") {
      queueReconfirmationAlert({
        batch,
        db,
        reason: "추가근무 이의신청 승인 후 산정 입력 변경",
        workspaceId,
        ...payrollContext,
      });
    }

    return;
  }

  const regularPayrollInput: RecordMainActionInput = {
    ...input,
    payrollEffect: "immediate",
  };
  const nextStartAt = resolveActionTimestamp({
    dateKey,
    fallback:
      readDate(afterRequestSnapshot.effectiveStartAt) ??
      readDate(afterRequestSnapshot.plannedStartAt) ??
      getRecordStartDate(recordData),
    timeValue: input.startTime,
  });
  const nextEndAt = resolveActionTimestamp({
    dateKey,
    fallback:
      readDate(afterRequestSnapshot.effectiveEndAt) ??
      readDate(afterRequestSnapshot.plannedEndAt) ??
      getRecordEndDate(recordData),
    timeValue: input.endTime,
  });
  const recordUpdate: Record<string, unknown> = {
    "managerOnly.correctionRequestId": request.id,
    "managerOnly.payrollApplication": "applied",
    "managerOnly.reviewedBy": managerUid,
    hasPendingCorrection: false,
    hasUnresolvedAnomaly: false,
    status: "resolved",
    updatedAt: serverTimestamp(),
  };
  Object.assign(
    recordUpdate,
    queueCorrectionAnomalyResolution({
      batch,
      db,
      decision: "modify_record",
      flag,
      managerNote: input.reason,
      managerUid,
      payrollEffect: "applied",
      recordId: input.recordId,
      resolutionId,
      workerId,
      workspaceId,
    }),
  );

  if (nextStartAt) {
    recordUpdate.effectiveStartAt = Timestamp.fromDate(nextStartAt);
  }

  if (nextEndAt) {
    recordUpdate.effectiveEndAt = Timestamp.fromDate(nextEndAt);
  }

  const afterSnapshot = createWorkerSafeRecordSnapshot(
    {
      ...recordData,
      effectiveEndAt: nextEndAt ? Timestamp.fromDate(nextEndAt) : null,
      effectiveStartAt: nextStartAt ? Timestamp.fromDate(nextStartAt) : null,
      status: "resolved",
    },
    {
      changeReason: input.reason,
      changeType: "modified",
    },
  );

  batch.update(recordRef, recordUpdate);
  batch.update(requestRef, {
    afterSnapshot,
    decidedAt: serverTimestamp(),
    decidedBy: managerUid,
    managerNote: input.reason,
    payrollEffect: "applied",
    payrollStatus: "applied",
    status: "approved",
    updatedAt: serverTimestamp(),
  });
  queueWorkerNotification({
    batch,
    db,
    eventType: "correction_approved",
    payload: {
      correctionRequestId: request.id,
      managerNote: input.reason,
      payrollEffect: "applied",
      targetFocusId: input.recordId,
      targetScreen: "worker_work_record_detail",
    },
    relatedEntityId: request.id,
    relatedEntityType: "correctionRequest",
    recipientId: workerId,
    workspaceId,
  });
  queueMonthlyRecordAdjustment({
    batch,
    collections,
    db,
    input: regularPayrollInput,
    monthKey,
    newEndAt: nextEndAt,
    newStartAt: nextStartAt,
    recordData,
    sourceId: request.id,
    workspaceId,
  });
  queueReconfirmationAlert({
    batch,
    db,
    reason: "이의신청 승인 후 산정 입력 변경",
    workspaceId,
    ...payrollContext,
  });
}

function queueOvertimeAction({
  batch,
  db,
  input,
  managerUid,
  overtime,
  payrollEffect,
  payrollContext,
  recordData,
  recordRef,
  workspaceId,
}: {
  batch: WriteBatch;
  db: ReturnType<typeof getFirebaseDb>;
  input: RecordMainActionInput;
  managerUid: string | null;
  overtime: FirestoreDocument;
  payrollEffect: PayrollEffect;
  payrollContext: WorkerMonthPayrollContext;
  recordData: Record<string, unknown> | null;
  recordRef: DocumentReference | null;
  workspaceId: string;
}) {
  const overtimeRef = doc(
    db,
    "workspaces",
    workspaceId,
    "overtimeWorks",
    overtime.id,
  );
  const workerId = readString(
    overtime.data.workerId,
    readString(recordData?.workerId, ""),
  );
  const targetFocusId = readString(
    overtime.data.workRecordId,
    overtime.id,
  );

  if (input.action === "reject-overtime") {
    batch.update(overtimeRef, {
      decidedAt: serverTimestamp(),
      decidedBy: managerUid,
      payrollEffect: "none",
      payrollStatus: "none",
      rejectedReason: input.reason || null,
      status: "rejected",
      updatedAt: serverTimestamp(),
    });

    if (recordRef) {
      batch.update(recordRef, {
        hasPendingOvertime: false,
        updatedAt: serverTimestamp(),
      });
    }

    queueWorkerNotification({
      batch,
      db,
      eventType: "overtime_rejected",
      payload: {
        overtimeWorkId: overtime.id,
        reason: input.reason,
        targetFocusId,
        targetScreen: "worker_work_record_detail",
      },
      relatedEntityId: overtime.id,
      relatedEntityType: "overtimeWork",
      recipientId: workerId,
      workspaceId,
    });

    return;
  }

  const payMode = getConfirmedOvertimePayMode(input);
  const fixedAmount = getConfirmedOvertimeFixedAmount(input, payMode);
  const payrollStatus = getOvertimePayrollStatus(payrollEffect);

  batch.update(overtimeRef, {
    amount: fixedAmount,
    approvedAt: serverTimestamp(),
    decidedAt: serverTimestamp(),
    decidedBy: managerUid,
    managerNote: input.reason,
    payrollEffect,
    payrollPayMode: payMode,
    payrollStatus,
    status: "approved",
    updatedAt: serverTimestamp(),
  });

  if (recordRef) {
    batch.update(recordRef, {
      hasPendingOvertime: false,
      updatedAt: serverTimestamp(),
    });
  }

  queueWorkerNotification({
    batch,
    db,
    eventType: "overtime_approved",
    payload: {
      amount: fixedAmount,
      overtimePayMode: payMode,
      overtimeWorkId: overtime.id,
      payrollEffect,
      targetFocusId,
      targetScreen: "worker_work_record_detail",
    },
    relatedEntityId: overtime.id,
    relatedEntityType: "overtimeWork",
    recipientId: workerId,
    workspaceId,
  });
  if (payrollEffect === "immediate") {
    queueReconfirmationAlert({
      batch,
      db,
      reason: "추가근무 승인 후 산정 입력 변경",
      workspaceId,
      ...payrollContext,
    });
  }
}

function getOvertimePayrollStatus(effect: PayrollEffect) {
  if (effect === "hold") {
    return "held";
  }

  if (effect === "none") {
    return "none";
  }

  return "confirmed";
}

function getManagerCreatedOvertimePayMode(
  payrollSetting: PayrollSettingModel | null,
): OvertimePayMode | null {
  return payrollSetting?.payrollType === "hourly" &&
    payrollSetting.hourlyRate != null
    ? "hourly"
    : null;
}

function getConfirmedOvertimePayMode(input: RecordMainActionInput) {
  if (input.payrollEffect !== "immediate") {
    return null;
  }

  return input.overtimePayMode === "hourly" ? "hourly" : "fixed";
}

function getConfirmedOvertimeFixedAmount(
  input: RecordMainActionInput,
  payMode: OvertimePayMode | null,
) {
  if (input.payrollEffect !== "immediate" || payMode !== "fixed") {
    return null;
  }

  if (!input.amount || input.amount <= 0) {
    throw new Error("고정급 지급액을 입력해 주세요.");
  }

  return input.amount;
}

function findCorrectionOvertimeDocument(
  collections: RecordsCollections,
  request: FirestoreDocument,
  workRecordId: string,
) {
  const beforeSnapshot = readRecord(request.data.beforeSnapshot);
  const afterSnapshot = readRecord(request.data.afterSnapshot);
  const overtimeIds = [
    readNullableString(request.data.overtimeWorkId),
    readNullableString(beforeSnapshot.overtimeWorkId),
    readNullableString(afterSnapshot.overtimeWorkId),
    readNullableString(beforeSnapshot.overtimeId),
    readNullableString(afterSnapshot.overtimeId),
  ].filter((id): id is string => Boolean(id));

  return (
    collections.overtimeWorks.find((item) => overtimeIds.includes(item.id)) ??
    collections.overtimeWorks.find(
      (item) => readString(item.data.workRecordId, "") === workRecordId,
    ) ??
    null
  );
}

function isCorrectionSnapshotForOvertime(
  beforeSnapshot: Record<string, unknown>,
  afterSnapshot: Record<string, unknown>,
) {
  const snapshots = [beforeSnapshot, afterSnapshot];
  const explicitTarget = snapshots.some((snapshot) =>
    Boolean(
      readNullableString(snapshot.overtimeWorkId) ||
      readNullableString(snapshot.overtimeId),
    ),
  );
  const overtimeTimeChange = snapshots.some((snapshot) =>
    Boolean(
      readDate(snapshot.extraStartAt) ||
      readDate(snapshot.extraEndAt) ||
      readDate(snapshot.overtimeStartAt) ||
      readDate(snapshot.overtimeEndAt),
    ),
  );
  const targetType = snapshots
    .map((snapshot) =>
      [
        readString(snapshot.targetType, ""),
        readString(snapshot.recordType, ""),
        readString(snapshot.workType, ""),
        readString(snapshot.kind, ""),
      ].join(" "),
    )
    .join(" ")
    .toLowerCase();

  return (
    explicitTarget ||
    overtimeTimeChange ||
    targetType.includes("overtime") ||
    targetType.includes("추가")
  );
}

type WorkerMonthPayrollContext = {
  paid: boolean;
  row: FirestoreDocument | null;
  statement: FirestoreDocument | null;
};

function getWorkerMonthPayrollContext(
  collections: RecordsCollections,
  target: { monthKey: string; workerId: string },
): WorkerMonthPayrollContext {
  const statement =
    collections.payStatements.find(
      (item) =>
        readString(item.data.workerId, "") === target.workerId &&
        readString(item.data.monthKey, "") === target.monthKey,
    ) ?? null;
  const row =
    collections.payrollWorkerMonthRows.find(
      (item) =>
        readString(item.data.workerId, "") === target.workerId &&
        readString(item.data.monthKey, "") === target.monthKey,
    ) ?? null;
  const paid =
    readString(statement?.data.status, "") === "paid" ||
    readString(row?.data.rowStatus, "") === "paid";

  return { paid, row, statement };
}

function queueReconfirmationAlert({
  batch,
  db,
  reason,
  row,
  statement,
  workspaceId,
}: WorkerMonthPayrollContext & {
  batch: WriteBatch;
  db: ReturnType<typeof getFirebaseDb>;
  reason: string;
  workspaceId: string;
}) {
  const statementProcessing =
    readString(statement?.data.status, "") === "processing";
  const rowStatus = readString(row?.data.rowStatus, "");
  const rowProcessing =
    rowStatus === "processing" || rowStatus === "needs_reconfirmation";

  if (!statementProcessing && !rowProcessing) {
    return;
  }

  if (statement) {
    batch.set(
      doc(db, "workspaces", workspaceId, "payStatements", statement.id),
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
      doc(db, "workspaces", workspaceId, "payrollWorkerMonthRows", row.id),
      {
        rowStatus: "needs_reconfirmation",
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
}

function queueMonthlyRecordAdjustment({
  batch,
  collections,
  db,
  input,
  monthKey,
  newEndAt,
  newStartAt,
  recordData,
  sourceId,
  workspaceId,
}: {
  batch: WriteBatch;
  collections: RecordsCollections;
  db: ReturnType<typeof getFirebaseDb>;
  input: RecordMainActionInput;
  monthKey: string;
  newEndAt: Date | null;
  newStartAt: Date | null;
  recordData: Record<string, unknown>;
  sourceId: string;
  workspaceId: string;
}) {
  if (input.payrollEffect !== "immediate") {
    return;
  }

  const workerId = readString(recordData.workerId, "");
  const setting = findPayrollSettingForMonth(
    collections.payrollSettings.map(mapPayrollSetting),
    workerId,
    monthKey,
  );

  if (
    setting?.payrollType !== "monthly" ||
    setting.monthlySalary == null ||
    setting.monthlySalary <= 0
  ) {
    return;
  }

  const originalMinutes = getRecordDurationMinutes(recordData);
  const nextMinutes =
    input.action === "delete" ? 0 : getDurationMinutes(newStartAt, newEndAt);
  const reducedMinutes = Math.max(originalMinutes - nextMinutes, 0);

  if (reducedMinutes <= 0) {
    return;
  }

  const totalMonthMinutes = collections.workRecords
    .filter(
      (item) =>
        readString(item.data.workerId, "") === workerId &&
        readString(item.data.dateKey, readString(item.data.date, "")).slice(
          0,
          7,
        ) === monthKey &&
        readString(item.data.status, "") !== "deleted",
    )
    .reduce((total, item) => total + getRecordDurationMinutes(item.data), 0);

  if (totalMonthMinutes <= 0) {
    return;
  }

  const amount = -Math.round(
    setting.monthlySalary * (reducedMinutes / totalMonthMinutes),
  );

  if (amount >= 0) {
    return;
  }

  const adjustmentRef = doc(
    db,
    "workspaces",
    workspaceId,
    "bonusItems",
    `bonus_record_adjustment_${sourceId}`,
  );
  const dutyName = readString(recordData.dutyName, "근무기록");
  const label =
    input.action === "delete"
      ? `${dutyName} 결근 차감`
      : `${dutyName} 근무기록 차감`;

  batch.set(adjustmentRef, {
    amount,
    createdAt: serverTimestamp(),
    createdBy: getFirebaseAuth().currentUser?.uid ?? null,
    label,
    monthKey,
    payrollStatus: "confirmed",
    sourceType: "work_record_adjustment",
    sourceWorkRecordId: input.recordId,
    taxScope: "post_tax",
    updatedAt: serverTimestamp(),
    workerId,
    workerName: readString(recordData.workerName, ""),
    workspaceId,
  });
}

function queueWorkerNotification({
  batch,
  db,
  eventType,
  payload,
  recipientId,
  relatedEntityId,
  relatedEntityType,
  workspaceId,
}: {
  batch: WriteBatch;
  db: ReturnType<typeof getFirebaseDb>;
  eventType: string;
  payload: Record<string, unknown>;
  recipientId: string;
  relatedEntityId: string;
  relatedEntityType: string;
  workspaceId: string;
}) {
  if (!recipientId) {
    return;
  }

  const notificationRef = doc(
    collection(db, "workspaces", workspaceId, "notifications"),
  );

  batch.set(notificationRef, {
    channel: "fcm",
    createdAt: serverTimestamp(),
    deliveryStatus: "stored",
    eventType,
    payload,
    readAt: null,
    recipientId,
    recipientRole: "worker",
    relatedEntityId,
    relatedEntityType,
    workspaceId,
  });
}

function resolveActionTimestamp({
  dateKey,
  fallback,
  timeValue,
}: {
  dateKey: string;
  fallback: Date | null;
  timeValue?: string;
}) {
  return parseRecordActionTimestamp(dateKey, timeValue)?.toDate() ?? fallback;
}

function createWorkerSafeRecordSnapshot(
  data: Record<string, unknown>,
  options: {
    changeReason?: string;
    changeType: string;
  },
) {
  return {
    changeReason: options.changeReason ?? null,
    changeType: options.changeType,
    dateKey: readString(data.dateKey, readString(data.date, "")),
    dutyName: readString(data.dutyName, "근무기록"),
    effectiveEndAt: toTimestampOrNull(readDate(data.effectiveEndAt)),
    effectiveStartAt: toTimestampOrNull(readDate(data.effectiveStartAt)),
    plannedEndAt: toTimestampOrNull(readDate(data.plannedEndAt)),
    plannedStartAt: toTimestampOrNull(readDate(data.plannedStartAt)),
    status: readString(data.status, ""),
  };
}

function toTimestampOrNull(date: Date | null) {
  return date ? Timestamp.fromDate(date) : null;
}

function getRecordStartDate(data: Record<string, unknown>) {
  return readDate(data.effectiveStartAt) ?? readDate(data.plannedStartAt);
}

function getRecordEndDate(data: Record<string, unknown>) {
  return readDate(data.effectiveEndAt) ?? readDate(data.plannedEndAt);
}

function getRecordDurationMinutes(data: Record<string, unknown>) {
  return getDurationMinutes(getRecordStartDate(data), getRecordEndDate(data));
}

function getDurationMinutes(start: Date | null, end: Date | null) {
  if (!start || !end) {
    return 0;
  }

  return Math.max(Math.round((end.getTime() - start.getTime()) / 60000), 0);
}

function mapPayrollSetting(document: FirestoreDocument): PayrollSettingModel {
  const data = document.data;

  return {
    effectiveFrom: readNullableString(data.effectiveFrom),
    hourlyRate: readNullableNumber(data.hourlyRate),
    monthlySalary: readNullableNumber(data.monthlySalary),
    payrollType: readString(data.payrollType, "hourly"),
    workerId: readString(data.workerId, ""),
  };
}

function findPayrollSettingForMonth(
  settings: readonly PayrollSettingModel[],
  workerId: string,
  monthKey: string,
) {
  const monthEndKey = getMonthEndDateKey(monthKey);

  return settings
    .filter(
      (setting) =>
        setting.workerId === workerId &&
        (!setting.effectiveFrom || setting.effectiveFrom <= monthEndKey),
    )
    .sort((left, right) =>
      (right.effectiveFrom ?? "").localeCompare(left.effectiveFrom ?? ""),
    )[0];
}

function getMonthEndDateKey(monthKey: string) {
  const [year = "2026", month = "04"] = monthKey.split("-");
  const lastDay = new Date(Number(year), Number(month), 0).getDate();

  return `${year}-${month.padStart(2, "0")}-${pad2(lastDay)}`;
}

function mapRecordMainView(
  collections: RecordsCollections,
): RecordMainViewModel {
  const records = collections.workRecords
    .map(mapWorkRecord)
    .sort(compareRecords);
  const recordsById = toMap(records, (record) => record.id);
  const activeWorkers = collections.workers
    .map(mapWorker)
    .filter(isActiveWorker)
    .sort(compareWorkers);
  const attendanceById = toMap(
    collections.attendanceLogs.map(mapAttendanceLog),
    (log) => log.id,
  );
  const anomalyFlags = collections.anomalyFlags.map(mapAnomalyFlag);
  const correctionRequests =
    collections.correctionRequests.map(mapCorrectionRequest);
  const overtimeWorks = collections.overtimeWorks.map(mapOvertimeWork);
  const submittedOvertimeWorks = overtimeWorks.filter(
    (work) => work.status === "submitted",
  );
  const visibleOvertimeWorks = overtimeWorks.filter(isVisibleTimelineOvertime);
  const payrollSettings = collections.payrollSettings.map(mapPayrollSetting);
  const getPayrollSetting = (record: WorkRecordModel) =>
    findPayrollSettingForMonth(
      payrollSettings,
      record.workerId,
      record.dateKey.slice(0, 7),
    );
  const flagsByRecordId = toMap(
    anomalyFlags.filter(hasWorkRecordId),
    (flag) => flag.workRecordId,
  );
  const correctionIdsByRecordId = groupIdsByWorkRecordId(
    correctionRequests.filter((request) => request.status === "submitted"),
  );
  const visibleOvertimeIdsByRecordId =
    groupIdsByWorkRecordId(visibleOvertimeWorks);
  const submittedOvertimeIdsByRecordId =
    groupIdsByWorkRecordId(submittedOvertimeWorks);
  const pendingCorrectionByRecordId = toMap(
    correctionRequests.filter((request) => request.status === "submitted"),
    (request) => request.workRecordId,
  );
  const visibleOvertimeByRecordId = toMap(visibleOvertimeWorks, (work) =>
    work.workRecordId,
  );
  const getAttendanceForRecord = (record: WorkRecordModel | null) =>
    record?.attendanceLogId
      ? (attendanceById.get(record.attendanceLogId) ?? null)
      : null;
  const getAttendanceForOvertime = (overtime: OvertimeWorkModel | null) =>
    overtime?.attendanceLogId
      ? (attendanceById.get(overtime.attendanceLogId) ?? null)
      : null;
  const standaloneVisibleOvertimeWorks = visibleOvertimeWorks.filter(
    (work) => !work.workRecordId || !recordsById.has(work.workRecordId),
  );
  const getPayrollSettingForOvertime = (overtime: OvertimeWorkModel) => {
    const monthKey = getOvertimeMonthKey(
      overtime,
      getAttendanceForOvertime(overtime),
    );

    return monthKey
      ? findPayrollSettingForMonth(payrollSettings, overtime.workerId, monthKey)
      : undefined;
  };
  const pendingCorrectionIds = new Set(correctionIdsByRecordId.keys());
  const pendingOvertimeIds = new Set(submittedOvertimeIdsByRecordId.keys());
  const visibleOvertimeIds = new Set(visibleOvertimeIdsByRecordId.keys());
  const pendingOvertimeAttendanceIds = new Set(
    submittedOvertimeWorks
      .map((work) => work.attendanceLogId)
      .filter((id): id is string => Boolean(id)),
  );
  const weekNavigation = createWeekNavigation(
    records,
    standaloneVisibleOvertimeWorks.map((work) =>
      getOvertimeDate(work, getAttendanceForOvertime(work)),
    ),
  );
  const initialWeekStartKey = weekNavigation.initialWeekStartKey;
  const initialRecord = selectInitialRecord(records, {
    flagsByRecordId,
    weekStartKey: initialWeekStartKey,
  });
  const recordBlocks = records.map((record) =>
    mapTimelineBlock(record, {
      correctionIdsByRecordId,
      flag: flagsByRecordId.get(record.id),
      overtimeIdsByRecordId: visibleOvertimeIdsByRecordId,
      pendingCorrectionIds,
      pendingOvertimeIds,
      visibleOvertimeIds,
    }),
  );
  const standaloneOvertimeBlocks = standaloneVisibleOvertimeWorks.map((work) =>
    mapStandaloneOvertimeTimelineBlock(work, getAttendanceForOvertime(work)),
  );
  const blocks = [...recordBlocks, ...standaloneOvertimeBlocks];
  const selectedBlock = selectInitialTimelineBlock(blocks, initialWeekStartKey);
  const selectedRecord = selectedBlock
    ? (recordsById.get(selectedBlock.id) ?? null)
    : initialRecord;
  const initialDetailStateId = selectedBlock
    ? (selectedBlock.selectedStateId ?? "normal-selected")
    : getInitialDetailStateId(initialRecord, flagsByRecordId);
  const detailStatesByBlockId = {
    ...createDetailStatesByBlockId(records, {
      attendanceById,
      pendingCorrectionByRecordId,
      overtimeByRecordId: visibleOvertimeByRecordId,
      flagsByRecordId,
      getPayrollSetting,
    }),
    ...createStandaloneOvertimeDetailStatesByBlockId(
      standaloneVisibleOvertimeWorks,
      {
        attendanceById,
        getPayrollSetting: getPayrollSettingForOvertime,
      },
    ),
  };
  const selectedOvertime = selectedBlock
    ? (visibleOvertimeByRecordId.get(selectedBlock.id) ??
      visibleOvertimeWorks.find((work) => work.id === selectedBlock.id) ??
      null)
    : selectedRecord
      ? (visibleOvertimeByRecordId.get(selectedRecord.id) ?? null)
      : null;

  return {
    blocks,
    detailStates: createDetailStates({
      attendance: getAttendanceForRecord(selectedRecord),
      correction: selectedRecord
        ? (pendingCorrectionByRecordId.get(selectedRecord.id) ?? null)
        : null,
      flag: selectedRecord
        ? (flagsByRecordId.get(selectedRecord.id) ?? null)
        : null,
      overtime: selectedOvertime,
      overtimeAttendance: getAttendanceForOvertime(selectedOvertime),
      payrollSetting: selectedRecord
        ? (getPayrollSetting(selectedRecord) ?? null)
        : null,
      record: selectedRecord,
    }),
    detailStatesByBlockId,
    initialBlockId: selectedBlock?.id ?? null,
    initialWeekStartKey,
    initialDetailStateId,
    overtimeCreate: createOvertimeCreateView(records, {
      attendanceById,
      pendingOvertimeAttendanceIds,
      pendingOvertimeIds,
    }),
    timeline: {
      ...recordMainFixtureViewModel.timeline,
      weekNavigation,
      filters: createMainFilters(
        records,
        activeWorkers,
        standaloneVisibleOvertimeWorks,
      ),
      weekLabel: initialWeekStartKey
        ? formatWeekLabelFromStartKey(initialWeekStartKey)
        : createWeekLabel(records),
    },
  };
}

function mapAnomalyHistoryView(
  collections: RecordsCollections,
): AnomalyHistoryViewModel {
  const recordsById = toMap(
    collections.workRecords.map(mapWorkRecord),
    (record) => record.id,
  );
  const resolutions = collections.anomalyResolutions.map(mapAnomalyResolution);
  const resolutionByFlagId = toMap(
    resolutions.filter((resolution) => resolution.anomalyFlagId),
    (resolution) => resolution.anomalyFlagId,
  );
  const resolutionByRecordId = toMap(
    resolutions.filter((resolution) => resolution.workRecordId),
    (resolution) => resolution.workRecordId,
  );
  const flags = collections.anomalyFlags
    .map(mapAnomalyFlag)
    .sort((first, second) => {
      return getSortTime(second.createdAt) - getSortTime(first.createdAt);
    });
  const rows = flags.map((flag) => {
    const record = flag.workRecordId
      ? recordsById.get(flag.workRecordId)
      : null;
    const resolution =
      resolutionByFlagId.get(flag.id) ??
      (flag.workRecordId
        ? resolutionByRecordId.get(flag.workRecordId)
        : undefined);

    return mapAnomalyHistoryRow(flag, record ?? null, resolution ?? null);
  });

  return {
    details: Object.fromEntries(
      flags.map((flag) => {
        const record = flag.workRecordId
          ? recordsById.get(flag.workRecordId)
          : null;
        const resolution =
          resolutionByFlagId.get(flag.id) ??
          (flag.workRecordId
            ? resolutionByRecordId.get(flag.workRecordId)
            : undefined);
        const detail = mapAnomalyHistoryDetail(
          flag,
          record ?? null,
          resolution ?? null,
        );

        return [detail.id, detail];
      }),
    ),
    emptyDetailText: ["왼쪽 리스트에서", "이상감지처리 이력을 선택하세요."],
    filters: createAnomalyHistoryFilters(rows),
    metrics: createAnomalyHistoryMetrics(rows),
    rows,
  };
}

function createOvertimeCreateView(
  records: readonly WorkRecordModel[],
  {
    attendanceById,
    pendingOvertimeAttendanceIds,
    pendingOvertimeIds,
  }: {
    attendanceById: ReadonlyMap<string, AttendanceLogModel>;
    pendingOvertimeAttendanceIds: ReadonlySet<string>;
    pendingOvertimeIds: ReadonlySet<string>;
  },
) {
  const candidatesByAttendanceId = new Map<
    string,
    { candidate: RecordOvertimeCreateCandidate; sortTime: number }
  >();

  for (const record of records) {
    if (!record.attendanceLogId) {
      continue;
    }

    const attendance = attendanceById.get(record.attendanceLogId);

    if (!attendance) {
      continue;
    }

    const candidate = createOvertimeCreateCandidate(record, {
      attendance,
      hasPendingOvertime:
        record.hasPendingOvertime ||
        pendingOvertimeIds.has(record.id) ||
        pendingOvertimeAttendanceIds.has(record.attendanceLogId),
    });
    const sortTime = getSortTime(
      record.effectiveEndAt ??
        record.plannedEndAt ??
        attendance.checkOutAt ??
        attendance.checkInAt,
    );
    const current = candidatesByAttendanceId.get(record.attendanceLogId);

    if (
      !current ||
      (!candidate.disabledReason && current.candidate.disabledReason) ||
      sortTime > current.sortTime
    ) {
      candidatesByAttendanceId.set(record.attendanceLogId, {
        candidate,
        sortTime,
      });
    }
  }

  return {
    candidates: Array.from(candidatesByAttendanceId.values())
      .map((entry) => entry.candidate)
      .sort(compareOvertimeCreateCandidates),
    emptyText: "추가근무를 등록할 수 있는 출퇴근 기록이 없습니다.",
  };
}

function createOvertimeCreateCandidate(
  record: WorkRecordModel,
  {
    attendance,
    hasPendingOvertime,
  }: {
    attendance: AttendanceLogModel | null;
    hasPendingOvertime: boolean;
  },
): RecordOvertimeCreateCandidate {
  const recordDate = getRecordDate(record);
  const recordEndAt = record.effectiveEndAt ?? record.plannedEndAt;
  const defaultStartAt = recordEndAt ?? attendance?.checkInAt ?? null;
  const defaultEndAt = attendance?.checkOutAt ?? defaultStartAt;
  const dateKey = getOvertimeCreateDateKey(record, attendance);
  const disabledReason = getOvertimeCreateDisabledReason({
    attendance,
    hasPendingOvertime,
    record,
  });
  const displayDate = parseDateKey(dateKey) ?? recordDate;
  const dateLabel = displayDate
    ? `${formatMonthDay(displayDate)} (${weekDayLabels[displayDate.getDay()]})`
    : formatRecordDate(dateKey);

  return {
    id: attendance?.id ?? record.id,
    attendanceLabel: `${formatTime(attendance?.checkInAt)}~${formatTime(
      attendance?.checkOutAt,
    )} · ${attendance?.locationName ?? record.locationName}`,
    attendanceLogId: record.attendanceLogId,
    checkInTime: formatTime(attendance?.checkInAt),
    checkOutTime: formatTime(attendance?.checkOutAt),
    dateKey,
    dateLabel,
    defaultEndTime: formatTimeInputValue(defaultEndAt),
    defaultStartTime: formatTimeInputValue(defaultStartAt),
    disabledReason,
    dutyName: record.dutyName,
    label: `${formatTime(attendance?.checkInAt)}~${formatTime(
      attendance?.checkOutAt,
    )} · ${attendance?.locationName ?? record.locationName}`,
    locationName: record.locationName,
    recordId: record.id,
    workerId: record.workerId,
    workerName: record.workerName,
  };
}

function compareOvertimeCreateCandidates(
  first: RecordOvertimeCreateCandidate,
  second: RecordOvertimeCreateCandidate,
) {
  return (
    second.dateKey.localeCompare(first.dateKey) ||
    first.workerName.localeCompare(second.workerName, "ko-KR") ||
    first.checkInTime.localeCompare(second.checkInTime)
  );
}

function getOvertimeCreateDateKey(
  record: WorkRecordModel,
  attendance: AttendanceLogModel | null,
) {
  if (attendance?.date && parseDateKey(attendance.date)) {
    return attendance.date;
  }

  if (attendance?.checkInAt) {
    return formatDateKey(attendance.checkInAt);
  }

  return getRecordDateKey(record);
}

function getOvertimeCreateDisabledReason({
  attendance,
  hasPendingOvertime,
  record,
}: {
  attendance: AttendanceLogModel | null;
  hasPendingOvertime: boolean;
  record: WorkRecordModel;
}) {
  if (record.status === "deleted") {
    return "삭제된 근무기록";
  }

  if (hasPendingOvertime) {
    return "처리 대기 추가근무 있음";
  }

  if (!record.attendanceLogId || !attendance) {
    return "연결된 출퇴근 기록 없음";
  }

  if (!attendance.checkOutAt) {
    return "퇴근 시각 없음";
  }

  return undefined;
}

function mapCorrectionHistoryView(
  collections: RecordsCollections,
): CorrectionHistoryViewModel {
  const recordsById = toMap(
    collections.workRecords.map(mapWorkRecord),
    (record) => record.id,
  );
  const requests = collections.correctionRequests
    .map(mapCorrectionRequest)
    .sort((first, second) => {
      return (
        getSortTime(second.submittedAt ?? second.createdAt) -
        getSortTime(first.submittedAt ?? first.createdAt)
      );
    });
  const rows = requests.map((request) =>
    mapCorrectionRow(
      request,
      request.workRecordId
        ? (recordsById.get(request.workRecordId) ?? null)
        : null,
    ),
  );

  return {
    details: Object.fromEntries(
      requests.map((request) => {
        const detail = mapCorrectionDetail(
          request,
          request.workRecordId
            ? (recordsById.get(request.workRecordId) ?? null)
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

function mapOvertimeHistoryView(
  collections: RecordsCollections,
): OvertimeHistoryViewModel {
  const recordsById = toMap(
    collections.workRecords.map(mapWorkRecord),
    (record) => record.id,
  );
  const attendanceById = toMap(
    collections.attendanceLogs.map(mapAttendanceLog),
    (log) => log.id,
  );
  const overtimeWorks = collections.overtimeWorks
    .map(mapOvertimeWork)
    .sort((first, second) => {
      return (
        getSortTime(second.submittedAt ?? second.createdAt) -
        getSortTime(first.submittedAt ?? first.createdAt)
      );
    });
  const rows = overtimeWorks.map((work) =>
    mapOvertimeHistoryRow(
      work,
      work.workRecordId ? (recordsById.get(work.workRecordId) ?? null) : null,
    ),
  );

  return {
    details: Object.fromEntries(
      overtimeWorks.map((work) => {
        const record = work.workRecordId
          ? (recordsById.get(work.workRecordId) ?? null)
          : null;
        const attendanceId = work.attendanceLogId ?? record?.attendanceLogId;
        const attendance = attendanceId
          ? (attendanceById.get(attendanceId) ?? null)
          : null;
        const detail = mapOvertimeHistoryDetail(work, record, attendance);

        return [detail.id, detail];
      }),
    ),
    emptyDetailText: ["왼쪽 리스트에서", "추가근무 이력을 선택하세요."],
    filters: createOvertimeHistoryFilters(rows),
    metrics: createOvertimeHistoryMetrics(rows),
    rows,
  };
}

function mapAttendanceLogView(
  collections: RecordsCollections,
): AttendanceLogViewModel {
  const rows = collections.attendanceLogs
    .map(mapAttendanceLog)
    .sort((first, second) => {
      return (
        getSortTime(second.checkInAt ?? second.createdAt) -
        getSortTime(first.checkInAt ?? first.createdAt)
      );
    })
    .map(mapAttendanceLogRow);
  const anomalyCount = rows.filter(
    (row) => row.locationStatus === "이상",
  ).length;

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
    managerOnly: readRecord(data.managerOnly),
    plannedEndAt: readDate(data.plannedEndAt),
    plannedStartAt: readDate(data.plannedStartAt),
    status: readString(data.status, ""),
    workerId: readString(data.workerId, ""),
    workerName: readString(data.workerName, "이름 없는 조교"),
  };
}

function mapWorker(document: FirestoreDocument): WorkerModel {
  const data = document.data;

  return {
    id: document.id,
    membershipStatus: readString(data.membershipStatus, ""),
    name: readString(data.name, readString(data.displayName, "이름 없는 조교")),
    status: readString(data.status, "active"),
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

function mapCorrectionRequest(
  document: FirestoreDocument,
): CorrectionRequestModel {
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
    amount:
      readNullableNumber(data.amount) ?? readNullableNumber(data.fixedAmount),
    approvedAt: readDate(data.approvedAt),
    attendanceLogId: readNullableString(data.attendanceLogId),
    createdAt: readDate(data.createdAt),
    decidedAt: readDate(data.decidedAt),
    extraEndAt: readDate(data.extraEndAt),
    extraStartAt: readDate(data.extraStartAt),
    id: document.id,
    managerNote: readString(data.managerNote, ""),
    monthKey: readString(data.monthKey, ""),
    payrollEffect: readString(data.payrollEffect, "none"),
    payrollPayMode: readString(data.payrollPayMode, ""),
    payrollStatus: readString(data.payrollStatus, "none"),
    reason: readString(data.reason, "사유가 등록되지 않았습니다."),
    rejectedReason: readString(data.rejectedReason, ""),
    status: readString(data.status, "submitted"),
    submittedAt: readDate(data.submittedAt),
    workRecordId: readNullableString(data.workRecordId),
    workerId: readString(data.workerId, ""),
    workerName: readString(data.workerName, "이름 없는 조교"),
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
    visibleOvertimeIds: ReadonlySet<string>;
  },
): RecordTimelineBlock {
  const hasUnresolvedFlag = isUnresolvedAnomaly(
    record,
    new Map([[record.id, options.flag]]),
  );
  const hasPendingCorrection =
    record.hasPendingCorrection || options.pendingCorrectionIds.has(record.id);
  const hasPendingOvertime =
    record.hasPendingOvertime || options.pendingOvertimeIds.has(record.id);
  const hasVisibleOvertime =
    hasPendingOvertime || options.visibleOvertimeIds.has(record.id);
  const kind = getTimelineBlockKind({
    hasPendingCorrection,
    hasPendingOvertime: hasVisibleOvertime,
    hasUnresolvedFlag,
  });
  const workStartAt = getRecordWorkStartAt(record);
  const workEndAt = getRecordWorkEndAt(record);
  const signalKinds = getTimelineBlockSignalKinds({
    hasPendingCorrection,
    hasPendingOvertime: hasVisibleOvertime,
    hasUnresolvedFlag,
  });
  const pendingSignalKinds = getTimelineBlockSignalKinds({
    hasPendingCorrection,
    hasPendingOvertime,
    hasUnresolvedFlag,
  });

  return {
    id: record.id,
    dateKey: getRecordDateKey(record) || undefined,
    dayId: getRecordDayId(record),
    dutyName: record.dutyName,
    endHour:
      workEndAt?.getHours() ?? Math.min(getRecordStartHour(record) + 1, 24),
    endMinute: workEndAt?.getMinutes() ?? 0,
    endTime: formatTime(workEndAt),
    focusIds: [
      record.attendanceLogId,
      options.flag?.id,
      ...(options.correctionIdsByRecordId.get(record.id) ?? []),
      ...(options.overtimeIdsByRecordId.get(record.id) ?? []),
    ].filter((id): id is string => Boolean(id)),
    kind,
    locationName: record.locationName,
    pendingSignalKinds,
    selectedStateId:
      kind === "location-anomaly" ? "anomaly-step-1" : "normal-selected",
    signalKinds,
    startHour: getRecordStartHour(record),
    startMinute: workStartAt?.getMinutes() ?? 0,
    startTime: formatTime(workStartAt),
    tone: getTimelineBlockTone(kind),
    workerId: record.workerId,
    workerName: record.workerName,
  };
}

function mapStandaloneOvertimeTimelineBlock(
  overtime: OvertimeWorkModel,
  attendance: AttendanceLogModel | null,
): RecordTimelineBlock {
  const overtimeStartAt = getOvertimeStartAt(overtime, attendance);
  const overtimeEndAt = getOvertimeEndAt(overtime, attendance);
  const startHour = overtimeStartAt?.getHours() ?? 8;

  return {
    id: overtime.id,
    dateKey: getOvertimeDateKey(overtime, attendance) || undefined,
    dayId: getOvertimeDayId(overtime, attendance),
    dutyName: "추가근무 신청",
    endHour: overtimeEndAt?.getHours() ?? Math.min(startHour + 1, 24),
    endMinute: overtimeEndAt?.getMinutes() ?? 0,
    endTime: formatTime(overtimeEndAt),
    focusIds: [overtime.id, overtime.attendanceLogId].filter(
      (id): id is string => Boolean(id),
    ),
    kind: "overtime",
    locationName: attendance?.locationName ?? "근무지 미지정",
    pendingSignalKinds:
      overtime.status === "submitted" ? ["overtime"] : ["normal"],
    selectedStateId: "normal-selected",
    signalKinds: ["overtime"],
    startHour,
    startMinute: overtimeStartAt?.getMinutes() ?? 0,
    startTime: formatTime(overtimeStartAt),
    tone: "blue",
    workerId: overtime.workerId,
    workerName: overtime.workerName || attendance?.workerName || "이름 없는 조교",
  };
}

function groupIdsByWorkRecordId<
  T extends { id: string; workRecordId: string | null },
>(items: readonly T[]) {
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

function selectInitialTimelineBlock(
  blocks: readonly RecordTimelineBlock[],
  weekStartKey: string | null,
) {
  const scopedBlocks = weekStartKey
    ? blocks.filter((block) => isTimelineBlockInWeek(block, weekStartKey))
    : blocks;

  return (
    scopedBlocks.find((block) => block.selectedStateId === "anomaly-step-1") ??
    scopedBlocks.find((block) => block.selectedStateId) ??
    scopedBlocks[0] ??
    null
  );
}

function isTimelineBlockInWeek(
  block: RecordTimelineBlock,
  weekStartKey: string,
) {
  const date = block.dateKey ? parseDateKey(block.dateKey) : null;
  const weekStart = parseDateKey(weekStartKey);

  if (!date || !weekStart) {
    return false;
  }

  const nextWeekStart = addDays(weekStart, 7);

  return date >= weekStart && date < nextWeekStart;
}

function createDetailStatesByBlockId(
  records: readonly WorkRecordModel[],
  options: {
    attendanceById: ReadonlyMap<string, AttendanceLogModel>;
    flagsByRecordId: ReadonlyMap<string, AnomalyFlagModel | undefined>;
    getPayrollSetting: (
      record: WorkRecordModel,
    ) => PayrollSettingModel | undefined;
    overtimeByRecordId: ReadonlyMap<string, OvertimeWorkModel>;
    pendingCorrectionByRecordId: ReadonlyMap<string, CorrectionRequestModel>;
  },
) {
  const detailStatesByBlockId: Record<
    string,
    Record<RecordDetailStateId, RecordDetailState>
  > = {};

  for (const record of records) {
    const overtime = options.overtimeByRecordId.get(record.id) ?? null;

    detailStatesByBlockId[record.id] = createDetailStates({
      attendance: record.attendanceLogId
        ? (options.attendanceById.get(record.attendanceLogId) ?? null)
        : null,
      correction: options.pendingCorrectionByRecordId.get(record.id) ?? null,
      flag: options.flagsByRecordId.get(record.id) ?? null,
      overtime,
      overtimeAttendance: overtime?.attendanceLogId
        ? (options.attendanceById.get(overtime.attendanceLogId) ?? null)
        : null,
      payrollSetting: options.getPayrollSetting(record) ?? null,
      record,
    });
  }

  return detailStatesByBlockId;
}

function createStandaloneOvertimeDetailStatesByBlockId(
  overtimeWorks: readonly OvertimeWorkModel[],
  options: {
    attendanceById: ReadonlyMap<string, AttendanceLogModel>;
    getPayrollSetting: (
      overtime: OvertimeWorkModel,
    ) => PayrollSettingModel | undefined;
  },
) {
  const detailStatesByBlockId: Record<
    string,
    Record<RecordDetailStateId, RecordDetailState>
  > = {};
  const empty = createEmptyDetailState(["왼쪽 리스트에서", "근무 기록을 선택하세요."]);

  for (const overtime of overtimeWorks) {
    const attendance = overtime.attendanceLogId
      ? (options.attendanceById.get(overtime.attendanceLogId) ?? null)
      : null;

    detailStatesByBlockId[overtime.id] = createOvertimeDetailStates(
      null,
      attendance,
      overtime,
      options.getPayrollSetting(overtime) ?? null,
      empty,
    );
  }

  return detailStatesByBlockId;
}

function createWeekNavigation(
  records: readonly WorkRecordModel[],
  extraDates: readonly (Date | null)[] = [],
) {
  const currentWeekStartKey = formatDateKey(startOfWeekSunday(new Date()));
  const recordWeekStartKeys = records
    .map(getRecordDate)
    .filter((date): date is Date => Boolean(date))
    .map((date) => formatDateKey(startOfWeekSunday(date)));
  const extraWeekStartKeys = extraDates
    .filter((date): date is Date => Boolean(date))
    .map((date) => formatDateKey(startOfWeekSunday(date)));
  const weekStartKeys = [
    ...new Set([currentWeekStartKey, ...recordWeekStartKeys, ...extraWeekStartKeys]),
  ].sort();

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
    scopedRecords.find((record) =>
      isUnresolvedAnomaly(record, options.flagsByRecordId),
    ) ??
    scopedRecords[0] ??
    null
  );
}

function getInitialDetailStateId(
  record: WorkRecordModel | null,
  flagsByRecordId: ReadonlyMap<string, AnomalyFlagModel | undefined>,
) {
  if (!record) {
    return "empty";
  }

  return isUnresolvedAnomaly(record, flagsByRecordId)
    ? "anomaly-step-1"
    : "normal-selected";
}

function createDetailStates({
  attendance,
  correction,
  flag,
  overtime,
  overtimeAttendance,
  payrollSetting,
  record,
}: {
  attendance: AttendanceLogModel | null;
  correction: CorrectionRequestModel | null;
  flag: AnomalyFlagModel | null;
  overtime: OvertimeWorkModel | null;
  overtimeAttendance: AttendanceLogModel | null;
  payrollSetting: PayrollSettingModel | null;
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
  const hasUnresolvedFlag =
    Boolean(flag) &&
    isUnresolvedAnomaly(record, new Map([[record.id, flag ?? undefined]]));

  if (correction) {
    return createCorrectionDetailStates(
      record,
      attendance,
      correction,
      flag,
      overtime,
      payrollSetting,
      empty,
    );
  }

  if (overtime) {
    return createOvertimeDetailStates(
      record,
      overtimeAttendance ?? attendance,
      overtime,
      payrollSetting,
      empty,
    );
  }

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
      reasonField: {
        label: "수정 사유",
        placeholder: "수정 사유를 입력하세요",
      },
      timeFields: [
        {
          id: "check-in",
          label: "근무 시작",
          value: formatKoreanTime(
            record.effectiveStartAt ?? record.plannedStartAt,
          ),
        },
        {
          id: "check-out",
          label: "근무 종료",
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
    },
  };
}

function createCorrectionDetailStates(
  record: WorkRecordModel,
  attendance: AttendanceLogModel | null,
  correction: CorrectionRequestModel,
  flag: AnomalyFlagModel | null,
  overtime: OvertimeWorkModel | null,
  payrollSetting: PayrollSettingModel | null,
  empty: RecordDetailState,
): Record<RecordDetailStateId, RecordDetailState> {
  const hasUnresolvedFlag =
    Boolean(flag) &&
    isUnresolvedAnomaly(record, new Map([[record.id, flag ?? undefined]]));
  const base: RecordDetailState = {
    ...createRecordActionDetailBase(record, attendance),
    lineSections: createRecordDetailLineSections(
      record,
      attendance,
      hasUnresolvedFlag,
    ),
  };
  const overtimeCorrection = isCorrectionForOvertime(correction);
  const requestedStartAt = overtimeCorrection
    ? (readDate(correction.afterSnapshot.extraStartAt) ??
      readDate(correction.afterSnapshot.overtimeStartAt) ??
      overtime?.extraStartAt ??
      record.effectiveStartAt ??
      record.plannedStartAt)
    : (readDate(correction.afterSnapshot.effectiveStartAt) ??
      readDate(correction.afterSnapshot.plannedStartAt) ??
      record.effectiveStartAt ??
      record.plannedStartAt);
  const requestedEndAt = overtimeCorrection
    ? (readDate(correction.afterSnapshot.extraEndAt) ??
      readDate(correction.afterSnapshot.overtimeEndAt) ??
      overtime?.extraEndAt ??
      record.effectiveEndAt ??
      record.plannedEndAt)
    : (readDate(correction.afterSnapshot.effectiveEndAt) ??
      readDate(correction.afterSnapshot.plannedEndAt) ??
      record.effectiveEndAt ??
      record.plannedEndAt);
  const correctionLineSections = [
    ...(base.lineSections ?? []),
    createCorrectionRequestLineSection({
      overtimeCorrection,
      requestedEndAt,
      requestedStartAt,
    }),
  ];
  const approveConfirmTitle = overtimeCorrection
    ? "추가근무 이의신청을 승인할까요?"
    : "이의신청을 승인하고 근무기록을 수정할까요?";
  const approveConfirmDescription = overtimeCorrection
    ? getOvertimeCorrectionApprovalDescription(hasUnresolvedFlag)
    : getRegularCorrectionApprovalDescription(payrollSetting, hasUnresolvedFlag);
  const approveState: RecordDetailState = {
    ...base,
    actions: [
      { id: "approve-correction", label: "승인", active: true },
      { id: "reject-correction", label: "반려" },
    ],
    confirmDescription: approveConfirmDescription,
    confirmLabel: "승인",
    confirmTitle: approveConfirmTitle,
    helperText: overtimeCorrection
      ? "승인 시 요청 시간을 기본값으로 추가근무 시간을 갱신합니다."
      : "승인 시 요청 시간을 기본값으로 근무기록을 갱신합니다.",
    id: "anomaly-step-3",
    lineSections: correctionLineSections,
    reasonField: {
      label: overtimeCorrection ? "처리 메모" : "수정 사유",
      placeholder: overtimeCorrection
        ? "처리 메모를 입력하세요"
        : "수정 사유를 입력하세요",
    },
    statusLabel: "이의신청",
    statusTone: "orange",
    submitAction: "approve-correction",
    timeFields: [
      {
        id: "check-in",
        label: overtimeCorrection ? "추가근무 시작" : "근무 시작",
        value: formatKoreanTime(requestedStartAt),
      },
      {
        id: "check-out",
        label: overtimeCorrection ? "추가근무 종료" : "근무 종료",
        value: formatKoreanTime(requestedEndAt),
      },
    ],
    ...(overtimeCorrection
      ? {
          amountField: {
            label: "고정 지급액",
            placeholder: "예) 10000",
          },
          payrollMode: createOvertimePayrollMode(),
          payrollPayMode: createOvertimePayrollPayMode(payrollSetting),
        }
      : {}),
  };

  return {
    empty,
    "normal-selected": {
      ...base,
      actions: [
        { id: "approve-correction", label: "승인" },
        { id: "reject-correction", label: "반려" },
      ],
      lineSections: correctionLineSections,
      noteText: correction.reason,
      noteTitle: "이의신청 사유",
      statusLabel: "이의신청",
      statusTone: "orange",
    },
    "anomaly-step-1": base,
    "anomaly-step-2": base,
    "anomaly-step-3": approveState,
    "anomaly-step-4": {
      ...base,
      actions: [
        { id: "approve-correction", label: "승인" },
        { id: "reject-correction", label: "반려", active: true },
      ],
      confirmLabel: "반려",
      confirmDescription:
        hasUnresolvedFlag
          ? "이의신청을 반려하고, 이상 플래그는 유지하거나 정상 처리로 함께 종료할 수 있습니다."
          : "이의신청을 반려로 종료하고 근무기록과 급여 산정값은 변경하지 않습니다.",
      confirmTitle: "이의신청을 반려할까요?",
      id: "anomaly-step-4",
      ...(hasUnresolvedFlag
        ? {
            anomalyResolutionMode: createCorrectionRejectAnomalyResolutionMode(),
          }
        : {}),
      lineSections: correctionLineSections,
      reasonField: {
        label: "반려 사유",
        placeholder: "반려 사유를 입력하세요",
      },
      statusLabel: "이의신청",
      statusTone: "orange",
      submitAction: "reject-correction",
    },
  };
}

function createCorrectionRequestLineSection({
  overtimeCorrection,
  requestedEndAt,
  requestedStartAt,
}: {
  overtimeCorrection: boolean;
  requestedEndAt: Date | null;
  requestedStartAt: Date | null;
}): RecordDetailLineSection {
  return {
    id: "correction-request",
    lines: [
      detailLine(
        "requested-start",
        overtimeCorrection ? "요청 추가근무 시작" : "요청 근무 시작",
        formatTime(requestedStartAt),
      ),
      detailLine(
        "requested-end",
        overtimeCorrection ? "요청 추가근무 종료" : "요청 근무 종료",
        formatTime(requestedEndAt),
      ),
    ],
    title: "이의신청 요청",
  };
}

function createOvertimeDetailStates(
  record: WorkRecordModel | null,
  attendance: AttendanceLogModel | null,
  overtime: OvertimeWorkModel,
  payrollSetting: PayrollSettingModel | null,
  empty: RecordDetailState,
): Record<RecordDetailStateId, RecordDetailState> {
  const submitted = overtime.status === "submitted";
  const base: RecordDetailState = {
    actions: [],
    alertText: getOvertimeAttendanceAlertText(attendance),
    id: "normal-selected",
    lineSections: createOvertimeDetailLineSections(attendance, overtime),
    statusLabel: getOvertimeTimelineStatusLabel(overtime),
    statusTone: "blue" as const,
    title: `${overtime.workerName || record?.workerName || "이름 없는 조교"} · 추가근무 신청`,
  };

  if (!submitted) {
    return {
      empty,
      "normal-selected": base,
      "anomaly-step-1": base,
      "anomaly-step-2": base,
      "anomaly-step-3": base,
      "anomaly-step-4": base,
    };
  }

  return {
    empty,
    "normal-selected": {
      ...base,
      actions: [
        { id: "approve-overtime", label: "승인" },
        { id: "reject-overtime", label: "반려" },
      ],
    },
    "anomaly-step-1": base,
    "anomaly-step-2": base,
    "anomaly-step-3": {
      ...base,
      amountField: {
        label: "고정 지급액",
        placeholder: "예) 10000",
      },
      actions: [
        { id: "approve-overtime", label: "승인", active: true },
        { id: "reject-overtime", label: "반려" },
      ],
      confirmLabel: "승인",
      helperText: "승인 시 추가근무 시간과 급여 처리 방식을 함께 확정합니다.",
      id: "anomaly-step-3",
      payrollMode: createOvertimePayrollMode(),
      payrollPayMode: createOvertimePayrollPayMode(payrollSetting),
      reasonField: {
        label: "처리 메모",
        placeholder: "처리 메모를 입력하세요",
      },
      submitAction: "approve-overtime",
    },
    "anomaly-step-4": {
      ...base,
      actions: [
        { id: "approve-overtime", label: "승인" },
        { id: "reject-overtime", label: "반려", active: true },
      ],
      confirmLabel: "반려",
      id: "anomaly-step-4",
      reasonField: {
        label: "반려 사유",
        placeholder: "반려 사유를 입력하세요",
      },
      submitAction: "reject-overtime",
    },
  };
}

function getOvertimeTimelineStatusLabel(overtime: OvertimeWorkModel) {
  if (overtime.status === "approved" && overtime.payrollStatus === "held") {
    return "추가근무 승인 · 급여 보류";
  }

  if (overtime.status === "approved") {
    return "추가근무 승인";
  }

  if (overtime.status === "withdrawn") {
    return "추가근무 철회";
  }

  return "추가근무 신청";
}

function getRegularCorrectionApprovalDescription(
  payrollSetting: PayrollSettingModel | null,
  resolvesAnomaly: boolean,
) {
  const anomalyText = resolvesAnomaly
    ? " 연결된 이상 플래그도 함께 종료합니다."
    : "";

  if (payrollSetting?.payrollType === "hourly") {
    return `요청 시간을 기본값으로 불러오며, 시급제 조교의 변경된 근무시간을 급여 산정에 반영합니다.${anomalyText}`;
  }

  if (payrollSetting?.payrollType === "monthly") {
    return `요청 시간을 기본값으로 불러오며, 월급제 조교의 필요한 급여 보정 항목을 반영합니다.${anomalyText}`;
  }

  return `요청 시간을 기본값으로 불러오며, 변경된 일반근무 시간을 급여 산정에 반영합니다.${anomalyText}`;
}

function getOvertimeCorrectionApprovalDescription(resolvesAnomaly: boolean) {
  const anomalyText = resolvesAnomaly
    ? " 연결된 이상 플래그도 함께 종료합니다."
    : "";

  return `요청 시간을 기본값으로 불러오며, 입력한 추가근무 시간과 급여 처리값으로 반영합니다.${anomalyText}`;
}

function createCorrectionRejectAnomalyResolutionMode(): NonNullable<
  RecordDetailState["anomalyResolutionMode"]
> {
  return {
    description:
      "반려는 조교의 이의신청만 닫습니다. 이상이 없다고 판단한 경우에만 함께 종료하세요.",
    label: "이상 플래그 처리",
    options: [
      { id: "keep", label: "이상 검토 유지", active: true },
      { id: "resolve", label: "정상 처리로 종료" },
    ],
  };
}

function createOvertimePayrollMode(): NonNullable<
  RecordDetailState["payrollMode"]
> {
  return {
    description:
      "급여 제외는 산정에 넣지 않고, 보류는 급여 확정 시점에 다시 결정합니다.",
    label: "급여 처리",
    options: [
      { id: "none", label: "급여 제외" },
      { id: "immediate", label: "급여 처리", active: true },
      { id: "hold", label: "보류" },
    ],
  };
}

function createOvertimePayrollPayMode(
  payrollSetting: PayrollSettingModel | null,
): NonNullable<RecordDetailState["payrollPayMode"]> {
  const canUseHourly =
    payrollSetting?.payrollType === "hourly" &&
    payrollSetting.hourlyRate != null;

  return {
    description: canUseHourly
      ? "시급 처리는 추가근무 시간에 조교의 시급을 곱해 계산합니다."
      : "월급제 또는 시급 미설정 조교는 고정급 지급만 선택할 수 있습니다.",
    label: "지급 방식",
    options: [
      { id: "fixed", label: "고정급 지급", active: !canUseHourly },
      ...(canUseHourly
        ? [{ id: "hourly", label: "시급 처리", active: true }]
        : []),
    ],
  };
}

function isCorrectionForOvertime(correction: CorrectionRequestModel) {
  return isCorrectionSnapshotForOvertime(
    correction.beforeSnapshot,
    correction.afterSnapshot,
  );
}

function createNormalDetailState(
  record: WorkRecordModel,
  attendance: AttendanceLogModel | null,
): RecordDetailState {
  return {
    actions: createRecordActionButtons(false),
    id: "normal-selected",
    lineSections: createRecordDetailLineSections(record, attendance, false),
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
    lineSections: createRecordDetailLineSections(record, attendance, false),
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
      ? [
          {
            id: "mark-normal",
            label: "정상 처리",
            active: activeAction === "mark-normal",
          },
        ]
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
    id: "anomaly-step-1",
    lineSections: createRecordDetailLineSections(record, attendance, true),
    statusLabel: getAnomalyTypeLabel(anomalyType),
    statusTone: "pink",
    title: `${record.workerName} · ${record.dutyName}`,
  };
}

function createEmptyDetailState(
  emptyText: readonly string[],
): RecordDetailState {
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

function createPlaceholderAnomalyDetail(
  id: RecordDetailStateId,
): RecordDetailState {
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
  return createRecordDetailLineSections(record, attendance, anomaly).flatMap(
    (section) => section.lines,
  );
}

function createRecordDetailLineSections(
  record: WorkRecordModel,
  attendance: AttendanceLogModel | null,
  anomaly: boolean,
): readonly RecordDetailLineSection[] {
  return createRecordLineSections({
    checkIn: formatTime(attendance?.checkInAt),
    checkOut: formatTime(attendance?.checkOutAt),
    locationName: record.locationName,
    logStatus: anomaly ? getLocationAnomalyText(record, attendance) : null,
    logTone: anomaly ? "pink" : undefined,
    workEnd: formatTime(record.effectiveEndAt ?? record.plannedEndAt),
    workStart: formatTime(record.effectiveStartAt ?? record.plannedStartAt),
  });
}

function createOvertimeDetailLineSections(
  attendance: AttendanceLogModel | null,
  overtime: OvertimeWorkModel,
): readonly RecordDetailLineSection[] {
  return [
    createOvertimeLineSection({
      overtimeEnd: formatTime(overtime.extraEndAt),
      overtimeStart: formatTime(overtime.extraStartAt),
      reason: overtime.reason,
    }),
    createAttendanceLogLineSection({
      checkIn: formatTime(attendance?.checkInAt),
      checkOut: formatTime(attendance?.checkOutAt),
      locationName: attendance?.locationName ?? "-",
      title: "연결 출퇴근 기록",
    }),
  ];
}

function getOvertimeAttendanceAlertText(attendance: AttendanceLogModel | null) {
  if (!attendance) {
    return "연결된 출퇴근 기록이 없어 추가근무 시간을 확인할 수 없습니다.";
  }

  if (!attendance.checkOutAt) {
    return "연결 출퇴근 기록에 퇴근 시각이 없어 추가근무 시간을 확인할 수 없습니다.";
  }

  return undefined;
}

function mapAnomalyHistoryRow(
  flag: AnomalyFlagModel,
  record: WorkRecordModel | null,
  resolution: AnomalyResolutionModel | null,
): AnomalyHistoryRow {
  return {
    anomalyType: getAnomalyTypeLabel(flag.anomalyType),
    dutyName: record?.dutyName ?? flag.dutyName,
    id: flag.id,
    payrollResult: getPayrollEffectLabel(resolution?.payrollEffect ?? "none"),
    referenceDate: formatShortDateTime(
      flag.createdAt ?? parseDateKey(flag.dateKey),
    ),
    result: getAnomalyResolutionLabel(
      resolution?.decision ?? null,
      flag.status,
    ),
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
          detailLine("work-start", "근무 시작", "미기록"),
          detailLine("work-end", "근무 종료", "미기록"),
          detailLine(
            "log-status",
            "이상 플래그",
            getAnomalyTypeLabel(flag.anomalyType),
            "pink",
          ),
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
  const submittedAt = request.submittedAt ?? request.createdAt;

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
    submittedAt: formatShortDateTime(submittedAt),
    submittedAtMs: submittedAt ? submittedAt.getTime() : undefined,
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
      {
        label: payrollLabel,
        tone:
          payrollLabel === "즉시" || payrollLabel === "반영" ? "green" : "grey",
      },
    ],
    id: request.id,
    noteText: request.managerNote || getCorrectionResultLabel(request),
    originalLines: createSnapshotLines(
      request.beforeSnapshot,
      record,
      "before",
    ),
    originalTitle: "당시 기록",
    reasonText: request.reason,
    reasonTitle: "조교 사유",
    subtitle: `${formatRecordDate(record?.dateKey ?? readString(request.beforeSnapshot.date, ""))} 근무`,
    title: `${record?.workerName ?? request.workerName} · ${
      record?.dutyName ??
      readString(request.beforeSnapshot.dutyName, "대상 근무기록")
    }`,
  };
}

function mapOvertimeHistoryRow(
  work: OvertimeWorkModel,
  record: WorkRecordModel | null,
): OvertimeHistoryRow {
  return {
    detailButtonLabel: "상세보기",
    id: work.id,
    payrollResult: getOvertimeHistoryPayrollLabel(work),
    recordName: record?.dutyName ?? "추가근무 신청",
    status: getOvertimeHistoryStatus(work.status),
    submittedAt: formatShortDateTime(work.submittedAt ?? work.createdAt),
    time: formatTimeRange(work.extraStartAt, work.extraEndAt),
    workerName: record?.workerName ?? work.workerName,
  };
}

function mapOvertimeHistoryDetail(
  work: OvertimeWorkModel,
  record: WorkRecordModel | null,
  attendance: AttendanceLogModel | null,
): OvertimeHistoryDetail {
  const status = getOvertimeHistoryStatus(work.status);
  const payrollLabel = getOvertimeHistoryPayrollLabel(work);
  const dateKey =
    record?.dateKey ??
    (work.extraStartAt ? formatDateKey(work.extraStartAt) : work.monthKey);

  return {
    attendanceLines: [
      detailLine(
        "work-start",
        "근무 시작",
        formatTime(record ? getRecordWorkStartAt(record) : null),
      ),
      detailLine(
        "work-end",
        "근무 종료",
        formatTime(record ? getRecordWorkEndAt(record) : null),
      ),
      detailLine("check-in", "출근", formatTime(attendance?.checkInAt)),
      detailLine("check-out", "퇴근", formatTime(attendance?.checkOutAt)),
      detailLine(
        "location",
        "근무지",
        record?.locationName ?? attendance?.locationName ?? "-",
      ),
    ],
    attendanceTitle: "연결 출퇴근",
    badges: [
      { label: status, tone: getOvertimeHistoryStatusTone(status) },
      {
        label: payrollLabel,
        tone: getOvertimeHistoryPayrollTone(payrollLabel),
      },
    ],
    id: work.id,
    noteText: getOvertimeHistoryNoteText(work, status),
    reasonText: work.reason,
    reasonTitle: "조교 사유",
    requestLines: [
      detailLine(
        "submitted-at",
        "신청일",
        formatShortDateTime(work.submittedAt ?? work.createdAt),
      ),
      detailLine(
        "overtime-start",
        "추가근무 시작",
        formatTime(work.extraStartAt),
      ),
      detailLine("overtime-end", "추가근무 종료", formatTime(work.extraEndAt)),
      detailLine("linked-record", "연결 근무", record?.dutyName ?? "-"),
    ],
    requestTitle: "신청 내용",
    resultLines: [
      detailLine(
        "status",
        "처리 상태",
        status,
        getOvertimeHistoryStatusTone(status),
      ),
      detailLine("payroll", "급여 상태", payrollLabel),
      detailLine("pay-mode", "지급 방식", getOvertimePayModeLabel(work)),
      detailLine("amount", "지급액", getOvertimeAmountLabel(work)),
      detailLine(
        "decided-at",
        "처리 시각",
        formatShortDateTime(work.decidedAt ?? work.approvedAt),
      ),
    ],
    resultTitle: "처리 결과",
    subtitle: `${formatRecordDate(dateKey)} 추가근무 신청`,
    title: `${record?.workerName ?? work.workerName} · ${
      record?.dutyName ?? "추가근무 신청"
    }`,
  };
}

function mapAttendanceLogRow(log: AttendanceLogModel): AttendanceLogRow {
  return {
    checkIn: formatTime(log.checkInAt),
    checkOut: formatTime(log.checkOutAt),
    date: formatShortDateTime(
      log.checkInAt ?? log.createdAt ?? parseDateKey(log.date),
    ),
    id: log.id,
    locationName: log.locationName,
    locationStatus: getAttendanceLogStatus(log),
    workerName: log.workerName,
  };
}

function createMainFilters(
  records: readonly WorkRecordModel[],
  activeWorkers: readonly WorkerModel[],
  overtimeWorks: readonly OvertimeWorkModel[] = [],
): Record<string, readonly RecordsFilterOption[]> {
  return {
    location: createMainWorkerFilterOptions(
      records,
      activeWorkers,
      overtimeWorks,
    ),
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
    period: correctionHistoryFixtureViewModel.filters.period,
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

function createOvertimeHistoryFilters(
  rows: readonly OvertimeHistoryRow[],
): Record<string, readonly RecordsFilterOption[]> {
  return {
    location: createWorkerFilterOptions(rows.map((row) => row.workerName)),
    period: overtimeHistoryFixtureViewModel.filters.period,
    payroll: overtimeHistoryFixtureViewModel.filters.payroll,
    status: overtimeHistoryFixtureViewModel.filters.status,
  };
}

function createWorkerFilterOptions(names: readonly string[]) {
  const uniqueNames = [...new Set(names.filter(Boolean))].sort(
    (first, second) => first.localeCompare(second, "ko-KR"),
  );

  return [
    { id: "all", label: "조교 (전체)", selected: true },
    ...uniqueNames.map((name) => ({
      id: createStableId(name),
      label: name,
    })),
  ] satisfies readonly RecordsFilterOption[];
}

function createMainWorkerFilterOptions(
  records: readonly WorkRecordModel[],
  activeWorkers: readonly WorkerModel[],
  overtimeWorks: readonly OvertimeWorkModel[] = [],
) {
  const optionsById = new Map<string, RecordsFilterOption>();

  for (const worker of activeWorkers) {
    if (!worker.id || !worker.name || optionsById.has(worker.id)) {
      continue;
    }

    optionsById.set(worker.id, {
      id: worker.id,
      label: worker.name,
    });
  }

  for (const record of records) {
    const id = record.workerId || createStableId(record.workerName);

    if (!id || optionsById.has(id)) {
      continue;
    }

    optionsById.set(id, {
      id,
      label: record.workerName,
    });
  }

  for (const overtime of overtimeWorks) {
    const id = overtime.workerId || createStableId(overtime.workerName);

    if (!id || optionsById.has(id)) {
      continue;
    }

    optionsById.set(id, {
      id,
      label: overtime.workerName,
    });
  }

  return [
    { id: "all", label: "조교 (전체)", selected: true },
    ...Array.from(optionsById.values()).sort((first, second) =>
      first.label.localeCompare(second.label, "ko-KR"),
    ),
  ] satisfies readonly RecordsFilterOption[];
}

function isActiveWorker(worker: WorkerModel) {
  const inactiveStatuses = new Set([
    "deleted",
    "inactive",
    "pending",
    "rejected",
    "suspended",
  ]);

  return (
    !inactiveStatuses.has(worker.status) &&
    !inactiveStatuses.has(worker.membershipStatus)
  );
}

function createAnomalyHistoryMetrics(
  rows: readonly AnomalyHistoryRow[],
): readonly RecordsMetricCard[] {
  const pendingCount = rows.filter((row) => row.status === "처리 대기").length;
  const changedCount = rows.filter(
    (row) => row.result === "수정" || row.result === "삭제",
  ).length;

  return [
    {
      id: "submitted",
      label: "제출 유형",
      value: `${rows.length}건`,
      tone: "green",
    },
    {
      id: "pending",
      label: "처리 대기",
      value: `${pendingCount}건`,
      tone: "orange",
    },
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
    {
      id: "submitted",
      label: "제출 유형",
      value: `${rows.length}건`,
      tone: "green",
    },
    {
      id: "pending",
      label: "처리 대기",
      value: `${pendingCount}건`,
      tone: "orange",
    },
    {
      id: "approved",
      label: "승인",
      value: `${approvedCount}건`,
      tone: "green",
    },
    {
      id: "rejected-or-withdrawn",
      label: "반려/철회",
      value: `${rejectedOrWithdrawnCount}건`,
      tone: "pink",
    },
  ];
}

function createOvertimeHistoryMetrics(
  rows: readonly OvertimeHistoryRow[],
): readonly RecordsMetricCard[] {
  const pendingCount = rows.filter((row) => row.status === "신청됨").length;
  const approvedCount = rows.filter((row) => row.status === "승인").length;
  const rejectedOrWithdrawnCount = rows.filter(
    (row) => row.status === "반려" || row.status === "철회",
  ).length;

  return [
    {
      id: "submitted",
      label: "총 신청",
      value: `${rows.length}건`,
      tone: "green",
    },
    {
      id: "pending",
      label: "승인 대기",
      value: `${pendingCount}건`,
      tone: "orange",
    },
    {
      id: "approved",
      label: "승인",
      value: `${approvedCount}건`,
      tone: "green",
    },
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
  const payrollTone: RecordsTone | undefined =
    mode === "after" ? "green" : undefined;

  return [
    detailLine("work-start", "근무 시작", formatTime(startAt), payrollTone),
    detailLine("work-end", "근무 종료", formatTime(endAt)),
    detailLine(
      "manager-action",
      mode === "after" ? "처리" : "관리자 처리",
      getSnapshotChangeLabel(snapshot),
    ),
  ];
}

function getTimelineBlockKind(options: {
  hasPendingCorrection: boolean;
  hasPendingOvertime: boolean;
  hasUnresolvedFlag: boolean;
}): RecordTimelineBlockKind {
  const actionableKind = getPendingActionKind(options);

  if (actionableKind) {
    return actionableKind;
  }

  if (options.hasUnresolvedFlag) {
    return "location-anomaly";
  }

  return "normal";
}

function getTimelineBlockSignalKinds({
  hasPendingCorrection,
  hasPendingOvertime,
  hasUnresolvedFlag,
}: {
  hasPendingCorrection: boolean;
  hasPendingOvertime: boolean;
  hasUnresolvedFlag: boolean;
}): readonly RecordTimelineBlockKind[] {
  const actionableKind = getPendingActionKind({
    hasPendingCorrection,
    hasPendingOvertime,
  });
  const signalKinds = [
    actionableKind,
    hasUnresolvedFlag ? "location-anomaly" : null,
  ].filter((kind): kind is RecordTimelineBlockKind => Boolean(kind));

  return signalKinds.length > 0 ? signalKinds : ["normal"];
}

function getPendingActionKind({
  hasPendingCorrection,
  hasPendingOvertime,
}: {
  hasPendingCorrection: boolean;
  hasPendingOvertime: boolean;
}): RecordTimelineBlockKind | null {
  if (hasPendingCorrection) {
    return "correction";
  }

  if (hasPendingOvertime) {
    return "overtime";
  }

  return null;
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

function getOvertimeHistoryStatus(status: string): OvertimeHistoryStatus {
  if (status === "approved") {
    return "승인";
  }

  if (status === "rejected") {
    return "반려";
  }

  if (status === "withdrawn") {
    return "철회";
  }

  return "신청됨";
}

function getOvertimeHistoryStatusTone(
  status: OvertimeHistoryStatus,
): RecordsTone {
  if (status === "승인") {
    return "green";
  }

  if (status === "신청됨") {
    return "orange";
  }

  if (status === "철회") {
    return "grey";
  }

  return "pink";
}

function getOvertimeHistoryPayrollLabel(work: OvertimeWorkModel) {
  if (work.status === "submitted") {
    return "미정";
  }

  if (work.status === "rejected" || work.status === "withdrawn") {
    return "급여 제외";
  }

  if (
    work.payrollStatus === "confirmed" ||
    work.payrollEffect === "confirmed" ||
    work.payrollEffect === "immediate" ||
    work.payrollEffect === "applied"
  ) {
    return "확정";
  }

  if (
    work.payrollStatus === "held" ||
    work.payrollEffect === "held" ||
    work.payrollEffect === "hold"
  ) {
    return "보류";
  }

  if (
    work.payrollStatus === "none" ||
    work.payrollEffect === "none" ||
    work.payrollEffect === "excluded"
  ) {
    return "급여 제외";
  }

  return getPayrollEffectLabel(work.payrollEffect || work.payrollStatus);
}

function getOvertimeHistoryPayrollTone(label: string): RecordsTone {
  if (label === "확정") {
    return "green";
  }

  if (label === "보류" || label === "미정") {
    return "orange";
  }

  if (label === "급여 제외") {
    return "grey";
  }

  return "grey";
}

function getOvertimePayModeLabel(work: OvertimeWorkModel) {
  if (work.status === "submitted") {
    return "미정";
  }

  if (work.payrollPayMode === "hourly") {
    return "시급 처리";
  }

  if (work.payrollPayMode === "fixed") {
    return "고정급 지급";
  }

  return "-";
}

function getOvertimeAmountLabel(work: OvertimeWorkModel) {
  if (work.payrollPayMode === "hourly") {
    return "시급 기준 산정";
  }

  if (work.amount == null) {
    return "-";
  }

  return `₩${Math.round(work.amount).toLocaleString("ko-KR")}`;
}

function getOvertimeHistoryNoteText(
  work: OvertimeWorkModel,
  status: OvertimeHistoryStatus,
) {
  if (work.managerNote) {
    return work.managerNote;
  }

  if (work.rejectedReason) {
    return work.rejectedReason;
  }

  if (status === "신청됨") {
    return "관리자 승인 또는 반려 전까지 급여 산정에는 반영되지 않습니다.";
  }

  if (status === "철회") {
    return "조교가 추가근무 신청을 철회했습니다.";
  }

  return "처리 메모가 등록되지 않았습니다.";
}

function getAttendanceLogStatus(log: AttendanceLogModel): AttendanceLogStatus {
  if (
    log.anomalyType !== "none" ||
    log.status === "needs_review" ||
    readString(log.checkInLocation.result, "inside_radius") !==
      "inside_radius" ||
    (log.checkOutLocation &&
      readString(log.checkOutLocation.result, "inside_radius") !==
        "inside_radius")
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

  const radiusMeters = readNumber(
    attendance?.checkOutLocation?.radiusMeters,
    0,
  );

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
  if (effect === "applied") {
    return "반영";
  }

  if (effect === "immediate" || effect === "confirmed") {
    return "즉시";
  }

  if (effect === "hold" || effect === "held") {
    return "보류";
  }

  if (effect === "none" || effect === "excluded") {
    return "급여 제외";
  }

  return "변경 없음";
}

function getRecordDayId(record: WorkRecordModel): RecordTimelineDayId {
  const date = parseDateKey(record.dateKey) ?? getRecordWorkStartAt(record);

  return date ? dayIdByDateIndex[date.getDay()] : "mon";
}

function getRecordWorkStartAt(record: WorkRecordModel) {
  return record.effectiveStartAt ?? record.plannedStartAt;
}

function getRecordWorkEndAt(record: WorkRecordModel) {
  return record.effectiveEndAt ?? record.plannedEndAt;
}

function getRecordStartHour(record: WorkRecordModel) {
  return getRecordWorkStartAt(record)?.getHours() ?? 8;
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
  return (
    records
      .map(getRecordDate)
      .filter((date): date is Date => Boolean(date))
      .sort((first, second) => second.getTime() - first.getTime())[0] ?? null
  );
}

function getRecordDate(record: WorkRecordModel) {
  return parseDateKey(record.dateKey) ?? getRecordWorkStartAt(record);
}

function getRecordDateKey(record: WorkRecordModel) {
  if (parseDateKey(record.dateKey)) {
    return record.dateKey;
  }

  const date = getRecordDate(record);

  return date ? formatDateKey(date) : "";
}

function getOvertimeStartAt(
  overtime: OvertimeWorkModel,
  attendance: AttendanceLogModel | null,
) {
  return overtime.extraStartAt ?? attendance?.checkOutAt ?? attendance?.checkInAt;
}

function getOvertimeEndAt(
  overtime: OvertimeWorkModel,
  attendance: AttendanceLogModel | null,
) {
  return overtime.extraEndAt ?? getOvertimeStartAt(overtime, attendance);
}

function getOvertimeDate(
  overtime: OvertimeWorkModel,
  attendance: AttendanceLogModel | null,
) {
  return (
    getOvertimeStartAt(overtime, attendance) ??
    parseDateKey(attendance?.date ?? "") ??
    overtime.submittedAt ??
    overtime.createdAt
  );
}

function getOvertimeDateKey(
  overtime: OvertimeWorkModel,
  attendance: AttendanceLogModel | null,
) {
  if (parseDateKey(attendance?.date ?? "")) {
    return attendance?.date ?? "";
  }

  const date = getOvertimeDate(overtime, attendance);

  return date ? formatDateKey(date) : "";
}

function getOvertimeDayId(
  overtime: OvertimeWorkModel,
  attendance: AttendanceLogModel | null,
): RecordTimelineDayId {
  const date = getOvertimeDate(overtime, attendance);

  return date ? dayIdByDateIndex[date.getDay()] : "mon";
}

function getOvertimeMonthKey(
  overtime: OvertimeWorkModel,
  attendance: AttendanceLogModel | null,
) {
  if (overtime.monthKey) {
    return overtime.monthKey;
  }

  const dateKey = getOvertimeDateKey(overtime, attendance);

  return dateKey ? dateKey.slice(0, 7) : "";
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate(),
  )}`;
}

function compareRecords(first: WorkRecordModel, second: WorkRecordModel) {
  return (
    getSortTime(getRecordSortDate(second)) -
      getSortTime(getRecordSortDate(first)) ||
    first.workerName.localeCompare(second.workerName, "ko-KR")
  );
}

function compareWorkers(first: WorkerModel, second: WorkerModel) {
  return first.name.localeCompare(second.name, "ko-KR");
}

function getRecordSortDate(record: WorkRecordModel) {
  return getRecordWorkStartAt(record) ?? parseDateKey(record.dateKey);
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

function formatTimeInputValue(date: Date | null | undefined) {
  if (!date) {
    return "";
  }

  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatTimeRange(
  start: Date | null | undefined,
  end: Date | null | undefined,
) {
  return `${formatTime(start)} - ${formatTime(end)}`;
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

function readNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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
