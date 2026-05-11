import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { resolveActiveWorkspaceId } from "@/features/entry/workspace-data-source";
import { readActiveWorkspaceId } from "@/features/entry/workspace-onboarding-state";
import { getFirebaseDb, isMockFirebaseProject } from "@/lib/firebase/client";
import { settingsWorkspaceFixture } from "./settings-workspace-fixtures";

export type SettingsWorkspace = {
  businessNumber: string;
  code: string;
  contact: string;
  id: string;
  managerName: string;
  name: string;
  ownerName: string;
  plan: string;
};

export type UpdateSettingsWorkspaceInput = {
  businessNumber: string;
  contact: string;
  name: string;
  ownerName: string;
};

export type SettingsWorkspaceDataSource = {
  getWorkspace: () => Promise<SettingsWorkspace>;
  updateWorkspace: (
    input: UpdateSettingsWorkspaceInput,
  ) => Promise<SettingsWorkspace>;
};

export function createSettingsWorkspaceDataSource(): SettingsWorkspaceDataSource {
  if (shouldUseVisualMockDataSource()) {
    return createMockSettingsWorkspaceDataSource();
  }

  return createFirestoreSettingsWorkspaceDataSource();
}

function createFirestoreSettingsWorkspaceDataSource(): SettingsWorkspaceDataSource {
  return {
    async getWorkspace() {
      const workspaceId = await requireActiveWorkspaceId();
      const snapshot = await getDoc(getWorkspaceDocument(workspaceId));

      if (!snapshot.exists()) {
        throw new Error("소속 정보를 찾을 수 없습니다.");
      }

      return mapWorkspaceDocument(snapshot.id, snapshot.data());
    },

    async updateWorkspace(input) {
      const workspaceId = await requireActiveWorkspaceId();
      const workspaceRef = getWorkspaceDocument(workspaceId);
      const update = {
        businessNumber: input.businessNumber.trim(),
        contact: input.contact.trim(),
        name: input.name.trim(),
        ownerName: input.ownerName.trim(),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(workspaceRef, update);

      const snapshot = await getDoc(workspaceRef);

      if (!snapshot.exists()) {
        throw new Error("소속 정보를 찾을 수 없습니다.");
      }

      return mapWorkspaceDocument(snapshot.id, snapshot.data());
    },
  };
}

function createMockSettingsWorkspaceDataSource(): SettingsWorkspaceDataSource {
  let workspace = createFixtureWorkspace();

  return {
    async getWorkspace() {
      return workspace;
    },

    async updateWorkspace(input) {
      workspace = {
        ...workspace,
        ...input,
      };

      return workspace;
    },
  };
}

function getWorkspaceDocument(workspaceId: string) {
  return doc(getFirebaseDb(), "workspaces", workspaceId);
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

function mapWorkspaceDocument(
  id: string,
  data: Record<string, unknown>,
): SettingsWorkspace {
  return {
    businessNumber: readString(data.businessNumber, ""),
    code: readString(data.code, ""),
    contact: readString(data.contact, ""),
    id,
    managerName: readString(data.managerName, ""),
    name: readString(data.name, "이름 없는 소속"),
    ownerName: readString(data.ownerName, ""),
    plan: readString(data.plan, ""),
  };
}

function createFixtureWorkspace(): SettingsWorkspace {
  const rows = Object.fromEntries(
    settingsWorkspaceFixture.rows.map((row) => [row.id, row.value]),
  ) as Record<string, string>;

  return {
    businessNumber: rows["business-number"] ?? "",
    code: rows["invite-code"] ?? "",
    contact: rows.phone ?? "",
    id: "workspace_visual",
    managerName: rows.manager ?? "",
    name: rows["workspace-name"] ?? "",
    ownerName: rows["owner-name"] ?? "",
    plan: "starter",
  };
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}
