export type WorkspaceOnboardingStatus =
  | "missing"
  | "workspace-created"
  | "setup-complete";

export const activeWorkspaceUserStorageKey = "wee.admin.activeUserId.v1";
export const activeWorkspaceIdStorageKey = "wee.admin.activeWorkspaceId.v1";
export const workspaceOnboardingStorageKeyPrefix =
  "wee.admin.workspaceStatus.v1";

const anonymousWorkspaceUserId = "anonymous";

export function setActiveWorkspaceUser(userId: string) {
  getBrowserStorage()?.setItem(activeWorkspaceUserStorageKey, userId);
}

export function clearActiveWorkspaceUser() {
  getBrowserStorage()?.removeItem(activeWorkspaceUserStorageKey);
  clearActiveWorkspaceId();
}

export function setActiveWorkspaceId(workspaceId: string) {
  getBrowserStorage()?.setItem(activeWorkspaceIdStorageKey, workspaceId);
}

export function clearActiveWorkspaceId() {
  getBrowserStorage()?.removeItem(activeWorkspaceIdStorageKey);
}

export function readActiveWorkspaceId() {
  return getBrowserStorage()?.getItem(activeWorkspaceIdStorageKey) ?? null;
}

export function readActiveWorkspaceUser() {
  return getBrowserStorage()?.getItem(activeWorkspaceUserStorageKey) ?? null;
}

export function readWorkspaceOnboardingStatus(
  userId = readActiveWorkspaceUser(),
): WorkspaceOnboardingStatus {
  const status = getBrowserStorage()?.getItem(
    getWorkspaceOnboardingStorageKey(userId),
  );

  return isWorkspaceOnboardingStatus(status) ? status : "missing";
}

export function writeWorkspaceOnboardingStatus(
  status: WorkspaceOnboardingStatus,
  userId = readActiveWorkspaceUser(),
) {
  getBrowserStorage()?.setItem(getWorkspaceOnboardingStorageKey(userId), status);
}

export function markWorkspaceCreated() {
  writeWorkspaceOnboardingStatus("workspace-created");
}

export function markWorkspaceSetupComplete() {
  writeWorkspaceOnboardingStatus("setup-complete");
}

export function persistWorkspaceOnboardingState({
  status,
  userId,
  workspaceId,
}: {
  status: WorkspaceOnboardingStatus;
  userId: string;
  workspaceId: string | null;
}) {
  setActiveWorkspaceUser(userId);
  writeWorkspaceOnboardingStatus(status, userId);

  if (workspaceId) {
    setActiveWorkspaceId(workspaceId);
  } else {
    clearActiveWorkspaceId();
  }
}

export function getPostLoginRedirectPath(
  status: WorkspaceOnboardingStatus,
): string {
  if (status === "missing") {
    return "/onboarding/workspace";
  }

  return "/dashboard";
}

export function getAdminWorkspaceRedirectPath({
  status,
}: {
  status: WorkspaceOnboardingStatus;
}) {
  if (status === "missing") {
    return "/onboarding/workspace";
  }

  return null;
}

export function getSetupGuideRedirectPath(status: WorkspaceOnboardingStatus) {
  return status === "missing" ? "/onboarding/workspace" : null;
}

export function getWorkspaceOnboardingStorageKey(userId: string | null) {
  return `${workspaceOnboardingStorageKeyPrefix}.${
    userId || anonymousWorkspaceUserId
  }`;
}

function isWorkspaceOnboardingStatus(
  status: string | null | undefined,
): status is WorkspaceOnboardingStatus {
  return (
    status === "missing" ||
    status === "workspace-created" ||
    status === "setup-complete"
  );
}

function getBrowserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}
