"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import {
  createWorkerDetailTabs,
  defaultWorkerDetailRouteId,
  workerDetailProfile,
  type WorkerDetailProfile,
} from "../model/worker-detail-common-fixtures";
import {
  WorkerDetailTabs,
  useWorkerDetailActiveTab,
} from "./worker-detail-tabs";

type WorkerDetailSubsectionProps = {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  testId?: string;
};

type WorkerDetailSubsectionHeaderProps = {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

type WorkerDetailDeleteHandler = () => void;

type WorkerDetailShellContextValue = {
  setDeleteHandler: (handler: WorkerDetailDeleteHandler | null) => void;
  setProfile: (profile: WorkerDetailProfile) => void;
};

const WorkerDetailShellContext =
  createContext<WorkerDetailShellContextValue | null>(null);

export function WorkerDetailShell({
  children,
  initialProfile = workerDetailProfile,
  workerId = defaultWorkerDetailRouteId,
}: {
  children: ReactNode;
  initialProfile?: WorkerDetailProfile;
  workerId?: string;
}) {
  const activeTab = useWorkerDetailActiveTab();
  const [deleteHandler, setDeleteHandlerState] =
    useState<WorkerDetailDeleteHandler | null>(null);
  const [profile, setProfile] = useState<WorkerDetailProfile>(initialProfile);
  const workerDetailTabs = useMemo(
    () => createWorkerDetailTabs(workerId),
    [workerId],
  );
  const shellMaxWidthClassName =
    activeTab === "payroll" ? "max-w-[1580px]" : "max-w-[1480px]";
  const setDeleteHandler = useCallback(
    (handler: WorkerDetailDeleteHandler | null) => {
      setDeleteHandlerState(() => handler);
    },
    [],
  );
  const contextValue = useMemo(
    () => ({ setDeleteHandler, setProfile }),
    [setDeleteHandler],
  );
  return (
    <WorkerDetailShellContext.Provider value={contextValue}>
      <section
        aria-label="조교 상세"
        className={cn(
          "mx-auto flex w-full flex-col gap-4 tracking-normal",
          shellMaxWidthClassName,
        )}
        data-testid="worker-detail-shell"
      >
        <WorkerProfileCard profile={profile} onDelete={deleteHandler} />
        <WorkerDetailTabs tabs={workerDetailTabs} />
        {children}
      </section>
    </WorkerDetailShellContext.Provider>
  );
}

export function useWorkerDetailProfileSync(profile: WorkerDetailProfile) {
  const context = useContext(WorkerDetailShellContext);

  useEffect(() => {
    context?.setProfile(profile);
  }, [context, profile]);
}

export function useWorkerDetailDeleteAction(
  handler: WorkerDetailDeleteHandler | null,
) {
  const context = useContext(WorkerDetailShellContext);

  useEffect(() => {
    context?.setDeleteHandler(handler);

    return () => {
      context?.setDeleteHandler(null);
    };
  }, [context, handler]);
}

export function WorkerDetailSubsection({
  ariaLabel,
  children,
  className,
  testId,
}: WorkerDetailSubsectionProps) {
  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        "flex min-h-0 flex-col gap-4 rounded-[8px] border border-gray-100 bg-white p-4",
        className,
      )}
      data-testid={testId}
    >
      {children}
    </section>
  );
}

export function WorkerDetailSubsectionHeader({
  actions,
  children,
  className,
}: WorkerDetailSubsectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex min-h-9 items-center justify-between gap-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">{children}</div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2.5">{actions}</div>
      ) : null}
    </div>
  );
}

function WorkerProfileCard({
  onDelete,
  profile,
}: {
  onDelete: WorkerDetailDeleteHandler | null;
  profile: WorkerDetailProfile;
}) {
  return (
    <section className="flex min-h-[68px] items-center justify-between gap-4 rounded-[8px] border border-gray-100 bg-white px-4 py-4">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h2 className="text-h-20 text-gray-900">{profile.name}</h2>
          <Badge variant="grey" size="M">
            {profile.tag}
          </Badge>
          <Badge
            variant="green"
            size="M"
            style={{ color: "var(--color-green-400)" }}
          >
            {profile.status}
          </Badge>
        </div>
        <div className="mt-3 flex items-center gap-4 text-h-18-regular text-gray-700">
          <span>{profile.paySummary}</span>
          <span className="h-5 w-px bg-gray-200" />
          <span>{profile.registeredSummary}</span>
          <span className="h-5 w-px bg-gray-200" />
          <span>{profile.monthlySummary}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete ?? undefined}
        className="flex h-9 items-center justify-center rounded-full border border-red-100 bg-white px-4 text-h-18-regular font-medium text-red-500 transition-colors duration-150 ease-out hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-100"
      >
        {profile.deleteLabel}
      </button>
    </section>
  );
}
