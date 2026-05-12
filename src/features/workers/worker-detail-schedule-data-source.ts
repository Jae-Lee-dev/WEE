import {
  collection,
  doc,
  getDoc,
  getDocs,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { resolveActiveWorkspaceId } from "@/features/entry/workspace-data-source";
import { readActiveWorkspaceId } from "@/features/entry/workspace-onboarding-state";
import { getFirebaseDb, isMockFirebaseProject } from "@/lib/firebase/client";
import {
  workerDetailProfile,
  type WorkerDetailProfile,
} from "./worker-detail-common-fixtures";
import {
  workerDetailRecentWorkRecords,
  workerDetailScheduleBlocks,
  workerDetailScheduleHistory,
  type WorkerDetailScheduleBlock,
  type WorkerDetailScheduleHistory,
  type WorkerDetailScheduleTone,
  type WorkerDetailWorkRecord,
} from "./worker-detail-schedule-fixtures";

export type WorkerDetailScheduleViewModel = {
  blocks: readonly WorkerDetailScheduleBlock[];
  history: readonly WorkerDetailScheduleHistory[];
  profile: WorkerDetailProfile;
  recentRecords: readonly WorkerDetailWorkRecord[];
};

export type WorkerDetailScheduleDataSource = {
  initialData?: WorkerDetailScheduleViewModel;
  getSchedule: (workerId: string) => Promise<WorkerDetailScheduleViewModel>;
};

type FirestoreDocument = {
  data: Record<string, unknown>;
  id: string;
};

type ScheduleCollections = {
  anomalyFlags: readonly FirestoreDocument[];
  duties: readonly FirestoreDocument[];
  payrollSettings: readonly FirestoreDocument[];
  scheduleRequests: readonly FirestoreDocument[];
  scheduleVersions: readonly FirestoreDocument[];
  workerTags: readonly FirestoreDocument[];
  workRecords: readonly FirestoreDocument[];
};

type DutyModel = {
  endTime: string;
  id: string;
  locationName: string;
  name: string;
  startTime: string;
  weekday: string;
};

type PayrollSetting = {
  effectiveFrom: string | null;
  hourlyRate: number | null;
  monthlySalary: number | null;
  payrollType: string;
  workerId: string;
};

type ScheduleVersion = {
  activeFrom: string;
  activeTo: string | null;
  createdAt: Date | null;
  id: string;
  origin: string;
  reason: string | null;
  slots: readonly ScheduleSlot[];
  status: string;
  versionNo: number;
  workerId: string;
};

type ScheduleRequest = {
  createdAt: Date | null;
  id: string;
  requestedActiveFrom: string | null;
  slots: readonly ScheduleSlot[];
  status: string;
  submittedAt: Date | null;
  workerId: string;
};

type ScheduleSlot = {
  dutyId: string;
  dutyName: string;
  endTime: string;
  locationName: string;
  startTime: string;
  weekday: string;
};

type WorkerTag = {
  id: string;
  label: string;
  status: string;
};

type WorkRecord = {
  anomalyType: string;
  dateKey: string;
  dutyName: string;
  effectiveEndAt: Date | null;
  effectiveStartAt: Date | null;
  id: string;
  plannedEndAt: Date | null;
  plannedStartAt: Date | null;
  status: string;
  workerId: string;
};

type AnomalyFlag = {
  anomalyType: string;
  status: string;
  workRecordId: string | null;
};

const fixtureWorkerDetailScheduleData = {
  blocks: workerDetailScheduleBlocks,
  history: workerDetailScheduleHistory,
  profile: workerDetailProfile,
  recentRecords: workerDetailRecentWorkRecords,
} as const satisfies WorkerDetailScheduleViewModel;

const dayIdByWeekday: Record<string, WorkerDetailScheduleBlock["dayId"]> = {
  friday: "fri",
  fri: "fri",
  monday: "mon",
  mon: "mon",
  saturday: "sat",
  sat: "sat",
  sunday: "sun",
  sun: "sun",
  thursday: "thu",
  thu: "thu",
  tuesday: "tue",
  tue: "tue",
  wednesday: "wed",
  wed: "wed",
  금: "fri",
  금요일: "fri",
  목: "thu",
  목요일: "thu",
  수: "wed",
  수요일: "wed",
  월: "mon",
  월요일: "mon",
  일: "sun",
  일요일: "sun",
  토: "sat",
  토요일: "sat",
  화: "tue",
  화요일: "tue",
};

const dayLabelById: Record<WorkerDetailScheduleBlock["dayId"], string> = {
  fri: "금",
  mon: "월",
  sat: "토",
  sun: "일",
  thu: "목",
  tue: "화",
  wed: "수",
};

const blockTones = ["green", "orange", "blue"] as const;

export function createWorkerDetailScheduleDataSource(): WorkerDetailScheduleDataSource {
  if (shouldUseVisualMockDataSource()) {
    return {
      initialData: fixtureWorkerDetailScheduleData,
      async getSchedule() {
        return fixtureWorkerDetailScheduleData;
      },
    };
  }

  return {
    async getSchedule(workerId) {
      const workspaceId = await requireActiveWorkspaceId();
      const [workerSnapshot, collections] = await Promise.all([
        getDoc(doc(getFirebaseDb(), "workspaces", workspaceId, "workers", workerId)),
        loadScheduleCollections(workspaceId),
      ]);

      if (!workerSnapshot.exists()) {
        throw new Error("조교 정보를 찾을 수 없습니다.");
      }

      const workerData = workerSnapshot.data() as Record<string, unknown>;
      const duties = collections.duties.map(mapDuty);
      const dutyById = new Map(duties.map((duty) => [duty.id, duty]));
      const versions = collections.scheduleVersions
        .map(mapScheduleVersion)
        .filter((version) => version.workerId === workerId)
        .sort(compareScheduleVersions);
      const activeVersion = selectActiveVersion(versions);
      const requests = collections.scheduleRequests
        .map(mapScheduleRequest)
        .filter((request) => request.workerId === workerId);
      const records = collections.workRecords
        .map(mapWorkRecord)
        .filter((record) => record.workerId === workerId)
        .sort(compareWorkRecordsDesc);
      const flagByRecordId = new Map(
        collections.anomalyFlags
          .map(mapAnomalyFlag)
          .filter((flag) => flag.workRecordId)
          .map((flag) => [flag.workRecordId as string, flag]),
      );
      const tags = collections.workerTags.map(mapWorkerTag);
      const tagById = new Map(tags.map((tag) => [tag.id, tag]));
      const setting = collections.payrollSettings
        .map(mapPayrollSetting)
        .filter((item) => item.workerId === workerId)
        .sort(comparePayrollSettings)[0];

      return {
        blocks: activeVersion
          ? buildScheduleBlocks(activeVersion.slots, dutyById)
          : [],
        history: buildScheduleHistory({ dutyById, requests, versions }),
        profile: buildProfile({
          records,
          setting,
          tagById,
          workerData,
        }),
        recentRecords: records.slice(0, 10).map((record) =>
          mapRecentRecord(record, flagByRecordId.get(record.id) ?? null),
        ),
      };
    },
  };
}

async function loadScheduleCollections(
  workspaceId: string,
): Promise<ScheduleCollections> {
  const [
    anomalyFlags,
    duties,
    payrollSettings,
    scheduleRequests,
    scheduleVersions,
    workerTags,
    workRecords,
  ] = await Promise.all([
    readWorkspaceCollection(workspaceId, "anomalyFlags"),
    readWorkspaceCollection(workspaceId, "duties"),
    readWorkspaceCollection(workspaceId, "payrollSettings"),
    readWorkspaceCollection(workspaceId, "scheduleRequests"),
    readWorkspaceCollection(workspaceId, "scheduleVersions"),
    readWorkspaceCollection(workspaceId, "workerTags"),
    readWorkspaceCollection(workspaceId, "workRecords"),
  ]);

  return {
    anomalyFlags,
    duties,
    payrollSettings,
    scheduleRequests,
    scheduleVersions,
    workerTags,
    workRecords,
  };
}

async function readWorkspaceCollection(
  workspaceId: string,
  collectionName: keyof ScheduleCollections,
) {
  const snapshot = await getDocs(
    collection(getFirebaseDb(), "workspaces", workspaceId, collectionName),
  );

  return snapshot.docs.map(mapDocument);
}

function buildProfile({
  records,
  setting,
  tagById,
  workerData,
}: {
  records: readonly WorkRecord[];
  setting?: PayrollSetting;
  tagById: ReadonlyMap<string, WorkerTag>;
  workerData: Record<string, unknown>;
}): WorkerDetailProfile {
  const name = readString(workerData.name, readString(workerData.displayName, "이름 없는 조교"));
  const tagIds = readStringArray(workerData.tagIds);
  const tag = tagIds
    .map((tagId) => tagById.get(tagId))
    .filter(
      (item): item is WorkerTag =>
        item !== undefined && item.status !== "deleted",
    )
    .map((item) => item.label)
    .join(" · ");
  const monthKey = records[0]?.dateKey.slice(0, 7) ?? "";
  const monthlyMinutes = records
    .filter((record) => record.dateKey.startsWith(monthKey))
    .reduce((total, record) => total + getRecordMinutes(record), 0);

  return {
    deleteLabel: workerDetailProfile.deleteLabel,
    monthlySummary: monthKey
      ? `${formatMonthKorean(monthKey)} ${formatHours(monthlyMinutes)} 근무`
      : "근무시간 집계 전",
    name,
    paySummary: formatPayrollBasis(setting),
    registeredSummary: `${formatDateLabel(readDate(workerData.approvedAt) ?? readDate(workerData.createdAt))} 등록`,
    status: readWorkerStatus(workerData),
    tag: tag || "태그 없음",
  };
}

function buildScheduleBlocks(
  slots: readonly ScheduleSlot[],
  dutyById: ReadonlyMap<string, DutyModel>,
): readonly WorkerDetailScheduleBlock[] {
  return slots.flatMap((slot, index) => {
    const duty = dutyById.get(slot.dutyId);
    const weekday = slot.weekday || duty?.weekday || "";
    const dayId = dayIdByWeekday[weekday.toLowerCase()] ?? dayIdByWeekday[weekday];
    const startTime = slot.startTime || duty?.startTime || "";
    const endTime = slot.endTime || duty?.endTime || "";
    const startHour = readHour(startTime);
    const endHour = readHour(endTime);

    if (!dayId || startHour === null || endHour === null) {
      return [];
    }

    return [
      {
        dayId,
        endHour,
        id: `${slot.dutyId}-${dayId}-${index}`,
        startHour,
        title: slot.dutyName || duty?.name || "근무 이름 없음",
        tone: blockTones[index % blockTones.length] satisfies WorkerDetailScheduleTone,
      },
    ];
  });
}

function buildScheduleHistory({
  dutyById,
  requests,
  versions,
}: {
  dutyById: ReadonlyMap<string, DutyModel>;
  requests: readonly ScheduleRequest[];
  versions: readonly ScheduleVersion[];
}): readonly WorkerDetailScheduleHistory[] {
  const activeVersion = selectActiveVersion(versions);
  const versionRows: WorkerDetailScheduleHistory[] = versions.map((version) => ({
    actionLabel: "시간표 보기",
    id: version.id,
    memo:
      version.reason ??
      (version.origin === "manager_edit" ? "관리자 직접 수정" : "관리자 승인"),
    status:
      version.id === activeVersion?.id && version.status === "active"
        ? "활성"
        : "종료",
    title: `${formatDateKeyDot(version.activeFrom)} 시간표`,
    workDays: summarizeSlotDays(version.slots, dutyById),
  }));
  const pendingRows = requests
    .filter((request) => request.status === "submitted")
    .sort((left, right) => getSortTime(right.submittedAt ?? right.createdAt) - getSortTime(left.submittedAt ?? left.createdAt))
    .map((request) => ({
      actionLabel: "요청 보기",
      id: request.id,
      memo: "승인 대기",
      status: "대기" as const,
      title: `${formatDateKeyDot(request.requestedActiveFrom ?? formatDateKey(request.submittedAt ?? request.createdAt))} 변경 요청`,
      workDays: summarizeSlotDays(request.slots, dutyById),
    }));

  return [...pendingRows, ...versionRows];
}

function summarizeSlotDays(
  slots: readonly ScheduleSlot[],
  dutyById: ReadonlyMap<string, DutyModel>,
) {
  const labels = unique(
    slots
      .map((slot) => {
        const duty = dutyById.get(slot.dutyId);
        const weekday = slot.weekday || duty?.weekday || "";
        const dayId = dayIdByWeekday[weekday.toLowerCase()] ?? dayIdByWeekday[weekday];

        return dayId ? dayLabelById[dayId] : "";
      })
      .filter(Boolean),
  );

  return labels.length > 0 ? `${labels.join(", ")} 근무` : "근무일 확인 필요";
}

function mapRecentRecord(
  record: WorkRecord,
  flag: AnomalyFlag | null,
): WorkerDetailWorkRecord {
  const label = flag
    ? flag.status === "unresolved"
      ? getAnomalyLabel(flag.anomalyType)
      : "처리 완료"
    : record.anomalyType === "none"
      ? "정상"
      : getAnomalyLabel(record.anomalyType);

  return {
    date: formatDateKeyShort(record.dateKey),
    duty: record.dutyName,
    flag: label,
    id: record.id,
    time: `${formatTime(record.effectiveStartAt ?? record.plannedStartAt)}~${formatTime(
      record.effectiveEndAt ?? record.plannedEndAt,
    )}`,
    tone: label === "정상" || label === "처리 완료" ? "green" : label.includes("위치") ? "orange" : "red",
  };
}

function selectActiveVersion(versions: readonly ScheduleVersion[]) {
  return (
    versions.find((version) => version.status === "active" && !version.activeTo) ??
    versions.find((version) => version.status === "active") ??
    versions[0] ??
    null
  );
}

function compareScheduleVersions(left: ScheduleVersion, right: ScheduleVersion) {
  return (
    right.versionNo - left.versionNo ||
    getSortTime(right.createdAt) - getSortTime(left.createdAt) ||
    right.activeFrom.localeCompare(left.activeFrom)
  );
}

function comparePayrollSettings(left: PayrollSetting, right: PayrollSetting) {
  return (right.effectiveFrom ?? "").localeCompare(left.effectiveFrom ?? "");
}

function compareWorkRecordsDesc(left: WorkRecord, right: WorkRecord) {
  return right.dateKey.localeCompare(left.dateKey);
}

function mapDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): FirestoreDocument {
  return {
    data: snapshot.data() as Record<string, unknown>,
    id: snapshot.id,
  };
}

function mapDuty(document: FirestoreDocument): DutyModel {
  return {
    endTime: readString(document.data.endTime, ""),
    id: document.id,
    locationName: readString(document.data.locationName, "근무지 미지정"),
    name: readString(document.data.name, "근무 이름 없음"),
    startTime: readString(document.data.startTime, ""),
    weekday: readString(document.data.weekday, ""),
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

function mapScheduleVersion(document: FirestoreDocument): ScheduleVersion {
  const data = document.data;

  return {
    activeFrom: readString(data.activeFrom, ""),
    activeTo: readNullableString(data.activeTo),
    createdAt: readDate(data.createdAt),
    id: document.id,
    origin: readString(data.origin, ""),
    reason: readNullableString(data.reason),
    slots: readSlots(data.slots),
    status: readString(data.status, ""),
    versionNo: readNumber(data.versionNo, 0),
    workerId: readString(data.workerId, ""),
  };
}

function mapScheduleRequest(document: FirestoreDocument): ScheduleRequest {
  const data = document.data;

  return {
    createdAt: readDate(data.createdAt),
    id: document.id,
    requestedActiveFrom: readNullableString(data.requestedActiveFrom),
    slots: readSlots(data.slots),
    status: readString(data.status, ""),
    submittedAt: readDate(data.submittedAt),
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
  const data = document.data;

  return {
    anomalyType: readString(data.anomalyType, "none"),
    dateKey: readString(data.dateKey ?? data.date, ""),
    dutyName: readString(data.dutyName, "근무 이름 없음"),
    effectiveEndAt: readDate(data.effectiveEndAt),
    effectiveStartAt: readDate(data.effectiveStartAt),
    id: document.id,
    plannedEndAt: readDate(data.plannedEndAt),
    plannedStartAt: readDate(data.plannedStartAt),
    status: readString(data.status, ""),
    workerId: readString(data.workerId, ""),
  };
}

function mapAnomalyFlag(document: FirestoreDocument): AnomalyFlag {
  return {
    anomalyType: readString(document.data.anomalyType, "none"),
    status: readString(document.data.status, ""),
    workRecordId: readNullableString(document.data.workRecordId),
  };
}

function readSlots(value: unknown): readonly ScheduleSlot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((slot) => {
    const data = readRecord(slot);

    return {
      dutyId: readString(data.dutyId, ""),
      dutyName: readString(data.dutyName, ""),
      endTime: readString(data.endTime, ""),
      locationName: readString(data.locationName, ""),
      startTime: readString(data.startTime, ""),
      weekday: readString(data.weekday, ""),
    };
  });
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

function getRecordMinutes(record: WorkRecord) {
  const start = record.effectiveStartAt ?? record.plannedStartAt;
  const end = record.effectiveEndAt ?? record.plannedEndAt;

  if (!start || !end) {
    return 0;
  }

  return Math.max(Math.round((end.getTime() - start.getTime()) / 60000), 0);
}

function formatHours(minutes: number) {
  if (minutes <= 0) {
    return "0시간";
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest > 0 ? `${hours}시간 ${rest}분` : `${hours}시간`;
}

function formatWon(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
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

function readHour(value: string) {
  const hour = Number(value.split(":")[0]);

  return Number.isFinite(hour) ? hour : null;
}

function formatDateLabel(value: Date | null) {
  if (!value) {
    return "등록일 확인 필요";
  }

  return `${value.getFullYear()}.${String(value.getMonth() + 1).padStart(2, "0")}.${String(
    value.getDate(),
  ).padStart(2, "0")}`;
}

function formatDateKey(value: Date | null) {
  if (!value) {
    return "";
  }

  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate(),
  ).padStart(2, "0")}`;
}

function formatDateKeyDot(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value || "일자 확인 필요";
  }

  return `${year}.${month}.${day}`;
}

function formatDateKeyShort(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value || "-";
  }

  return `${year.slice(2)}.${month}.${day}`;
}

function formatMonthKorean(monthKey: string) {
  const [year, month] = monthKey.split("-");

  return `${year}년 ${Number(month)}월`;
}

function formatTime(value: Date | null) {
  if (!value) {
    return "--:--";
  }

  return `${String(value.getHours()).padStart(2, "0")}:${String(
    value.getMinutes(),
  ).padStart(2, "0")}`;
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

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function unique<T>(values: readonly T[]) {
  return Array.from(new Set(values));
}
