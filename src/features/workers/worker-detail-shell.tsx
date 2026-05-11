import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  workerDetailProfile,
  workerDetailTabs,
  type WorkerDetailTabId,
} from "./worker-detail-common-fixtures";

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
}: {
  activeTab: WorkerDetailTabId;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label="조교 상세"
      className={cn(
        "mx-auto flex w-full max-w-[1480px] flex-col gap-4 tracking-normal",
        className,
      )}
      data-testid="worker-detail-shell"
    >
      <WorkerProfileCard />
      <WorkerDetailTabs activeTab={activeTab} />
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

function WorkerProfileCard() {
  return (
    <section className="flex min-h-[68px] items-center justify-between gap-4 rounded-[8px] border border-gray-100 bg-white px-4 py-4">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h2 className="text-h-20 text-gray-900">
            {workerDetailProfile.name}
          </h2>
          <Badge variant="grey" size="M">
            {workerDetailProfile.tag}
          </Badge>
          <Badge
            variant="green"
            size="M"
            style={{ color: "var(--color-green-400)" }}
          >
            {workerDetailProfile.status}
          </Badge>
        </div>
        <div className="mt-3 flex items-center gap-4 text-h-18-regular text-gray-700">
          <span>{workerDetailProfile.paySummary}</span>
          <span className="h-5 w-px bg-gray-200" />
          <span>{workerDetailProfile.registeredSummary}</span>
          <span className="h-5 w-px bg-gray-200" />
          <span>{workerDetailProfile.monthlySummary}</span>
        </div>
      </div>
      <button
        type="button"
        className="flex h-9 items-center justify-center rounded-full border border-red-100 bg-white px-4 text-h-18-regular font-medium text-red-500 transition-colors duration-150 ease-out hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-100"
      >
        {workerDetailProfile.deleteLabel}
      </button>
    </section>
  );
}

function WorkerDetailTabs({ activeTab }: { activeTab: WorkerDetailTabId }) {
  return (
    <nav
      aria-label="조교 상세 탭"
      className="flex h-9 items-end gap-8 border-b border-gray-200"
    >
      {workerDetailTabs.map((tab) => {
        const active = tab.id === activeTab;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 items-start border-b-2 text-h-20 transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200",
              active
                ? "border-green-400 text-green-400"
                : "border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-800",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
