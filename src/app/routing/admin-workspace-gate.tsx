"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getAdminWorkspaceRedirectPath,
  readWorkspaceOnboardingStatus,
} from "@/entities/workspace";

export function AdminWorkspaceGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const status = useSyncExternalStore(
    subscribeWorkspaceStatus,
    readWorkspaceOnboardingStatus,
    getServerWorkspaceStatus,
  );
  const redirectPath = getAdminWorkspaceRedirectPath({ pathname, status });

  useEffect(() => {
    if (redirectPath) {
      router.replace(redirectPath);
    }
  }, [redirectPath, router]);

  if (redirectPath) {
    return (
      <main
        aria-label="소속 상태 확인 중"
        className="min-h-dvh bg-gray-50"
        data-testid="workspace-route-gate"
      />
    );
  }

  return children;
}

function subscribeWorkspaceStatus() {
  return () => {};
}

function getServerWorkspaceStatus() {
  return "setup-complete" as const;
}
