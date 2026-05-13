import {
  collection,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { resolveActiveWorkspaceId } from "@/entities/workspace";
import {
  markWorkspaceSetupComplete,
  readActiveWorkspaceId,
} from "@/entities/workspace";
import {
  getFirebaseAuth,
  getFirebaseDb,
  isMockFirebaseProject,
} from "@/shared/api/firebase/client";
import {
  dutyListRows,
  type DutyAssignedWorker,
  type DutyListRow,
  type DutyWeekday,
} from "../model/duty-fixtures";
import {
  createDutyListRow,
  type CreateDutyInput,
  type DutyLocationOption,
  type StoredDuty,
  type UpdateDutyInput,
} from "../model/duty-model";

export type DutyDataSource = {
  listDuties: () => Promise<readonly DutyListRow[]>;
  listLocations: () => Promise<readonly DutyLocationOption[]>;
  createDuty: (input: CreateDutyInput) => Promise<DutyListRow>;
  updateDuty: (input: UpdateDutyInput) => Promise<DutyListRow>;
};

type ScheduleVersionSlot = {
  dutyId: string;
  endTime: string;
  startTime: string;
  weekday: string;
  workerId: string;
} & Record<string, unknown>;

export function createDutyDataSource(): DutyDataSource {
  if (shouldUseVisualMockDataSource()) {
    return createMockDutyDataSource();
  }

  return createFirestoreDutyDataSource();
}

function createFirestoreDutyDataSource(): DutyDataSource {
  async function listDuties() {
      const workspaceId = await requireActiveWorkspaceId();
      const [dutiesSnapshot, scheduleVersionsSnapshot, workersSnapshot] =
        await Promise.all([
          getDocs(
            query(getDutiesCollection(workspaceId), orderBy("createdAt", "desc")),
          ),
          getDocs(getScheduleVersionsCollection(workspaceId)),
          getDocs(getWorkersCollection(workspaceId)),
        ]);
      const duties = dutiesSnapshot.docs.map(mapDutyDocument);
      const dutyById = new Map(duties.map((duty) => [duty.id, duty]));
      const workerNameById = new Map(
        workersSnapshot.docs.map((worker) => {
          const data = worker.data();

          return [
            worker.id,
            readString(
              data.name,
              readString(data.displayName, "이름 없는 조교"),
            ),
          ] as const;
        }),
      );
      const assignedWorkersByDutyId = createAssignedWorkersByDutyId({
        dutiesById: dutyById,
        scheduleVersionDocs: scheduleVersionsSnapshot.docs,
        workerNameById,
      });

      return duties.map((duty) => {
        const assignedWorkers = assignedWorkersByDutyId.get(duty.id) ?? [];

        return createDutyListRow({
          ...duty,
          assignedWorkerCount: Math.max(
            duty.assignedWorkerCount,
            assignedWorkers.length,
          ),
          assignedWorkers,
        });
      });
    }

  return {
    listDuties,

    async listLocations() {
      const workspaceId = await requireActiveWorkspaceId();
      const snapshot = await getDocs(
        query(getLocationsCollection(workspaceId), orderBy("createdAt", "desc")),
      );

      return snapshot.docs.map((location) => ({
        id: location.id,
        label: readString(location.data().name, "이름 없는 근무지"),
      }));
    },

    async createDuty(input) {
      const workspaceId = await requireActiveWorkspaceId();
      const db = getFirebaseDb();
      const createdBy = getFirebaseAuth().currentUser?.uid ?? null;
      const dutyRef = doc(getDutiesCollection(workspaceId));
      const document = {
        ...input,
        assignedWorkerCount: 0,
        createdAt: serverTimestamp(),
        createdBy,
        manualStatus: "active",
        updatedAt: serverTimestamp(),
        workspaceId,
      };
      const result = await runTransaction(db, async (transaction) => {
        const workspaceRef = getWorkspaceDocument(workspaceId);
        const workspaceSnapshot = await transaction.get(workspaceRef);
        const setup = workspaceSnapshot.data()?.setup;
        const previousDutyCount = readNumberFromRecord(setup, "dutyCount", 0);
        const locationCount = readNumberFromRecord(setup, "locationCount", 0);
        const shouldCompleteSetup =
          previousDutyCount === 0 &&
          locationCount > 0 &&
          readValueFromRecord(setup, "completedAt") == null;

        transaction.set(dutyRef, document);
        transaction.update(workspaceRef, {
          ...(shouldCompleteSetup
            ? { "setup.completedAt": serverTimestamp(), status: "active" }
            : {}),
          "setup.dutyCount": increment(1),
          updatedAt: serverTimestamp(),
        });
        transaction.update(getLocationDocument(workspaceId, input.locationId), {
          dutyCount: increment(1),
          updatedAt: serverTimestamp(),
        });

        if (createdBy && shouldCompleteSetup) {
          transaction.update(doc(db, "users", createdBy), {
            onboardingStatus: "setup-complete",
            updatedAt: serverTimestamp(),
          });
        }

        return {
          row: createDutyListRow({
            ...input,
            id: dutyRef.id,
            assignedWorkerCount: 0,
            manualStatus: "active",
          }),
          setupComplete: shouldCompleteSetup,
        };
      });

      if (result.setupComplete) {
        markWorkspaceSetupComplete();
      }

      return result.row;
    },
    async updateDuty(input) {
      const workspaceId = await requireActiveWorkspaceId();
      const db = getFirebaseDb();
      const batch = writeBatch(db);
      const dutyRef = doc(db, "workspaces", workspaceId, "duties", input.id);

      batch.update(dutyRef, {
        endTime: input.endTime,
        locationId: input.locationId,
        locationName: input.locationName,
        name: input.name,
        nameKey: input.nameKey,
        operationEndDate: input.operationEndDate,
        operationStartDate: input.operationStartDate,
        startTime: input.startTime,
        tags: [...input.tags],
        updatedAt: serverTimestamp(),
        weekday: input.weekday,
      });

      if (input.applyToSchedules) {
        const scheduleVersionsSnapshot = await getDocs(
          getScheduleVersionsCollection(workspaceId),
        );

        scheduleVersionsSnapshot.docs.forEach((version) => {
          const data = version.data();

          if (readString(data.status, "") !== "active") {
            return;
          }

          const slots = readScheduleVersionSlots(data.slots);

          if (!slots.some((slot) => slot.dutyId === input.id)) {
            return;
          }

          batch.update(
            doc(db, "workspaces", workspaceId, "scheduleVersions", version.id),
            {
              slots: slots.map((slot) =>
                slot.dutyId === input.id
                  ? {
                      ...slot,
                      endTime: input.endTime,
                      startTime: input.startTime,
                      weekday: input.weekday,
                    }
                  : slot,
              ),
              updatedAt: serverTimestamp(),
            },
          );
        });
      }

      await batch.commit();

      return (
        (await listDuties()).find((duty) => duty.id === input.id) ??
        createDutyListRow({
          ...input,
          assignedWorkerCount: 0,
          manualStatus: "active",
        })
      );
    },
  };
}

function createMockDutyDataSource(): DutyDataSource {
  let nextIndex = 1;
  let duties: DutyListRow[] = [...dutyListRows];
  const locations: DutyLocationOption[] = [
    { id: "location_daechi_a", label: "대치 A학원" },
    { id: "location_seocho_b", label: "서초 B학원" },
    { id: "location_jamsil_c", label: "잠실 C학원" },
    { id: "location_songpa_e", label: "송파 E학원" },
  ];

  return {
    async listDuties() {
      return duties;
    },

    async listLocations() {
      return locations;
    },

    async createDuty(input) {
      const row = createDutyListRow({
        ...input,
        id: `duty-local-${nextIndex}`,
        assignedWorkerCount: 0,
        manualStatus: "active",
      });

      nextIndex += 1;
      duties = [row, ...duties];
      markWorkspaceSetupComplete();

      return row;
    },
    async updateDuty(input) {
      const previous = duties.find((duty) => duty.id === input.id);
      const row = createDutyListRow({
        ...input,
        assignedWorkerCount: previous?.appliedWorkerCount ?? 0,
        assignedWorkers: previous?.assignedWorkers,
        manualStatus: "active",
      });

      duties = duties.map((duty) => (duty.id === input.id ? row : duty));

      return row;
    },
  };
}

function getDutiesCollection(workspaceId: string) {
  return collection(getFirebaseDb(), "workspaces", workspaceId, "duties");
}

function getLocationsCollection(workspaceId: string) {
  return collection(getFirebaseDb(), "workspaces", workspaceId, "locations");
}

function getScheduleVersionsCollection(workspaceId: string) {
  return collection(
    getFirebaseDb(),
    "workspaces",
    workspaceId,
    "scheduleVersions",
  );
}

function getWorkersCollection(workspaceId: string) {
  return collection(getFirebaseDb(), "workspaces", workspaceId, "workers");
}

function getWorkspaceDocument(workspaceId: string) {
  return doc(getFirebaseDb(), "workspaces", workspaceId);
}

function getLocationDocument(workspaceId: string, locationId: string) {
  return doc(getFirebaseDb(), "workspaces", workspaceId, "locations", locationId);
}

async function requireActiveWorkspaceId() {
  const workspaceId = await resolveActiveWorkspaceId();

  if (!workspaceId) {
    throw new Error("활성 소속을 확인할 수 없습니다.");
  }

  return workspaceId;
}

function mapDutyDocument(snapshot: QueryDocumentSnapshot<DocumentData>) {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    name: readString(data.name, "이름 없는 근무"),
    nameKey: readString(data.nameKey, ""),
    tags: readStringArray(data.tags),
    locationId: readString(data.locationId, ""),
    locationName: readString(data.locationName, "근무지 미지정"),
    weekday: readWeekday(data.weekday),
    startTime: readString(data.startTime, "00:00"),
    endTime: readString(data.endTime, "00:00"),
    operationStartDate: readNullableString(data.operationStartDate),
    operationEndDate: readNullableString(data.operationEndDate),
    assignedWorkerCount: readNumber(data.assignedWorkerCount, 0),
    manualStatus: data.manualStatus === "inactive" ? "inactive" : "active",
  } satisfies StoredDuty;
}

function createAssignedWorkersByDutyId({
  dutiesById,
  scheduleVersionDocs,
  workerNameById,
}: {
  dutiesById: ReadonlyMap<string, StoredDuty>;
  scheduleVersionDocs: readonly QueryDocumentSnapshot<DocumentData>[];
  workerNameById: ReadonlyMap<string, string>;
}) {
  const assignedWorkersByDutyId = new Map<string, DutyAssignedWorker[]>();
  const seenAssignments = new Set<string>();

  for (const scheduleVersion of scheduleVersionDocs) {
    const data = scheduleVersion.data();

    if (readString(data.status, "") !== "active") {
      continue;
    }

    readScheduleVersionSlots(data.slots).forEach((slot, index) => {
      const duty = dutiesById.get(slot.dutyId);

      if (!duty || !slot.workerId) {
        return;
      }

      const assignmentKey = `${slot.dutyId}:${slot.workerId}`;

      if (seenAssignments.has(assignmentKey)) {
        return;
      }

      seenAssignments.add(assignmentKey);

      const assignedWorkers = assignedWorkersByDutyId.get(slot.dutyId) ?? [];

      assignedWorkersByDutyId.set(slot.dutyId, [
        ...assignedWorkers,
        {
          id: `${scheduleVersion.id}-${slot.dutyId}-${slot.workerId}-${index}`,
          name: workerNameById.get(slot.workerId) ?? "이름 없는 조교",
          weekday: readWeekday(slot.weekday || duty.weekday),
          time: `${slot.startTime || duty.startTime}~${slot.endTime || duty.endTime}`,
          workerId: slot.workerId,
        },
      ]);
    });
  }

  return assignedWorkersByDutyId;
}

function readScheduleVersionSlots(value: unknown): ScheduleVersionSlot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((slot) => {
      if (!slot || typeof slot !== "object") {
        return null;
      }

      const record = slot as Record<string, unknown>;
      const dutyId = readString(record.dutyId, "");

      if (!dutyId) {
        return null;
      }

      return {
        ...record,
        dutyId,
        endTime: readString(record.endTime, ""),
        startTime: readString(record.startTime, ""),
        weekday: readString(record.weekday, ""),
        workerId: readString(record.workerId, ""),
      };
    })
    .filter((slot): slot is ScheduleVersionSlot => slot !== null);
}

function shouldUseVisualMockDataSource() {
  return isMockFirebaseProject() || readActiveWorkspaceId() === "workspace_visual";
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readNumberFromRecord(
  value: unknown,
  key: string,
  fallback: number,
) {
  return readNumber(readValueFromRecord(value, key), fallback);
}

function readValueFromRecord(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return null;
  }

  return (value as Record<string, unknown>)[key] ?? null;
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readWeekday(value: unknown): DutyWeekday {
  if (
    value === "월" ||
    value === "화" ||
    value === "수" ||
    value === "목" ||
    value === "금" ||
    value === "토" ||
    value === "일"
  ) {
    return value;
  }

  return "월";
}
