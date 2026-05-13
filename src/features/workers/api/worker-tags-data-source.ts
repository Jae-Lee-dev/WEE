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
  workerTagEditDialog,
  workerTagRows,
  type WorkerTagDialogWorker,
  type WorkerTagRow,
  type WorkerTagTone,
} from "../model/worker-tags-fixtures";

export type WorkerTagStatus = "active" | "inactive";

export type WorkerTagSaveInput = {
  assignedWorkerIds: readonly string[];
  label: string;
  status: WorkerTagStatus;
  tone: WorkerTagTone;
};

export type WorkerTagsDataSource = {
  initialRows?: readonly WorkerTagRow[];
  createWorkerTag: (input: WorkerTagSaveInput) => Promise<WorkerTagRow>;
  deleteWorkerTag: (tag: WorkerTagRow) => Promise<void>;
  listWorkerTagAssignments: (
    tag: WorkerTagRow | null,
  ) => Promise<readonly WorkerTagDialogWorker[]>;
  listWorkerTags: () => Promise<readonly WorkerTagRow[]>;
  updateWorkerTag: (
    tag: WorkerTagRow,
    input: WorkerTagSaveInput,
  ) => Promise<WorkerTagRow>;
};

type WorkerTagModel = WorkerTagRow & {
  createdAt: Date | null;
  status: string;
  usageCount: number;
};

export const emptyWorkerTagRows = [] as const satisfies readonly WorkerTagRow[];

export function createWorkerTagsDataSource(): WorkerTagsDataSource {
  if (shouldUseFixtureDataSource()) {
    return createFixtureWorkerTagsDataSource();
  }

  return createFirestoreWorkerTagsDataSource();
}

function createFixtureWorkerTagsDataSource(): WorkerTagsDataSource {
  let rows: WorkerTagRow[] = workerTagRows.map((row): WorkerTagRow => {
    const tag = row as WorkerTagRow;

    return {
      ...tag,
      statusText: tag.statusText ?? "활성",
    };
  });
  const assignmentsByTagId = new Map<string, WorkerTagDialogWorker[]>(
    rows.map((row) => [
      row.id,
      workerTagEditDialog.workers.map((worker, index) => ({
        ...worker,
        checked: index < readCountFromText(row.countText),
      })),
    ]),
  );
  let nextIndex = 1;

  return {
    initialRows: rows,
    async createWorkerTag(input) {
      const tag = toWorkerTagRow({
        id: `worker-tag-local-${nextIndex}`,
        label: input.label,
        status: input.status,
        tone: input.tone,
        usageCount: input.assignedWorkerIds.length,
      });

      nextIndex += 1;
      rows = [tag, ...rows];
      assignmentsByTagId.set(
        tag.id,
        workerTagEditDialog.workers.map((worker) => ({
          ...worker,
          checked: input.assignedWorkerIds.includes(worker.id),
          disabled: false,
        })),
      );

      return tag;
    },
    async deleteWorkerTag(tag) {
      rows = rows.filter((row) => row.id !== tag.id);
      assignmentsByTagId.delete(tag.id);
    },
    async listWorkerTagAssignments(tag) {
      if (!tag) {
        return workerTagEditDialog.workers.map((worker) => ({
          ...worker,
          checked: false,
          disabled: false,
        }));
      }

      return (
        assignmentsByTagId.get(tag.id) ??
        workerTagEditDialog.workers.map((worker) => ({
          ...worker,
          checked: false,
          disabled: false,
        }))
      );
    },
    async listWorkerTags() {
      return rows;
    },
    async updateWorkerTag(tag, input) {
      const updatedTag = toWorkerTagRow({
        id: tag.id,
        label: input.label,
        status: input.status,
        tone: input.tone,
        usageCount: input.assignedWorkerIds.length,
      });

      rows = rows.map((row) => (row.id === tag.id ? updatedTag : row));
      assignmentsByTagId.set(
        tag.id,
        workerTagEditDialog.workers.map((worker) => ({
          ...worker,
          checked: input.assignedWorkerIds.includes(worker.id),
          disabled: false,
        })),
      );

      return updatedTag;
    },
  };
}

function createFirestoreWorkerTagsDataSource(): WorkerTagsDataSource {
  return {
    async createWorkerTag(input) {
      const workspaceId = await requireActiveWorkspaceId();
      const db = getFirebaseDb();
      const tagRef = doc(getWorkerTagsCollection(workspaceId));
      const batch = writeBatch(db);
      const assignedWorkerIds = new Set(input.assignedWorkerIds);

      batch.set(tagRef, {
        color: input.tone,
        createdAt: serverTimestamp(),
        createdBy: getFirebaseAuth().currentUser?.uid ?? null,
        name: input.label,
        nameKey: createTagNameKey(input.label),
        status: input.status,
        updatedAt: serverTimestamp(),
        usageCount: assignedWorkerIds.size,
        workspaceId,
      });

      const workersSnapshot = await getDocs(getWorkersCollection(workspaceId));

      for (const worker of workersSnapshot.docs) {
        if (!assignedWorkerIds.has(worker.id)) {
          continue;
        }

        batch.update(worker.ref, {
          tagIds: addStringToArray(
            readStringArray(worker.data().tagIds),
            tagRef.id,
          ),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      return toWorkerTagRow({
        id: tagRef.id,
        label: input.label,
        status: input.status,
        tone: input.tone,
        usageCount: assignedWorkerIds.size,
      });
    },
    async deleteWorkerTag(tag) {
      const workspaceId = await requireActiveWorkspaceId();
      const db = getFirebaseDb();
      const batch = writeBatch(db);
      const workersSnapshot = await getDocs(getWorkersCollection(workspaceId));

      for (const worker of workersSnapshot.docs) {
        const tagIds = readStringArray(worker.data().tagIds);

        if (!tagIds.includes(tag.id)) {
          continue;
        }

        batch.update(worker.ref, {
          tagIds: tagIds.filter((tagId) => tagId !== tag.id),
          updatedAt: serverTimestamp(),
        });
      }

      batch.update(getWorkerTagDocument(workspaceId, tag.id), {
        deletedAt: serverTimestamp(),
        status: "deleted",
        updatedAt: serverTimestamp(),
        usageCount: 0,
      });

      await batch.commit();
    },
    async listWorkerTagAssignments(tag) {
      const workspaceId = await requireActiveWorkspaceId();
      const snapshot = await getDocs(getWorkersCollection(workspaceId));
      const tagId = tag?.id ?? "";

      return snapshot.docs
        .map((worker) => {
          const data = worker.data();

          return {
            checked: readStringArray(data.tagIds).includes(tagId),
            disabled: readString(data.status, "active") === "deleted",
            id: worker.id,
            name: readString(
              data.name,
              readString(data.displayName, "이름 없는 조교"),
            ),
          };
        })
        .sort((left, right) => left.name.localeCompare(right.name, "ko-KR"));
    },
    async listWorkerTags() {
      const workspaceId = await requireActiveWorkspaceId();
      const [tagsSnapshot, workersSnapshot] = await Promise.all([
        getDocs(getWorkerTagsCollection(workspaceId)),
        getDocs(getWorkersCollection(workspaceId)),
      ]);
      const actualUsageCountByTagId = countWorkerTagAssignments(
        workersSnapshot.docs,
      );

      return tagsSnapshot.docs
        .map(mapWorkerTagDocument)
        .filter((tag) => tag.status !== "deleted")
        .sort(compareWorkerTags)
        .map((tag) => {
          const usageCount = actualUsageCountByTagId.get(tag.id) ?? 0;

          return {
            id: tag.id,
            label: tag.label,
            countText: toWorkerTagCountText(usageCount),
            tone: tag.tone,
            statusText: tag.statusText,
          };
        });
    },
    async updateWorkerTag(tag, input) {
      const workspaceId = await requireActiveWorkspaceId();
      const db = getFirebaseDb();
      const batch = writeBatch(db);
      const assignedWorkerIds = new Set(input.assignedWorkerIds);
      const workersSnapshot = await getDocs(getWorkersCollection(workspaceId));

      batch.update(getWorkerTagDocument(workspaceId, tag.id), {
        color: input.tone,
        name: input.label,
        nameKey: createTagNameKey(input.label),
        status: input.status,
        updatedAt: serverTimestamp(),
        usageCount: assignedWorkerIds.size,
      });

      for (const worker of workersSnapshot.docs) {
        const tagIds = readStringArray(worker.data().tagIds);
        const currentlyAssigned = tagIds.includes(tag.id);
        const shouldAssign = assignedWorkerIds.has(worker.id);

        if (currentlyAssigned === shouldAssign) {
          continue;
        }

        batch.update(worker.ref, {
          tagIds: shouldAssign
            ? addStringToArray(tagIds, tag.id)
            : tagIds.filter((tagId) => tagId !== tag.id),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      return toWorkerTagRow({
        id: tag.id,
        label: input.label,
        status: input.status,
        tone: input.tone,
        usageCount: assignedWorkerIds.size,
      });
    },
  };
}

function getWorkerTagsCollection(workspaceId: string) {
  return collection(getFirebaseDb(), "workspaces", workspaceId, "workerTags");
}

function getWorkerTagDocument(workspaceId: string, tagId: string) {
  return doc(getFirebaseDb(), "workspaces", workspaceId, "workerTags", tagId);
}

function getWorkersCollection(workspaceId: string) {
  return collection(getFirebaseDb(), "workspaces", workspaceId, "workers");
}

async function requireActiveWorkspaceId() {
  const workspaceId = await resolveActiveWorkspaceId();

  if (!workspaceId) {
    throw new Error("활성 소속을 확인할 수 없습니다.");
  }

  return workspaceId;
}

function shouldUseFixtureDataSource() {
  return (
    isMockFirebaseProject() || readActiveWorkspaceId() === "workspace_visual"
  );
}

function mapWorkerTagDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): WorkerTagModel {
  const data = snapshot.data();
  const status = readString(data.status, "active");
  const usageCount =
    readOptionalNumber(data.usageCount) ??
    readOptionalNumber(data.workerCount) ??
    readOptionalNumber(data.count) ??
    0;

  return {
    id: snapshot.id,
    label: readString(data.name, readString(data.label, "태그 없음")),
    countText: toWorkerTagCountText(usageCount),
    tone: readWorkerTagTone(data.color ?? data.tone),
    statusText: readStatusLabel(status),
    createdAt: readDate(data.createdAt),
    status,
    usageCount,
  };
}

function toWorkerTagRow({
  id,
  label,
  status,
  tone,
  usageCount,
}: {
  id: string;
  label: string;
  status: WorkerTagStatus | string;
  tone: WorkerTagTone;
  usageCount: number;
}): WorkerTagRow {
  return {
    countText: toWorkerTagCountText(usageCount),
    id,
    label,
    statusText: readStatusLabel(status),
    tone,
  };
}

function countWorkerTagAssignments(
  workers: readonly QueryDocumentSnapshot<DocumentData>[],
) {
  const usageCountByTagId = new Map<string, number>();

  for (const worker of workers) {
    for (const tagId of readStringArray(worker.data().tagIds)) {
      usageCountByTagId.set(tagId, (usageCountByTagId.get(tagId) ?? 0) + 1);
    }
  }

  return usageCountByTagId;
}

function toWorkerTagCountText(usageCount: number) {
  return `${usageCount}명`;
}

function compareWorkerTags(left: WorkerTagModel, right: WorkerTagModel) {
  const statusCompare =
    getStatusRank(left.status) - getStatusRank(right.status);

  if (statusCompare !== 0) {
    return statusCompare;
  }

  return (
    getDateTime(left.createdAt) - getDateTime(right.createdAt) ||
    left.label.localeCompare(right.label, "ko-KR")
  );
}

function getStatusRank(status: string) {
  return status === "active" ? 0 : 1;
}

function readWorkerTagTone(value: unknown): WorkerTagTone {
  if (
    value === "green" ||
    value === "red" ||
    value === "blue" ||
    value === "orange"
  ) {
    return value;
  }

  return "grey";
}

function readStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "활성";
    case "inactive":
      return "비활성";
    default:
      return status || "상태 미확인";
  }
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string") {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  if ("toDate" in value && typeof value.toDate === "function") {
    const date = value.toDate();

    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }

  if ("seconds" in value && typeof value.seconds === "number") {
    const nanoseconds =
      "nanoseconds" in value && typeof value.nanoseconds === "number"
        ? value.nanoseconds
        : 0;

    return new Date(value.seconds * 1000 + Math.floor(nanoseconds / 1000000));
  }

  return null;
}

function getDateTime(date: Date | null) {
  return date?.getTime() ?? 0;
}

function createTagNameKey(name: string) {
  return name.trim().toLocaleLowerCase("ko-KR");
}

function addStringToArray(values: readonly string[], value: string) {
  return values.includes(value) ? [...values] : [...values, value];
}

function readCountFromText(value: string) {
  const match = value.match(/\d+/);

  return match ? Number(match[0]) : 0;
}
