import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
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
  dutyTagEditDialog,
  dutyTagRows,
  type DutyTagDialogDuty,
  type DutyTagRow,
  type DutyTone,
} from "../model/duty-fixtures";

export type DutyTagStatus = "active" | "inactive";

export type DutyTagSaveInput = {
  assignedDutyIds: readonly string[];
  label: string;
  status: DutyTagStatus;
  tone: DutyTone;
};

export type DutyTagsDataSource = {
  initialRows?: readonly DutyTagRow[];
  createDutyTag: (input: DutyTagSaveInput) => Promise<DutyTagRow>;
  deleteDutyTag: (tag: DutyTagRow) => Promise<void>;
  listDutyTagAssignments: (
    tag: DutyTagRow | null,
  ) => Promise<readonly DutyTagDialogDuty[]>;
  listDutyTags: () => Promise<readonly DutyTagRow[]>;
  updateDutyTag: (tag: DutyTagRow, input: DutyTagSaveInput) => Promise<DutyTagRow>;
};

export function createDutyTagsDataSource(): DutyTagsDataSource {
  if (shouldUseVisualMockDataSource()) {
    return createFixtureDutyTagsDataSource();
  }

  return createFirestoreDutyTagsDataSource();
}

function createFixtureDutyTagsDataSource(): DutyTagsDataSource {
  let rows: DutyTagRow[] = dutyTagRows.map((row): DutyTagRow => {
    const tag = row as DutyTagRow;

    return {
      ...tag,
      statusText: tag.statusText ?? "활성",
      statusTone: tag.statusTone ?? "green",
    };
  });
  const assignmentsByTagId = new Map<string, DutyTagDialogDuty[]>(
    rows.map((row) => [
      row.id,
      dutyTagEditDialog.duties.map((duty, index) => ({
        ...duty,
        checked: index < readCountFromText(row.countText),
      })),
    ]),
  );
  let nextIndex = 1;

  return {
    initialRows: rows,
    async createDutyTag(input) {
      const tag = toDutyTagRow({
        id: `duty-tag-local-${nextIndex}`,
        label: input.label,
        status: input.status,
        tone: input.tone,
        usageCount: input.assignedDutyIds.length,
      });

      nextIndex += 1;
      rows = [tag, ...rows];
      assignmentsByTagId.set(
        tag.id,
        dutyTagEditDialog.duties.map((duty) => ({
          ...duty,
          checked: input.assignedDutyIds.includes(duty.id),
          disabled: false,
        })),
      );

      return tag;
    },
    async deleteDutyTag(tag) {
      rows = rows.filter((row) => row.id !== tag.id);
      assignmentsByTagId.delete(tag.id);
    },
    async listDutyTagAssignments(tag) {
      if (!tag) {
        return dutyTagEditDialog.duties.map((duty) => ({
          ...duty,
          checked: false,
          disabled: false,
        }));
      }

      return (
        assignmentsByTagId.get(tag.id) ??
        dutyTagEditDialog.duties.map((duty) => ({
          ...duty,
          checked: false,
          disabled: false,
        }))
      );
    },
    async listDutyTags() {
      return rows;
    },
    async updateDutyTag(tag, input) {
      const updatedTag = toDutyTagRow({
        id: tag.id,
        label: input.label,
        status: input.status,
        tone: input.tone,
        usageCount: input.assignedDutyIds.length,
      });

      rows = rows.map((row) => (row.id === tag.id ? updatedTag : row));
      assignmentsByTagId.set(
        tag.id,
        dutyTagEditDialog.duties.map((duty) => ({
          ...duty,
          checked: input.assignedDutyIds.includes(duty.id),
          disabled: false,
        })),
      );

      return updatedTag;
    },
  };
}

function createFirestoreDutyTagsDataSource(): DutyTagsDataSource {
  return {
    async createDutyTag(input) {
      const workspaceId = await requireActiveWorkspaceId();
      const db = getFirebaseDb();
      const tagRef = doc(getDutyTagsCollection(workspaceId));
      const batch = writeBatch(db);
      const assignedDutyIds = new Set(input.assignedDutyIds);

      batch.set(tagRef, {
        color: input.tone,
        createdAt: serverTimestamp(),
        createdBy: getFirebaseAuth().currentUser?.uid ?? null,
        name: input.label,
        nameKey: createTagNameKey(input.label),
        status: input.status,
        updatedAt: serverTimestamp(),
        usageCount: assignedDutyIds.size,
        workspaceId,
      });

      const dutiesSnapshot = await getDocs(getDutiesCollection(workspaceId));

      for (const duty of dutiesSnapshot.docs) {
        if (!assignedDutyIds.has(duty.id)) {
          continue;
        }

        batch.update(duty.ref, {
          tags: addStringToArray(readStringArray(duty.data().tags), input.label),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      return toDutyTagRow({
        id: tagRef.id,
        label: input.label,
        status: input.status,
        tone: input.tone,
        usageCount: assignedDutyIds.size,
      });
    },
    async deleteDutyTag(tag) {
      const workspaceId = await requireActiveWorkspaceId();
      const db = getFirebaseDb();
      const batch = writeBatch(db);
      const dutiesSnapshot = await getDocs(getDutiesCollection(workspaceId));

      for (const duty of dutiesSnapshot.docs) {
        const tags = readStringArray(duty.data().tags);

        if (!tags.includes(tag.label)) {
          continue;
        }

        batch.update(duty.ref, {
          tags: tags.filter((label) => label !== tag.label),
          updatedAt: serverTimestamp(),
        });
      }

      batch.update(getDutyTagDocument(workspaceId, tag.id), {
        deletedAt: serverTimestamp(),
        status: "deleted",
        updatedAt: serverTimestamp(),
        usageCount: 0,
      });

      await batch.commit();
    },
    async listDutyTagAssignments(tag) {
      const workspaceId = await requireActiveWorkspaceId();
      const snapshot = await getDocs(
        query(getDutiesCollection(workspaceId), orderBy("createdAt", "desc")),
      );
      const tagLabel = tag?.label ?? "";

      return snapshot.docs
        .map((duty) => {
          const data = duty.data();

          return {
            checked: readStringArray(data.tags).includes(tagLabel),
            disabled: readString(data.manualStatus, "active") === "deleted",
            id: duty.id,
            location: readString(data.locationName, "근무지 미지정"),
            name: readString(data.name, "이름 없는 근무"),
            weekdays: readString(data.weekday, ""),
          };
        })
        .sort((left, right) => left.name.localeCompare(right.name, "ko-KR"));
    },
    async listDutyTags() {
      const workspaceId = await requireActiveWorkspaceId();
      const snapshot = await getDocs(
        query(getDutyTagsCollection(workspaceId), orderBy("createdAt", "asc")),
      );

      return snapshot.docs
        .map(mapDutyTagDocument)
        .filter((tag) => tag.statusText !== "삭제됨");
    },
    async updateDutyTag(tag, input) {
      const workspaceId = await requireActiveWorkspaceId();
      const db = getFirebaseDb();
      const batch = writeBatch(db);
      const assignedDutyIds = new Set(input.assignedDutyIds);
      const dutiesSnapshot = await getDocs(getDutiesCollection(workspaceId));

      batch.update(getDutyTagDocument(workspaceId, tag.id), {
        color: input.tone,
        name: input.label,
        nameKey: createTagNameKey(input.label),
        status: input.status,
        updatedAt: serverTimestamp(),
        usageCount: assignedDutyIds.size,
      });

      for (const duty of dutiesSnapshot.docs) {
        const tags = readStringArray(duty.data().tags);
        const currentlyAssigned = tags.includes(tag.label);
        const shouldAssign = assignedDutyIds.has(duty.id);
        const nextTags = shouldAssign
          ? addStringToArray(
              tags.filter((label) => label !== tag.label),
              input.label,
            )
          : tags.filter((label) => label !== tag.label && label !== input.label);

        if (
          currentlyAssigned === shouldAssign &&
          tag.label === input.label
        ) {
          continue;
        }

        batch.update(duty.ref, {
          tags: nextTags,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      return toDutyTagRow({
        id: tag.id,
        label: input.label,
        status: input.status,
        tone: input.tone,
        usageCount: assignedDutyIds.size,
      });
    },
  };
}

function getDutyTagsCollection(workspaceId: string) {
  return collection(getFirebaseDb(), "workspaces", workspaceId, "dutyTags");
}

function getDutyTagDocument(workspaceId: string, tagId: string) {
  return doc(getFirebaseDb(), "workspaces", workspaceId, "dutyTags", tagId);
}

function getDutiesCollection(workspaceId: string) {
  return collection(getFirebaseDb(), "workspaces", workspaceId, "duties");
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

function mapDutyTagDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): DutyTagRow {
  const data = snapshot.data();
  const usageCount = readNumber(data.usageCount, readNumber(data.count, 0));
  const status = readString(data.status, "active");

  return {
    id: snapshot.id,
    label: readString(data.name, readString(data.label, "태그 없음")),
    countText: `사용 근무 ${usageCount}건`,
    tone: readDutyTone(data.color ?? data.tone),
    statusText: readStatusText(status),
    statusTone: readStatusTone(status),
  };
}

function toDutyTagRow({
  id,
  label,
  status,
  tone,
  usageCount,
}: {
  id: string;
  label: string;
  status: DutyTagStatus | string;
  tone: DutyTone;
  usageCount: number;
}): DutyTagRow {
  return {
    countText: `사용 근무 ${usageCount}건`,
    id,
    label,
    statusText: readStatusText(status),
    statusTone: readStatusTone(status),
    tone,
  };
}

function readDutyTone(value: unknown): DutyTone {
  switch (value) {
    case "green":
    case "orange":
    case "red":
    case "blue":
    case "grey":
      return value;
    case "gray":
      return "grey";
    case "pink":
      return "red";
    case "yellow":
      return "orange";
    default:
      return "grey";
  }
}

function readStatusText(status: string) {
  switch (status) {
    case "active":
      return "활성";
    case "inactive":
      return "비활성";
    case "deleted":
      return "삭제됨";
    default:
      return status || "활성";
  }
}

function readStatusTone(status: string): DutyTone {
  switch (status) {
    case "active":
      return "green";
    case "deleted":
      return "red";
    default:
      return "grey";
  }
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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
