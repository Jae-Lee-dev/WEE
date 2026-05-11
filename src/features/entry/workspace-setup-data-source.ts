import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb, isMockFirebaseProject } from "@/lib/firebase/client";
import { resolveActiveWorkspaceId } from "./workspace-data-source";
import {
  markWorkspaceSetupComplete,
  readActiveWorkspaceId,
  readWorkspaceOnboardingStatus,
  type WorkspaceOnboardingStatus,
} from "./workspace-onboarding-state";

export type WorkspaceSetupProgress = {
  dutyCount: number;
  locationCount: number;
  setupComplete: boolean;
  status: WorkspaceOnboardingStatus;
};

export type WorkspaceSetupDataSource = {
  loadProgress: () => Promise<WorkspaceSetupProgress>;
};

export function createWorkspaceSetupDataSource(): WorkspaceSetupDataSource {
  if (shouldUseVisualMockDataSource()) {
    return createMockWorkspaceSetupDataSource();
  }

  return createFirestoreWorkspaceSetupDataSource();
}

function createFirestoreWorkspaceSetupDataSource(): WorkspaceSetupDataSource {
  return {
    async loadProgress() {
      const workspaceId = await resolveActiveWorkspaceId();

      if (!workspaceId) {
        return createEmptySetupProgress("missing");
      }

      const snapshot = await getDoc(
        doc(getFirebaseDb(), "workspaces", workspaceId),
      );

      if (!snapshot.exists()) {
        return createEmptySetupProgress("missing");
      }

      const setup = snapshot.data().setup;
      const locationCount = readNumberFromRecord(setup, "locationCount", 0);
      const dutyCount = readNumberFromRecord(setup, "dutyCount", 0);
      const setupComplete = locationCount > 0 && dutyCount > 0;

      if (setupComplete) {
        markWorkspaceSetupComplete();
      }

      return {
        dutyCount,
        locationCount,
        setupComplete,
        status: setupComplete ? "setup-complete" : "workspace-created",
      };
    },
  };
}

function createMockWorkspaceSetupDataSource(): WorkspaceSetupDataSource {
  return {
    async loadProgress() {
      const status = readWorkspaceOnboardingStatus();
      const setupComplete = status === "setup-complete";

      return {
        dutyCount: setupComplete ? 1 : 0,
        locationCount: setupComplete ? 1 : 0,
        setupComplete,
        status,
      };
    },
  };
}

function shouldUseVisualMockDataSource() {
  return isMockFirebaseProject() || readActiveWorkspaceId() === "workspace_visual";
}

function createEmptySetupProgress(
  status: WorkspaceOnboardingStatus,
): WorkspaceSetupProgress {
  return {
    dutyCount: 0,
    locationCount: 0,
    setupComplete: false,
    status,
  };
}

function readNumberFromRecord(value: unknown, key: string, fallback: number) {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const recordValue = (value as Record<string, unknown>)[key];

  return typeof recordValue === "number" && Number.isFinite(recordValue)
    ? recordValue
    : fallback;
}
