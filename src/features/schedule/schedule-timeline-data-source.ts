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
  scheduleSelectedWorkerContext,
  scheduleTimelineBlocks,
  scheduleTimelineFilters,
  type ScheduleFilterOption,
  type ScheduleSelectedWorkerAssignment,
  type ScheduleSelectedWorkerContext,
  type ScheduleTimelineBlock,
  type ScheduleTimelineDayId,
  type ScheduleTimelineFilters,
  type ScheduleTimelineTone,
} from "./schedule-fixtures";

export type ScheduleTimelineViewModel = {
  blocks: readonly ScheduleTimelineBlock[];
  filters: ScheduleTimelineFilters;
  workerContexts: readonly ScheduleSelectedWorkerContext[];
};

export type ScheduleTimelineDataSource = {
  initialData?: ScheduleTimelineViewModel;
  getTimeline: () => Promise<ScheduleTimelineViewModel>;
};

type FirestoreDocument = {
  data: Record<string, unknown>;
  id: string;
};

type TimelineCollections = {
  dutyTags: readonly FirestoreDocument[];
  duties: readonly FirestoreDocument[];
  locations: readonly FirestoreDocument[];
  scheduleVersions: readonly FirestoreDocument[];
  workers: readonly FirestoreDocument[];
  workerTags: readonly FirestoreDocument[];
};

type DutyModel = {
  endTime: string;
  id: string;
  locationId: string;
  locationName: string;
  manualStatus: string;
  name: string;
  operationEndDate: string | null;
  operationStartDate: string | null;
  startTime: string;
  tagIds: readonly string[];
  tagLabels: readonly string[];
  weekday: string;
};

type ScheduleVersionModel = {
  activeFrom: string;
  activeTo: string | null;
  createdAt: Date | null;
  id: string;
  slots: readonly ScheduleSlotModel[];
  status: string;
  versionNo: number;
  workerId: string;
  workerName: string;
};

type ScheduleSlotModel = {
  dutyId: string;
  dutyName: string;
  endTime: string;
  locationId: string;
  locationName: string;
  startTime: string;
  tagIds: readonly string[];
  tagLabels: readonly string[];
  weekday: string;
  workerId: string;
};

type TagModel = {
  color: string;
  id: string;
  label: string;
  status: string;
};

type TimelineWeek = {
  dateKeyByDayId: Readonly<Record<ScheduleTimelineDayId, string>>;
  label: string;
  shortLabel: string;
  todayKey: string;
};

type WorkerModel = {
  id: string;
  name: string;
  status: string;
  tagIds: readonly string[];
};

const fixtureScheduleTimelineViewModel = {
  blocks: scheduleTimelineBlocks,
  filters: scheduleTimelineFilters,
  workerContexts: [scheduleSelectedWorkerContext],
} as const satisfies ScheduleTimelineViewModel;

export const emptyScheduleTimelineViewModel = {
  blocks: [],
  filters: scheduleTimelineFilters,
  workerContexts: [],
} as const satisfies ScheduleTimelineViewModel;

const dayIdByWeekday: Record<string, ScheduleTimelineDayId> = {
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

const dayLabels: Record<ScheduleTimelineDayId, string> = {
  fri: "금",
  mon: "월",
  sat: "토",
  sun: "일",
  thu: "목",
  tue: "화",
  wed: "수",
};

const fallbackTones = ["green", "orange", "pink", "blue"] as const;

export function createScheduleTimelineDataSource(): ScheduleTimelineDataSource {
  if (shouldUseFixtureDataSource()) {
    return createFixtureScheduleTimelineDataSource();
  }

  return createFirestoreScheduleTimelineDataSource();
}

function createFixtureScheduleTimelineDataSource(): ScheduleTimelineDataSource {
  return {
    initialData: fixtureScheduleTimelineViewModel,
    async getTimeline() {
      return fixtureScheduleTimelineViewModel;
    },
  };
}

function createFirestoreScheduleTimelineDataSource(): ScheduleTimelineDataSource {
  return {
    async getTimeline() {
      const workspaceId = await requireActiveWorkspaceId();
      const week = createCurrentWeek();
      const collections = await loadTimelineCollections(workspaceId);
      const locations = collections.locations.map(mapLocationDocument);
      const locationNameById = new Map(
        locations.map((location) => [location.value, location.label]),
      );
      const dutyTags = collections.dutyTags
        .map(mapTagDocument)
        .filter((tag) => tag.status !== "deleted");
      const workerTags = collections.workerTags
        .map(mapTagDocument)
        .filter((tag) => tag.status !== "deleted");
      const dutyTagById = new Map(dutyTags.map((tag) => [tag.id, tag]));
      const dutyTagByLabel = new Map(dutyTags.map((tag) => [tag.label, tag]));
      const duties = collections.duties.map((document) =>
        mapDutyDocument(document, locationNameById),
      );
      const dutyById = new Map(duties.map((duty) => [duty.id, duty]));
      const workers = collections.workers.map(mapWorkerDocument);
      const workerById = new Map(workers.map((worker) => [worker.id, worker]));
      const scheduleVersions = collections.scheduleVersions.map(
        mapScheduleVersionDocument,
      );
      const activeVersions = selectActiveScheduleVersions(scheduleVersions, week);
      const blocks = activeVersions.length
        ? buildBlocksFromScheduleVersions({
            dutyById,
            dutyTagById,
            dutyTagByLabel,
            versions: activeVersions,
            week,
            workerById,
          })
        : buildBlocksFromDuties({
            duties,
            dutyTagById,
            dutyTagByLabel,
            week,
          });

      return {
        blocks,
        filters: createLiveFilters({
          dutyTags,
          duties,
          locations,
          week,
          workers,
          workerTags,
        }),
        workerContexts: createWorkerContexts(blocks, workerById),
      };
    },
  };
}

async function loadTimelineCollections(
  workspaceId: string,
): Promise<TimelineCollections> {
  const [
    dutyTags,
    duties,
    locations,
    scheduleVersions,
    workers,
    workerTags,
  ] = await Promise.all([
    readWorkspaceCollection(workspaceId, "dutyTags"),
    readWorkspaceCollection(workspaceId, "duties"),
    readWorkspaceCollection(workspaceId, "locations"),
    readWorkspaceCollection(workspaceId, "scheduleVersions"),
    readWorkspaceCollection(workspaceId, "workers"),
    readWorkspaceCollection(workspaceId, "workerTags"),
  ]);

  return {
    dutyTags,
    duties,
    locations,
    scheduleVersions,
    workers,
    workerTags,
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

function mapLocationDocument(document: FirestoreDocument): ScheduleFilterOption {
  return {
    label: readString(document.data.name, "이름 없는 근무지"),
    value: document.id,
  };
}

function mapTagDocument(document: FirestoreDocument): TagModel {
  return {
    color: readString(document.data.color ?? document.data.tone, ""),
    id: document.id,
    label: readString(
      document.data.name,
      readString(document.data.label, "태그 없음"),
    ),
    status: readString(document.data.status, "active"),
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
    manualStatus: readString(data.manualStatus ?? data.status, "active"),
    name: readString(data.name, "근무 이름 없음"),
    operationEndDate: readNullableString(data.operationEndDate),
    operationStartDate: readNullableString(data.operationStartDate),
    startTime: readString(data.startTime, ""),
    tagIds: readStringArray(data.tagIds),
    tagLabels: readStringArray(data.tagLabels ?? data.tags),
    weekday: readString(data.weekday, ""),
  };
}

function mapWorkerDocument(document: FirestoreDocument): WorkerModel {
  const data = document.data;

  return {
    id: document.id,
    name: readString(data.name, readString(data.displayName, "이름 없는 조교")),
    status: readString(data.status ?? data.membershipStatus, "active"),
    tagIds: readStringArray(data.tagIds),
  };
}

function mapScheduleVersionDocument(
  document: FirestoreDocument,
): ScheduleVersionModel {
  const data = document.data;

  return {
    activeFrom: readString(data.activeFrom, ""),
    activeTo: readNullableString(data.activeTo),
    createdAt: readDate(data.createdAt),
    id: document.id,
    slots: readSlots(data.slots),
    status: readString(data.status, ""),
    versionNo: readNumber(data.versionNo, 0),
    workerId: readString(data.workerId, ""),
    workerName: readString(data.workerName, "이름 없는 조교"),
  };
}

function readSlots(value: unknown): ScheduleSlotModel[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const slot = readRecord(item);

    return {
      dutyId: readString(slot.dutyId, ""),
      dutyName: readString(slot.dutyName, ""),
      endTime: readString(slot.endTime, ""),
      locationId: readString(slot.locationId, ""),
      locationName: readString(slot.locationName, ""),
      startTime: readString(slot.startTime, ""),
      tagIds: readStringArray(slot.tagIds),
      tagLabels: readStringArray(slot.tagLabels ?? slot.tags),
      weekday: readString(slot.weekday, ""),
      workerId: readString(slot.workerId, ""),
    };
  });
}

function selectActiveScheduleVersions(
  versions: readonly ScheduleVersionModel[],
  week: TimelineWeek,
) {
  const latestByWorkerId = new Map<string, ScheduleVersionModel>();
  const activeVersions = versions
    .filter((version) => isScheduleVersionActive(version, week.todayKey))
    .sort(compareScheduleVersions);

  for (const version of activeVersions) {
    if (version.workerId && !latestByWorkerId.has(version.workerId)) {
      latestByWorkerId.set(version.workerId, version);
    }
  }

  return [...latestByWorkerId.values()].sort(compareScheduleVersionsByWorker);
}

function buildBlocksFromScheduleVersions({
  dutyById,
  dutyTagById,
  dutyTagByLabel,
  versions,
  week,
  workerById,
}: {
  dutyById: ReadonlyMap<string, DutyModel>;
  dutyTagById: ReadonlyMap<string, TagModel>;
  dutyTagByLabel: ReadonlyMap<string, TagModel>;
  versions: readonly ScheduleVersionModel[];
  week: TimelineWeek;
  workerById: ReadonlyMap<string, WorkerModel>;
}) {
  return versions
    .flatMap((version, versionIndex) =>
      version.slots.map((slot, index): ScheduleTimelineBlock | null => {
        const duty = dutyById.get(slot.dutyId);
        const dayId = readDayId(slot.weekday || duty?.weekday || "");

        if (!dayId || (duty && !isDutyVisibleOnDay(duty, week, dayId))) {
          return null;
        }

        const workerId = slot.workerId || version.workerId;
        const worker = workerById.get(workerId);
        const startTime = slot.startTime || duty?.startTime || "";
        const endTime = slot.endTime || duty?.endTime || "";

        if (!startTime || !endTime) {
          return null;
        }

        const tagLabel = readSlotTagLabel(slot, duty, dutyTagById);

        return {
          dayId,
          endHour: parseHour(endTime, parseHour(startTime, 0) + 1),
          id: `${version.id}-${slot.dutyId || "slot"}-${index}`,
          label: slot.dutyName || duty?.name || "근무 이름 없음",
          locationName:
            slot.locationName || duty?.locationName || "근무지 미지정",
          startHour: parseHour(startTime, 8),
          tagLabel,
          time: `${startTime}~${endTime}`,
          tone: readTimelineTone(
            tagLabel,
            dutyTagByLabel,
            versionIndex + index,
          ),
          worker: worker?.name || version.workerName || "이름 없는 조교",
          workerId,
        };
      }),
    )
    .filter((block): block is ScheduleTimelineBlock => block !== null)
    .sort(compareBlocks);
}

function buildBlocksFromDuties({
  duties,
  dutyTagById,
  dutyTagByLabel,
  week,
}: {
  duties: readonly DutyModel[];
  dutyTagById: ReadonlyMap<string, TagModel>;
  dutyTagByLabel: ReadonlyMap<string, TagModel>;
  week: TimelineWeek;
}) {
  return duties
    .filter((duty) => isDutyActive(duty))
    .map((duty, index): ScheduleTimelineBlock | null => {
      const dayId = readDayId(duty.weekday);

      if (!dayId || !isDutyVisibleOnDay(duty, week, dayId)) {
        return null;
      }

      const tagLabel = readDutyTagLabel(duty, dutyTagById);

      return {
        dayId,
        endHour: parseHour(duty.endTime, parseHour(duty.startTime, 0) + 1),
        id: `duty-${duty.id}`,
        label: duty.name,
        locationName: duty.locationName,
        startHour: parseHour(duty.startTime, 8),
        tagLabel,
        time: `${duty.startTime}~${duty.endTime}`,
        tone: readTimelineTone(tagLabel, dutyTagByLabel, index),
        worker: "미배정",
      };
    })
    .filter((block): block is ScheduleTimelineBlock => block !== null)
    .sort(compareBlocks);
}

function createWorkerContexts(
  blocks: readonly ScheduleTimelineBlock[],
  workerById: ReadonlyMap<string, WorkerModel>,
) {
  const blocksByWorkerId = new Map<string, ScheduleTimelineBlock[]>();

  for (const block of blocks) {
    if (!block.workerId) {
      continue;
    }

    const workerBlocks = blocksByWorkerId.get(block.workerId) ?? [];
    blocksByWorkerId.set(block.workerId, [...workerBlocks, block]);
  }

  return [...blocksByWorkerId.entries()]
    .map(([workerId, workerBlocks]) => {
      const worker = workerById.get(workerId);
      const sortedBlocks = [...workerBlocks].sort(compareBlocks);
      const workerName = worker?.name || sortedBlocks[0]?.worker || "조교";

      return {
        actions: scheduleSelectedWorkerContext.actions,
        assignedCountText: `현재 배정 근무 (${sortedBlocks.length}건)`,
        assignments: sortedBlocks.map(mapAssignment),
        detailHref: `/workers/${workerId}`,
        scheduleHref: `/workers/${workerId}/schedule`,
        selectedBlockIds: sortedBlocks.map((block) => block.id),
        statusText: readWorkerStatusText(worker?.status),
        workerId,
        workerName,
      } satisfies ScheduleSelectedWorkerContext;
    })
    .sort((left, right) =>
      left.workerName.localeCompare(right.workerName, "ko-KR"),
    );
}

function mapAssignment(
  block: ScheduleTimelineBlock,
): ScheduleSelectedWorkerAssignment {
  return {
    dayLabel: dayLabels[block.dayId],
    dutyName: block.label,
    id: `assignment-${block.id}`,
    locationName: block.locationName,
    tagLabel: block.tagLabel || "태그 없음",
    time: block.time.replace("~", " ~ "),
  };
}

function createLiveFilters({
  dutyTags,
  duties,
  locations,
  week,
  workers,
  workerTags,
}: {
  dutyTags: readonly TagModel[];
  duties: readonly DutyModel[];
  locations: readonly ScheduleFilterOption[];
  week: TimelineWeek;
  workers: readonly WorkerModel[];
  workerTags: readonly TagModel[];
}): ScheduleTimelineFilters {
  const activeDuties = duties.filter(isDutyActive);
  const dutyTagLabels = uniqueOptions([
    ...dutyTags
      .filter((tag) => tag.status === "active")
      .map((tag) => ({ label: tag.label, value: tag.id })),
    ...activeDuties.flatMap((duty) =>
      duty.tagLabels.map((label) => ({ label, value: label })),
    ),
  ]);
  const workerTagById = new Map(workerTags.map((tag) => [tag.id, tag]));
  const workerOptions = uniqueOptions(
    workers.filter(isVisibleWorker).map((worker) => ({
      label: formatWorkerFilterLabel(worker, workerTagById),
      value: worker.id,
    })),
  );

  return {
    dutyOptions: [
      { label: "근무 (전체)", value: "all" },
      ...uniqueOptions(
        activeDuties.map((duty) => ({ label: duty.name, value: duty.id })),
      ),
    ],
    dutyTagOptions: [
      { label: "근무 태그 (전체)", value: "all" },
      ...dutyTagLabels,
    ],
    locationOptions: [
      { label: "근무지 (전체)", value: "all" },
      ...uniqueOptions(locations),
    ],
    weekLabel: week.label,
    weekShortLabel: week.shortLabel,
    workerOptions: [
      { label: "조교 (전체)", value: "all" },
      ...workerOptions,
    ],
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

function isScheduleVersionActive(
  version: ScheduleVersionModel,
  todayKey: string,
) {
  return (
    version.status === "active" &&
    (!version.activeFrom || version.activeFrom <= todayKey) &&
    (!version.activeTo || version.activeTo >= todayKey)
  );
}

function isDutyActive(duty: DutyModel) {
  return duty.manualStatus !== "inactive" && duty.manualStatus !== "deleted";
}

function isDutyVisibleOnDay(
  duty: DutyModel,
  week: TimelineWeek,
  dayId: ScheduleTimelineDayId,
) {
  const dateKey = week.dateKeyByDayId[dayId];

  return (
    (!duty.operationStartDate || duty.operationStartDate <= dateKey) &&
    (!duty.operationEndDate || duty.operationEndDate >= dateKey)
  );
}

function isVisibleWorker(worker: WorkerModel) {
  return worker.status !== "inactive" && worker.status !== "deleted";
}

function readSlotTagLabel(
  slot: ScheduleSlotModel,
  duty: DutyModel | undefined,
  dutyTagById: ReadonlyMap<string, TagModel>,
) {
  return (
    slot.tagLabels[0] ||
    slot.tagIds.map((tagId) => dutyTagById.get(tagId)?.label).find(Boolean) ||
    (duty ? readDutyTagLabel(duty, dutyTagById) : undefined)
  );
}

function readDutyTagLabel(
  duty: DutyModel,
  dutyTagById: ReadonlyMap<string, TagModel>,
) {
  return (
    duty.tagLabels[0] ||
    duty.tagIds.map((tagId) => dutyTagById.get(tagId)?.label).find(Boolean)
  );
}

function readTimelineTone(
  tagLabel: string | undefined,
  dutyTagByLabel: ReadonlyMap<string, TagModel>,
  index: number,
): ScheduleTimelineTone {
  const color = tagLabel ? dutyTagByLabel.get(tagLabel)?.color : "";

  switch (color) {
    case "green":
      return "green";
    case "orange":
      return "orange";
    case "pink":
    case "red":
      return "pink";
    case "blue":
    case "grey":
      return "blue";
    default:
      return fallbackTones[index % fallbackTones.length];
  }
}

function formatWorkerFilterLabel(
  worker: WorkerModel,
  workerTagById: ReadonlyMap<string, TagModel>,
) {
  const tagLabel = worker.tagIds
    .map((tagId) => workerTagById.get(tagId)?.label)
    .find((label): label is string => Boolean(label));

  return tagLabel ? `${worker.name} · ${tagLabel}` : worker.name;
}

function readWorkerStatusText(status: string | undefined) {
  if (status === "inactive" || status === "rejected") {
    return "비활성";
  }

  if (status === "pending") {
    return "승인 대기";
  }

  return "활성";
}

function readDayId(value: string): ScheduleTimelineDayId | null {
  return dayIdByWeekday[value.trim().toLocaleLowerCase("ko-KR")] ?? null;
}

function createCurrentWeek(): TimelineWeek {
  const today = new Date();
  const monday = startOfWeek(today);
  const sunday = addDays(monday, 6);
  const dateKeyByDayId = {
    fri: toDateKey(addDays(monday, 4)),
    mon: toDateKey(monday),
    sat: toDateKey(addDays(monday, 5)),
    sun: toDateKey(sunday),
    thu: toDateKey(addDays(monday, 3)),
    tue: toDateKey(addDays(monday, 1)),
    wed: toDateKey(addDays(monday, 2)),
  } satisfies Record<ScheduleTimelineDayId, string>;

  return {
    dateKeyByDayId,
    label: `${formatDateLabel(monday)} - ${formatDateLabel(sunday)}`,
    shortLabel: `${formatShortDateLabel(monday)}~${formatShortDateLabel(sunday)}`,
    todayKey: toDateKey(today),
  };
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const dayOffset = (result.getDay() + 6) % 7;
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - dayOffset);

  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);

  return result;
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatDateLabel(date: Date) {
  return `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;
}

function formatShortDateLabel(date: Date) {
  return `${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;
}

function compareScheduleVersions(
  left: ScheduleVersionModel,
  right: ScheduleVersionModel,
) {
  return (
    right.activeFrom.localeCompare(left.activeFrom) ||
    right.versionNo - left.versionNo ||
    getTime(right.createdAt) - getTime(left.createdAt)
  );
}

function compareScheduleVersionsByWorker(
  left: ScheduleVersionModel,
  right: ScheduleVersionModel,
) {
  return left.workerName.localeCompare(right.workerName, "ko-KR");
}

function compareBlocks(
  left: ScheduleTimelineBlock,
  right: ScheduleTimelineBlock,
) {
  return (
    getDaySort(left.dayId) - getDaySort(right.dayId) ||
    left.startHour - right.startHour ||
    left.endHour - right.endHour ||
    left.worker.localeCompare(right.worker, "ko-KR") ||
    left.label.localeCompare(right.label, "ko-KR")
  );
}

function getDaySort(dayId: ScheduleTimelineDayId) {
  const order: Record<ScheduleTimelineDayId, number> = {
    fri: 4,
    mon: 0,
    sat: 5,
    sun: 6,
    thu: 3,
    tue: 1,
    wed: 2,
  };

  return order[dayId];
}

function uniqueOptions(
  options: readonly ScheduleFilterOption[],
): ScheduleFilterOption[] {
  const seen = new Set<string>();
  let result: ScheduleFilterOption[] = [];

  for (const option of options) {
    const key = option.value || option.label;

    if (!option.label || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result = [...result, option];
  }

  return result.sort((left, right) =>
    left.label.localeCompare(right.label, "ko-KR"),
  );
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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

function getTime(date: Date | null) {
  return date?.getTime() ?? 0;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}
