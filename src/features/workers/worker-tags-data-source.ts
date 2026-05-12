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
  workerTagRows,
  type WorkerTagRow,
  type WorkerTagTone,
} from "./worker-tags-fixtures";

export type WorkerTagsDataSource = {
  initialRows?: readonly WorkerTagRow[];
  listWorkerTags: () => Promise<readonly WorkerTagRow[]>;
};

type WorkerTagModel = WorkerTagRow & {
  createdAt: Date | null;
  status: string;
};

export const emptyWorkerTagRows = [] as const satisfies readonly WorkerTagRow[];

export function createWorkerTagsDataSource(): WorkerTagsDataSource {
  if (shouldUseFixtureDataSource()) {
    return createFixtureWorkerTagsDataSource();
  }

  return createFirestoreWorkerTagsDataSource();
}

function createFixtureWorkerTagsDataSource(): WorkerTagsDataSource {
  return {
    initialRows: workerTagRows,
    async listWorkerTags() {
      return workerTagRows;
    },
  };
}

function createFirestoreWorkerTagsDataSource(): WorkerTagsDataSource {
  return {
    async listWorkerTags() {
      const workspaceId = await requireActiveWorkspaceId();
      const snapshot = await getDocs(
        collection(getFirebaseDb(), "workspaces", workspaceId, "workerTags"),
      );

      return snapshot.docs
        .map(mapWorkerTagDocument)
        .filter((tag) => tag.status !== "deleted")
        .sort(compareWorkerTags)
        .map((tag) => ({
          id: tag.id,
          label: tag.label,
          countText: tag.countText,
          tone: tag.tone,
          statusText: tag.statusText,
        }));
    },
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
    countText: `적용 조교 ${usageCount}명`,
    tone: readWorkerTagTone(data.color ?? data.tone),
    statusText: readStatusLabel(status),
    createdAt: readDate(data.createdAt),
    status,
  };
}

function compareWorkerTags(left: WorkerTagModel, right: WorkerTagModel) {
  const statusCompare = getStatusRank(left.status) - getStatusRank(right.status);

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
