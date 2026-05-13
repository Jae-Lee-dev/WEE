"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { LineTabs } from "@/shared/ui/line-tabs";
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

  return (
    <nav aria-label="조교 상세 탭" className="h-9 px-4">
      <LineTabs
        options={tabs.map((tab) => ({
          value: tab.id,
          label: tab.label,
          href: tab.href,
        }))}
        value={activeTab}
        className="h-9 w-full justify-start"
      />
    </nav>
  );
}

export { WorkerDetailTabs, useWorkerDetailActiveTab };
