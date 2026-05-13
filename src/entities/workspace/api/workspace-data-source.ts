import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  getFirebaseAuth,
  getFirebaseDb,
  isMockFirebaseProject,
} from "@/shared/api/firebase/client";
import {
  persistWorkspaceOnboardingState,
  readActiveWorkspaceId,
  readActiveWorkspaceUser,
  readWorkspaceOnboardingStatus,
  type WorkspaceOnboardingStatus,
} from "../model/workspace-onboarding-state";

export type WorkspacePlanId = "starter" | "standard";

export type CreateManagerWorkspaceInput = {
  workspaceName: string;
  businessNumber: string;
  ownerName: string;
  contact: string;
  planId: WorkspacePlanId;
};

export type ManagerWorkspaceState = {
  managerUid: string;
  status: WorkspaceOnboardingStatus;
  workspaceCode: string | null;
  workspaceId: string | null;
};

const managerRole = "manager";
const maxWorkspaceCodeAttempts = 5;

type ManagerIdentity = {
  displayName: string;
  email: string;
  emailVerified: boolean;
  uid: string;
};

export async function createManagerUserDocument(user: User) {
  if (isMockFirebaseProject()) {
    return;
  }

  const userRef = getManagerUserRef(user.uid);

  await setDoc(
    userRef,
    {
      activeWorkspaceId: null,
      createdAt: serverTimestamp(),
      displayName: user.displayName ?? "",
      email: user.email ?? "",
      emailVerified: user.emailVerified,
      onboardingStatus: "missing" satisfies WorkspaceOnboardingStatus,
      role: managerRole,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function resolveManagerWorkspaceState(
  user: User,
): Promise<ManagerWorkspaceState> {
  if (isMockFirebaseProject()) {
    return {
      managerUid: user.uid,
      status: readWorkspaceOnboardingStatus(user.uid),
      workspaceCode: null,
      workspaceId: null,
    };
  }

  const userRef = getManagerUserRef(user.uid);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    await createManagerUserDocument(user);
    return {
      managerUid: user.uid,
      status: "missing",
      workspaceCode: null,
      workspaceId: null,
    };
  }

  await setDoc(
    userRef,
    {
      displayName: user.displayName ?? "",
      email: user.email ?? "",
      emailVerified: user.emailVerified,
      role: managerRole,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  const userData = userSnapshot.data();
  const activeWorkspaceId = readString(userData.activeWorkspaceId);

  if (!activeWorkspaceId) {
    return {
      managerUid: user.uid,
      status: "missing",
      workspaceCode: null,
      workspaceId: null,
    };
  }

  const workspaceSnapshot = await getDoc(getWorkspaceRef(activeWorkspaceId));

  if (!workspaceSnapshot.exists()) {
    await setDoc(
      userRef,
      {
        activeWorkspaceId: null,
        onboardingStatus: "missing" satisfies WorkspaceOnboardingStatus,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return {
      managerUid: user.uid,
      status: "missing",
      workspaceCode: null,
      workspaceId: null,
    };
  }

  const workspaceData = workspaceSnapshot.data();
  const state = {
    managerUid: user.uid,
    status: resolveWorkspaceStatus(workspaceData.setup),
    workspaceCode: readString(workspaceData.code),
    workspaceId: workspaceSnapshot.id,
  };

  await setDoc(
    userRef,
    {
      onboardingStatus: state.status,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return state;
}

export async function resolveActiveWorkspaceId() {
  const storedWorkspaceId = readActiveWorkspaceId();

  if (isMockFirebaseProject() || storedWorkspaceId === "workspace_visual") {
    return storedWorkspaceId;
  }

  const user = await readCurrentFirebaseUser();

  if (!user) {
    return storedWorkspaceId;
  }

  const workspaceState = await resolveManagerWorkspaceState(user);

  persistWorkspaceOnboardingState({
    status: workspaceState.status,
    userId: workspaceState.managerUid,
    workspaceId: workspaceState.workspaceId,
  });

  return workspaceState.workspaceId ?? storedWorkspaceId;
}

export async function createManagerWorkspace(
  input: CreateManagerWorkspaceInput,
): Promise<ManagerWorkspaceState> {
  const manager = readCurrentManagerIdentity();

  if (!manager) {
    throw new Error("로그인된 관리자 계정을 확인할 수 없습니다.");
  }

  if (isMockFirebaseProject()) {
    const workspaceCode = createWorkspaceCodeCandidate();

    return {
      managerUid: manager.uid,
      status: "workspace-created",
      workspaceCode,
      workspaceId: createMockWorkspaceId(workspaceCode),
    };
  }

  for (let attempt = 0; attempt < maxWorkspaceCodeAttempts; attempt += 1) {
    const workspaceCode = createWorkspaceCodeCandidate();
    const state = await tryCreateManagerWorkspace(
      manager,
      input,
      workspaceCode,
    );

    if (state) {
      return state;
    }
  }

  throw new Error("소속 코드를 발급하지 못했습니다. 다시 시도해 주세요.");
}

async function tryCreateManagerWorkspace(
  manager: ManagerIdentity,
  input: CreateManagerWorkspaceInput,
  workspaceCode: string,
) {
  const db = getFirebaseDb();
  const workspaceRef = doc(collection(db, "workspaces"));
  const codeRef = doc(db, "workspaceCodes", workspaceCode);
  const userRef = getManagerUserRef(manager.uid);

  return runTransaction(db, async (transaction) => {
    const codeSnapshot = await transaction.get(codeRef);

    if (codeSnapshot.exists()) {
      return null;
    }

    const workspaceDocument = {
      businessNumber: input.businessNumber,
      code: workspaceCode,
      contact: input.contact.trim(),
      createdAt: serverTimestamp(),
      managerEmail: manager.email,
      managerName: manager.displayName,
      managerUid: manager.uid,
      name: input.workspaceName.trim(),
      ownerName: input.ownerName.trim(),
      plan: input.planId,
      billingStatus: input.planId === "standard" ? "pending_pg" : "none",
      setup: {
        completedAt: null,
        dutyCount: 0,
        locationCount: 0,
      },
      status: "initializing",
      updatedAt: serverTimestamp(),
    };

    transaction.set(workspaceRef, workspaceDocument);
    transaction.set(codeRef, {
      active: true,
      createdAt: serverTimestamp(),
      workspaceId: workspaceRef.id,
    });
    transaction.set(
      userRef,
      {
        activeWorkspaceId: workspaceRef.id,
        displayName: manager.displayName,
        email: manager.email,
        emailVerified: manager.emailVerified,
        onboardingStatus: "workspace-created" satisfies WorkspaceOnboardingStatus,
        role: managerRole,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return {
      managerUid: manager.uid,
      status: "workspace-created" as const,
      workspaceCode,
      workspaceId: workspaceRef.id,
    };
  });
}

function getManagerUserRef(uid: string) {
  return doc(getFirebaseDb(), "users", uid);
}

function getWorkspaceRef(workspaceId: string) {
  return doc(getFirebaseDb(), "workspaces", workspaceId);
}

function readCurrentManagerIdentity(): ManagerIdentity | null {
  const user = getFirebaseAuth().currentUser;

  if (user) {
    return {
      displayName: user.displayName ?? "",
      email: user.email ?? "",
      emailVerified: user.emailVerified,
      uid: user.uid,
    };
  }

  const activeUserId = readActiveWorkspaceUser();

  if (!activeUserId) {
    return null;
  }

  return {
    displayName: "",
    email: "",
    emailVerified: false,
    uid: activeUserId,
  };
}

function readCurrentFirebaseUser() {
  const auth = getFirebaseAuth();

  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  return new Promise<User | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        resolve(user);
      },
      () => {
        unsubscribe();
        resolve(null);
      },
    );
  });
}

function resolveWorkspaceStatus(setup: unknown): WorkspaceOnboardingStatus {
  if (
    setup &&
    typeof setup === "object" &&
    "locationCount" in setup &&
    "dutyCount" in setup &&
    typeof setup.locationCount === "number" &&
    typeof setup.dutyCount === "number" &&
    setup.locationCount > 0 &&
    setup.dutyCount > 0
  ) {
    return "setup-complete";
  }

  return "workspace-created";
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function createWorkspaceCodeCandidate() {
  return `WEE-${createRandomDigits(6)}`;
}

function createMockWorkspaceId(workspaceCode: string) {
  return `workspace_${workspaceCode.toLocaleLowerCase("en-US").replace(/\W+/g, "_")}`;
}

function createRandomDigits(length: number) {
  const max = 10 ** length;
  const value = getRandomInteger(max);

  return value.toString().padStart(length, "0");
}

function getRandomInteger(maxExclusive: number) {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % maxExclusive;
  }

  return Math.floor(Math.random() * maxExclusive);
}
