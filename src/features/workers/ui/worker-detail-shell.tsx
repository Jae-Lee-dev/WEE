import type { ReactNode } from "react";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import {
  createWorkerDetailTabs,
  defaultWorkerDetailRouteId,
  workerDetailProfile,
  type WorkerDetailProfile,
  type WorkerDetailTabId,
} from "../model/worker-detail-common-fixtures";
import { WorkerDetailTabs } from "./worker-detail-tabs";

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

export function WorkerDetailShell({
  activeTab,
  children,
  className,
  profile = workerDetailProfile,
  workerId = defaultWorkerDetailRouteId,
}: {
  activeTab: WorkerDetailTabId;
  children: ReactNode;
  className?: string;
  profile?: WorkerDetailProfile;
  workerId?: string;
}) {
  const workerDetailTabs = createWorkerDetailTabs(workerId);

  return (
    <section
      aria-label="조교 상세"
      className={cn(
        "mx-auto flex w-full max-w-[1480px] flex-col gap-4 tracking-normal",
        className,
      )}
      data-testid="worker-detail-shell"
    >
      <WorkerProfileCard profile={profile} />
      <WorkerDetailTabs activeTab={activeTab} tabs={workerDetailTabs} />
      {children}
    </section>
  );
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

function WorkerProfileCard({ profile }: { profile: WorkerDetailProfile }) {
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
        className="flex h-9 items-center justify-center rounded-full border border-red-100 bg-white px-4 text-h-18-regular font-medium text-red-500 transition-colors duration-150 ease-out hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-100"
      >
        {profile.deleteLabel}
      </button>
    </section>
  );
}
