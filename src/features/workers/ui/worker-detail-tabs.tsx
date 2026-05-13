"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import Link from "next/link";
import { useMemo } from "react";
import { SlidingTabTextMask } from "@/shared/ui/sliding-tab-text-mask";
import { useSlidingTabIndicator } from "@/shared/ui/use-sliding-tab-indicator";
import { cn } from "@/shared/lib/utils";
import type {
  WorkerDetailTab,
  WorkerDetailTabId,
} from "../model/worker-detail-common-fixtures";

type WorkerDetailTabsProps = {
  tabs: readonly WorkerDetailTab[];
};

function useWorkerDetailActiveTab(): WorkerDetailTabId {
  const segment = useSelectedLayoutSegment();

  if (segment === "schedule" || segment === "payroll") {
    return segment;
  }

  return "basic";
}

function WorkerDetailTabs({ tabs }: WorkerDetailTabsProps) {
  const activeTab = useWorkerDetailActiveTab();
  const tabOptions = useMemo(
    () =>
      tabs.map((tab) => ({
        value: tab.id,
        label: tab.label,
      })),
    [tabs],
  );
  const { indicatorStyle, itemStyles, listRef, slidingTabValueAttribute } =
    useSlidingTabIndicator<WorkerDetailTabId, HTMLElement>({
      options: tabOptions,
      value: activeTab,
    });

  return (
    <nav
      ref={listRef}
      aria-label="조교 상세 탭"
      className="group/worker-detail-tabs relative isolate flex h-9 items-end overflow-hidden border-b border-gray-200"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 z-0 h-0.5 rounded-full bg-green-400 transition-opacity duration-150 ease-out"
        data-testid="worker-detail-tabs-indicator"
        style={{
          opacity: indicatorStyle ? 1 : 0,
          width: indicatorStyle?.width ?? 0,
          transform: `translateX(${indicatorStyle?.x ?? 0}px)`,
        }}
      />
      {tabs.map((tab) => {
        const active = tab.id === activeTab;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative z-10 flex h-9 items-start border-b-2 px-3 text-h-16-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200",
              active
                ? "border-transparent text-gray-500 hover:text-gray-800 active:text-gray-900"
                : "border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-800 active:text-gray-900",
              tab.id === "basic" ? "" : "ml-2",
            )}
            {...{ [slidingTabValueAttribute]: tab.id }}
          >
            <SlidingTabTextMask
              activeClassName="text-green-400 group-has-[[aria-current=page]:hover]/worker-detail-tabs:text-green-450 group-has-[[aria-current=page]:active]/worker-detail-tabs:text-green-500"
              indicatorStyle={indicatorStyle}
              itemStyle={itemStyles[tab.id]}
              overlayClassName="items-start justify-center"
            >
              {tab.label}
            </SlidingTabTextMask>
          </Link>
        );
      })}
    </nav>
  );
}

export { WorkerDetailTabs, useWorkerDetailActiveTab };
