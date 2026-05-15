"use client";

import { FilterTabs, type FilterTabTone } from "@/shared/ui/filter-tabs";
import { cn } from "@/shared/lib/utils";

export type RecordWorkTypeFilterId = "all" | "regular" | "overtime";
export type RecordSignalFilterId = "all" | "anomaly" | "correction";

type RecordFilterOption<T extends string> = {
  label: string;
  tone: FilterTabTone;
  value: T;
};

export const recordWorkTypeFilterOptions = [
  { value: "all", label: "전체", tone: "green" },
  { value: "regular", label: "일반 근무", tone: "green" },
  { value: "overtime", label: "추가 근무", tone: "blue" },
] as const satisfies readonly RecordFilterOption<RecordWorkTypeFilterId>[];

export const recordSignalFilterOptions = [
  { value: "all", label: "전체", tone: "green" },
  { value: "anomaly", label: "이상 감지", tone: "pink" },
  { value: "correction", label: "이의 신청", tone: "orange" },
] as const satisfies readonly RecordFilterOption<RecordSignalFilterId>[];

type RecordFilterTabsProps = {
  className?: string;
  onSignalFilterChange: (value: RecordSignalFilterId) => void;
  onWorkTypeFilterChange: (value: RecordWorkTypeFilterId) => void;
  signalFilterId: RecordSignalFilterId;
  workTypeFilterId: RecordWorkTypeFilterId;
};

function RecordFilterTabs({
  className,
  onSignalFilterChange,
  onWorkTypeFilterChange,
  signalFilterId,
  workTypeFilterId,
}: RecordFilterTabsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      <RecordFilterTabsGroup label="근무 유형">
        <FilterTabs
          options={[...recordWorkTypeFilterOptions]}
          value={workTypeFilterId}
          onChange={onWorkTypeFilterChange}
        />
      </RecordFilterTabsGroup>
      <span className="hidden h-5 w-px bg-gray-200 sm:block" aria-hidden="true" />
      <RecordFilterTabsGroup label="처리 신호">
        <FilterTabs
          options={[...recordSignalFilterOptions]}
          value={signalFilterId}
          onChange={onSignalFilterChange}
        />
      </RecordFilterTabsGroup>
    </div>
  );
}

function RecordFilterTabsGroup({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-body-14-medium tracking-normal text-gray-500">
        {label}
      </span>
      {children}
    </div>
  );
}

export { RecordFilterTabs };
