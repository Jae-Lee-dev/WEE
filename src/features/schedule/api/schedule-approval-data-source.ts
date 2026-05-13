import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { resolveActiveWorkspaceId } from "@/entities/workspace";
import { readActiveWorkspaceId } from "@/entities/workspace";
import {
  getFirebaseAuth,
  getFirebaseDb,
  isMockFirebaseProject,
} from "@/shared/api/firebase/client";
import {
  scheduleApprovalRequests,
  scheduleApprovalSummary,
  type ScheduleApprovalRequestDetail,
  type ScheduleApprovalRequestRow,
  type ScheduleRequestKind,
  type ScheduleTimelineBlock,
  type ScheduleTimelineDayId,
} from "../model/schedule-fixtures";

export type ScheduleApprovalViewModel = {
  approveLabel: string;
  listCountText: string;
  rejectLabel: string;
  rows: readonly ScheduleApprovalRequestRow[];
  selectedRequestId: string;
};

export type ScheduleApprovalDataSource = {
  approveRequest: (input: ApproveScheduleRequestInput) => Promise<ScheduleApprovalViewModel>;
  initialData?: ScheduleApprovalViewModel;
  listApprovalRequests: () => Promise<ScheduleApprovalViewModel>;
  rejectRequest: (input: RejectScheduleRequestInput) => Promise<ScheduleApprovalViewModel>;
};

export type ApproveScheduleRequestInput = {
  requestId: string;
  slotEdits?: readonly ScheduleSlotEdit[];
};

export type RejectScheduleRequestInput = {
  reason: string;
  requestId: string;
};

export type ScheduleSlotEdit = {
  endTime: string;
  sourceSlotIndex: number;
  startTime: string;
};

type FirestoreDocument = {
  data: Record<string, unknown>;
  id: string;
};

type DutyModel = {
  endTime: string;
  id: string;
  locationId: string;
  locationName: string;
  name: string;
  startTime: string;
  tagLabels: readonly string[];
  weekday: string;
};

type WorkerModel = {
  id: string;
  name: string;
  status: string;
  tagIds: readonly string[];
};

type WorkerTagModel = {
  id: string;
  label: string;
};

type ScheduleRequestModel = {
  createdAt: Date | null;
  id: string;
  requestType: ScheduleRequestKind;
  slots: readonly ScheduleRequestSlot[];
  status: string;
  submittedAt: Date | null;
  workerId: string;
  workerName: string;
};

type ScheduleRequestSlot = {
  dutyId: string;
  endTime: string;
  startTime: string;
  weekday: string;
  workerId: string;
} & Record<string, unknown>;

const dayIdByKoreanWeekday: Record<string, ScheduleTimelineDayId> = {
  금: "fri",
  목: "thu",
  수: "wed",
  월: "mon",
  일: "sun",
  토: "sat",
  화: "tue",
};

export function createScheduleApprovalDataSource(): ScheduleApprovalDataSource {
  if (shouldUseFixtureDataSource()) {
    return createFixtureScheduleApprovalDataSource();
  }

  return createFirestoreScheduleApprovalDataSource();
}

function createFixtureScheduleApprovalDataSource(): ScheduleApprovalDataSource {
  let viewModel = getFixtureViewModel();

  return {
    initialData: viewModel,
    async approveRequest(input) {
      viewModel = {
        ...viewModel,
        listCountText: String(
          viewModel.rows.filter((row) => row.id !== input.requestId).length,
        ),
        rows: viewModel.rows.filter((row) => row.id !== input.requestId),
      };

      return viewModel;
    },
    async listApprovalRequests() {
      return viewModel;
    },
    async rejectRequest(input) {
      viewModel = {
        ...viewModel,
        listCountText: String(
          viewModel.rows.filter((row) => row.id !== input.requestId).length,
        ),
        rows: viewModel.rows.filter((row) => row.id !== input.requestId),
      };

      return viewModel;
    },
  };
}

function createFirestoreScheduleApprovalDataSource(): ScheduleApprovalDataSource {
  async function listApprovalRequests() {
    const workspaceId = await requireActiveWorkspaceId();
    const [requests, duties, locations, workers, workerTags] = await Promise.all([
      readWorkspaceCollection(workspaceId, "scheduleRequests"),
      readWorkspaceCollection(workspaceId, "duties"),
      readWorkspaceCollection(workspaceId, "locations"),
      readWorkspaceCollection(workspaceId, "workers"),
      readWorkspaceCollection(workspaceId, "workerTags"),
    ]);
    const locationNameById = new Map(
      locations.map((location) => [
        location.id,
        readString(location.data.name, "근무지 미지정"),
      ]),
    );
    const dutyById = new Map(
      duties.map((duty) => {
        const model = mapDutyDocument(duty, locationNameById);

        return [model.id, model];
      }),
    );
    const workerById = new Map(
      workers.map(mapWorkerDocument).map((worker) => [worker.id, worker]),
    );
    const workerTagById = new Map(
      workerTags.map(mapWorkerTagDocument).map((tag) => [tag.id, tag]),
    );
    const rows = requests
      .map(mapScheduleRequestDocument)
      .filter((request) => isPendingScheduleRequest(request.status))
      .sort(compareRequests)
      .map((request) =>
        mapRequestRow({
          dutyById,
          request,
          worker: workerById.get(request.workerId),
          workerTagById,
        }),
      );

    return {
      approveLabel: scheduleApprovalSummary.approveLabel,
      listCountText: String(rows.length),
      rejectLabel: scheduleApprovalSummary.rejectLabel,
      rows,
      selectedRequestId: rows[0]?.id ?? "",
    };
  }

  return {
    async approveRequest(input) {
      const workspaceId = await requireActiveWorkspaceId();
      const db = getFirebaseDb();
      const [requests, versions] = await Promise.all([
        readWorkspaceCollection(workspaceId, "scheduleRequests"),
        readWorkspaceCollection(workspaceId, "scheduleVersions"),
      ]);
      const request = requests
        .map(mapScheduleRequestDocument)
        .find((item) => item.id === input.requestId);

      if (!request) {
        throw new Error("시간표 요청을 찾을 수 없습니다.");
      }

      const batch = writeBatch(db);
      const decidedBy = getFirebaseAuth().currentUser?.uid ?? null;
      const editedSlots = applySlotEdits(request.slots, input.slotEdits ?? []);
      const activeVersions = versions.filter((version) => {
        const data = version.data;

        return (
          readString(data.workerId, "") === request.workerId &&
          readString(data.status, "") === "active"
        );
      });
      const nextVersionNo =
        activeVersions.reduce(
          (max, version) => Math.max(max, readNumber(version.data.versionNo, 0)),
          0,
        ) + 1;
      const today = getTodayDateKey();

      activeVersions.forEach((version) => {
        batch.update(doc(db, "workspaces", workspaceId, "scheduleVersions", version.id), {
          activeTo: today,
          status: "archived",
          updatedAt: serverTimestamp(),
        });
      });
      batch.update(doc(db, "workspaces", workspaceId, "scheduleRequests", input.requestId), {
        approvedAt: serverTimestamp(),
        decidedAt: serverTimestamp(),
        decidedBy,
        slots: editedSlots,
        status: "approved",
        updatedAt: serverTimestamp(),
      });
      batch.set(
        doc(
          db,
          "workspaces",
          workspaceId,
          "scheduleVersions",
          `schedule_version_${request.workerId}_${input.requestId}`,
        ),
        {
          activeFrom: today,
          activeTo: null,
          approvedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          createdBy: decidedBy,
          origin:
            request.requestType === "change"
              ? "worker_request_change"
              : "worker_request",
          requestId: input.requestId,
          slots: editedSlots,
          status: "active",
          updatedAt: serverTimestamp(),
          versionNo: nextVersionNo,
          workerId: request.workerId,
          workerName: request.workerName,
          workspaceId,
        },
      );

      await batch.commit();

      return listApprovalRequests();
    },
    listApprovalRequests,
    async rejectRequest(input) {
      const workspaceId = await requireActiveWorkspaceId();
      const db = getFirebaseDb();
      const batch = writeBatch(db);

      batch.update(doc(db, "workspaces", workspaceId, "scheduleRequests", input.requestId), {
        decidedAt: serverTimestamp(),
        decidedBy: getFirebaseAuth().currentUser?.uid ?? null,
        rejectionReason: input.reason,
        status: "rejected",
        updatedAt: serverTimestamp(),
      });
      await batch.commit();

      return listApprovalRequests();
    },
  };
}

function getFixtureViewModel(): ScheduleApprovalViewModel {
  return {
    approveLabel: scheduleApprovalSummary.approveLabel,
    listCountText: scheduleApprovalSummary.listCountText,
    rejectLabel: scheduleApprovalSummary.rejectLabel,
    rows: scheduleApprovalRequests,
    selectedRequestId: scheduleApprovalSummary.selectedRequestId,
  };
}

async function readWorkspaceCollection(
  workspaceId: string,
  collectionName: string,
): Promise<readonly FirestoreDocument[]> {
  const snapshot = await getDocs(
    collection(getFirebaseDb(), "workspaces", workspaceId, collectionName),
  );

  return snapshot.docs.map(mapDocument);
}

function mapDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): FirestoreDocument {
  return {
    data: snapshot.data() as Record<string, unknown>,
    id: snapshot.id,
  };
}

function mapDutyDocument(
  document: FirestoreDocument,
  locationNameById: ReadonlyMap<string, string>,
): DutyModel {
  const data = document.data;
  const locationId = readString(data.locationId, "");

  return {
    endTime: readString(data.endTime, ""),
    id: document.id,
    locationId,
    locationName:
      readString(data.locationName, "") ||
      locationNameById.get(locationId) ||
      "근무지 미지정",
    name: readString(data.name, "근무 이름 없음"),
    startTime: readString(data.startTime, ""),
    tagLabels: readStringArray(data.tagLabels ?? data.tags),
    weekday: readString(data.weekday, ""),
  };
}

function mapWorkerDocument(document: FirestoreDocument): WorkerModel {
  const data = document.data;

  return {
    id: document.id,
    name: readString(data.name, "이름 없는 조교"),
    status: readString(data.status, "active"),
    tagIds: readStringArray(data.tagIds),
  };
}

function mapWorkerTagDocument(document: FirestoreDocument): WorkerTagModel {
  const data = document.data;

  return {
    id: document.id,
    label: readString(data.name, readString(data.label, "태그 없음")),
  };
}

function mapScheduleRequestDocument(
  document: FirestoreDocument,
): ScheduleRequestModel {
  const data = document.data;

  return {
    createdAt: readDate(data.createdAt),
    id: document.id,
    requestType: readRequestType(data.requestType),
    slots: readSlots(data.slots),
    status: readString(data.status, ""),
    submittedAt: readDate(data.submittedAt),
    workerId: readString(data.workerId, ""),
    workerName: readString(data.workerName, "이름 없는 조교"),
  };
}

function mapRequestRow({
  dutyById,
  request,
  worker,
  workerTagById,
}: {
  dutyById: ReadonlyMap<string, DutyModel>;
  request: ScheduleRequestModel;
  worker: WorkerModel | undefined;
  workerTagById: ReadonlyMap<string, WorkerTagModel>;
}): ScheduleApprovalRequestRow {
  const blocks = request.slots
    .map((slot, index) =>
      mapTimelineBlock({
        duty: dutyById.get(slot.dutyId),
        index,
        request,
        slot,
      }),
    )
    .filter((block): block is ScheduleTimelineBlock => block !== null);
  const firstBlock = blocks[0];
  const submittedAt = request.submittedAt ?? request.createdAt;
  const requestKindText = request.requestType === "initial" ? "최초" : "변경";
  const workerName = worker?.name ?? request.workerName;
  const workerTag =
    worker?.tagIds
      .map((tagId) => workerTagById.get(tagId)?.label)
      .find((label): label is string => Boolean(label)) ?? "태그 없음";
  const detail = createRequestDetail({
    blocks,
    firstBlock,
    request,
    requestKindText,
    submittedAt,
    workerName,
    workerStatusText: worker?.status === "inactive" ? "비활성" : "활성",
    workerTag,
  });

  return {
    id: request.id,
    dutyName: firstBlock?.label ?? "근무 미지정",
    reasonText: firstBlock ? `${firstBlock.label} ${requestKindText}` : "시간표 변경 요청",
    requestDate: formatShortDate(submittedAt),
    requestKind: request.requestType,
    requestKindText,
    requestedTime: firstBlock?.time ?? "-",
    selectedDetail: detail,
    statusText: "승인 대기",
    workerName,
  };
}

function mapTimelineBlock({
  duty,
  index,
  request,
  slot,
}: {
  duty: DutyModel | undefined;
  index: number;
  request: ScheduleRequestModel;
  slot: ScheduleRequestSlot;
}): ScheduleTimelineBlock | null {
  const weekday = duty?.weekday || slot.weekday;
  const dayId = dayIdByKoreanWeekday[weekday];

  if (!dayId) {
    return null;
  }

  const startTime = slot.startTime || duty?.startTime || "";
  const endTime = slot.endTime || duty?.endTime || "";
  const tagLabel = duty?.tagLabels[0];

  return {
    id: `${request.id}-${slot.dutyId || index}`,
    dayId,
    endHour: parseHour(endTime, parseHour(startTime, 0) + 1),
    label: duty?.name ?? "근무 이름 없음",
    locationName: duty?.locationName ?? "근무지 미지정",
    sourceSlotIndex: index,
    startHour: parseHour(startTime, 8),
    tagLabel,
    time: startTime && endTime ? `${startTime}~${endTime}` : "-",
    tone: request.requestType === "initial" ? "green" : "orange",
    worker: request.workerName,
  };
}

function createRequestDetail({
  blocks,
  firstBlock,
  request,
  requestKindText,
  submittedAt,
  workerName,
  workerStatusText,
  workerTag,
}: {
  blocks: readonly ScheduleTimelineBlock[];
  firstBlock: ScheduleTimelineBlock | undefined;
  request: ScheduleRequestModel;
  requestKindText: string;
  submittedAt: Date | null;
  workerName: string;
  workerStatusText: string;
  workerTag: string;
}): ScheduleApprovalRequestDetail {
  const [adjustmentStartTime = "", adjustmentEndTime = ""] =
    firstBlock?.time.split("~") ?? [];

  return {
    adjustmentDayText: firstBlock
      ? getKoreanDayLabel(firstBlock.dayId)
      : "근무일 미지정",
    adjustmentDutyName: firstBlock?.label ?? "근무 미지정",
    adjustmentEndTime,
    adjustmentLocationName: firstBlock?.locationName ?? "근무지 미지정",
    adjustmentStartTime,
    adjustmentTimeText: firstBlock?.time ?? "-",
    correctionStatusText: "없음",
    rejectDialog: {
      confirmLabel: "반려 확정하기",
      reasonLabel: "반려 사유 (선택)",
      reasonPlaceholder: "반려 사유를 입력해 주세요",
      title: "시간표 반려",
    },
    submittedAt: formatMonthDay(submittedAt),
    submittedBlockCountText: `${request.slots.length}건`,
    submittedKindText: requestKindText,
    timelineBlocks: blocks,
    workerName,
    workerStatusText,
    workerTag,
  };
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

function isPendingScheduleRequest(status: string) {
  return status === "submitted" || status === "pending";
}

function compareRequests(left: ScheduleRequestModel, right: ScheduleRequestModel) {
  return getTime(right.submittedAt ?? right.createdAt) -
    getTime(left.submittedAt ?? left.createdAt);
}

function readRequestType(value: unknown): ScheduleRequestKind {
  return value === "initial" ? "initial" : "change";
}

function readSlots(value: unknown): ScheduleRequestSlot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const slot = readRecord(item);

    return {
      ...slot,
      dutyId: readString(slot.dutyId, ""),
      endTime: readString(slot.endTime, ""),
      startTime: readString(slot.startTime, ""),
      weekday: readString(slot.weekday, ""),
      workerId: readString(slot.workerId, ""),
    };
  });
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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

function parseHour(value: string, fallback: number) {
  const hour = Number(value.split(":")[0]);

  return Number.isFinite(hour) ? hour : fallback;
}

function formatShortDate(date: Date | null) {
  if (!date) {
    return "-";
  }

  return `${String(date.getFullYear()).slice(2)}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;
}

function formatMonthDay(date: Date | null) {
  if (!date) {
    return "-";
  }

  return `${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;
}

function getKoreanDayLabel(dayId: ScheduleTimelineDayId) {
  const labels: Record<ScheduleTimelineDayId, string> = {
    fri: "금요일",
    mon: "월요일",
    sat: "토요일",
    sun: "일요일",
    thu: "목요일",
    tue: "화요일",
    wed: "수요일",
  };

  return labels[dayId];
}

function getTime(date: Date | null) {
  return date?.getTime() ?? 0;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function applySlotEdits(
  slots: readonly ScheduleRequestSlot[],
  edits: readonly ScheduleSlotEdit[],
) {
  const editByIndex = new Map(edits.map((edit) => [edit.sourceSlotIndex, edit]));

  return slots.map((slot, index) => {
    const edit = editByIndex.get(index);

    return edit
      ? {
          ...slot,
          endTime: edit.endTime,
          startTime: edit.startTime,
        }
      : slot;
  });
}

function getTodayDateKey() {
  const now = new Date();

  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}
