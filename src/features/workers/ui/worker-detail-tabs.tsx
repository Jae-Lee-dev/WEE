import { LineTabs } from "@/shared/ui/line-tabs";
import type {
  WorkerDetailTab,
  WorkerDetailTabId,
} from "../model/worker-detail-common-fixtures";

type WorkerDetailTabsProps = {
  activeTab: WorkerDetailTabId;
  tabs: readonly WorkerDetailTab[];
};

function WorkerDetailTabs({ activeTab, tabs }: WorkerDetailTabsProps) {
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

export { WorkerDetailTabs };
