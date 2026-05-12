import {
  collection,
  getDocs,
  orderBy,
  query,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { resolveActiveWorkspaceId } from "@/features/entry/workspace-data-source";
import { readActiveWorkspaceId } from "@/features/entry/workspace-onboarding-state";
import { getFirebaseDb, isMockFirebaseProject } from "@/lib/firebase/client";
import {
  dutyTagRows,
  type DutyTagRow,
  type DutyTone,
} from "./duty-fixtures";

export type DutyTagsDataSource = {
  initialRows?: readonly DutyTagRow[];
  listDutyTags: () => Promise<readonly DutyTagRow[]>;
};

export function createDutyTagsDataSource(): DutyTagsDataSource {
  if (shouldUseVisualMockDataSource()) {
    return createFixtureDutyTagsDataSource();
  }

  return createFirestoreDutyTagsDataSource();
}

function createFixtureDutyTagsDataSource(): DutyTagsDataSource {
  return {
    initialRows: dutyTagRows,
    async listDutyTags() {
      return dutyTagRows;
    },
  };
}

function createFirestoreDutyTagsDataSource(): DutyTagsDataSource {
  return {
    async listDutyTags() {
      const workspaceId = await requireActiveWorkspaceId();
      const snapshot = await getDocs(
        query(getDutyTagsCollection(workspaceId), orderBy("createdAt", "asc")),
      );

      return snapshot.docs.map(mapDutyTagDocument);
    },
  };
}

function getDutyTagsCollection(workspaceId: string) {
  return collection(getFirebaseDb(), "workspaces", workspaceId, "dutyTags");
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

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
