import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  workerDetailProfile,
  workerDetailTabs,
  type WorkerDetailTabId,
} from "./worker-detail-common-fixtures";

const avatarCheckerStyle = {
  backgroundColor: "var(--color-white)",
  backgroundImage:
    "linear-gradient(45deg, var(--color-gray-100) 25%, transparent 25%), linear-gradient(-45deg, var(--color-gray-100) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--color-gray-100) 75%), linear-gradient(-45deg, transparent 75%, var(--color-gray-100) 75%)",
  backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0",
  backgroundSize: "12px 12px",
} satisfies CSSProperties;

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
        "mx-auto flex w-full max-w-[1580px] flex-col gap-5 tracking-normal",
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

function WorkerProfileCard() {
  return (
    <section className="flex h-[116px] items-center justify-between rounded-[8px] border border-gray-200 bg-white px-5">
      <div className="flex items-center gap-6">
        <div
          aria-hidden="true"
          className="size-[76px] shrink-0 rounded-full border border-gray-100"
          style={avatarCheckerStyle}
        />
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
      </div>
      <button
        type="button"
        className="flex h-[42px] items-center justify-center rounded-full border border-red-100 bg-white px-4 text-h-18-regular font-medium text-red-500 transition-colors duration-150 ease-out hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-100"
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
      className="flex h-[41px] items-end gap-8 border-b border-gray-200"
    >
      {workerDetailTabs.map((tab) => {
        const active = tab.id === activeTab;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-[41px] items-start border-b-2 text-h-20 transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200",
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
