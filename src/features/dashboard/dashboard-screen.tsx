"use client";

import { Play, Printer } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendChartCard } from "@/components/ui/trend-chart";
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconSearch,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  dashboardFilterOptions,
  dashboardInboxRows,
  dashboardAiAnalysisPeriodOptions,
  dashboardAiMonitoringFixture,
  dashboardLocationOptions,
  dashboardLocationPeriodOptions,
  dashboardLocationSummaries,
  dashboardLocationWorkerRows,
  dashboardMetrics,
  dashboardWorkerPeriodOptions,
  dashboardWorkerPeriodProfiles,
  dashboardWorkerSummaries,
  dashboardWorkerTagOptions,
  type DashboardAiAnalysisPeriodId,
  type DashboardAiPlan,
  type DashboardAiPatternRow,
  type DashboardInboxFilter,
  type DashboardInboxRow,
  type DashboardLocationId,
  type DashboardLocationPeriodId,
  type DashboardLocationWorkerRow,
  type DashboardMetricTone,
  type DashboardOperationalMetric,
  type DashboardSelectOption,
  type DashboardTone,
  type DashboardWorkerPeriodId,
  type DashboardWorkerSummary,
  type DashboardWorkerTagId,
} from "./dashboard-fixtures";

const dashboardBadgeClassName =
  "text-detail-16-semibold tracking-normal";

const toneClassNames: Record<
  DashboardTone,
  {
    badgeStyle: { color: string };
    badge: "green" | "blue" | "orange" | "red";
  }
> = {
  green: {
    badgeStyle: { color: "var(--color-green-400)" },
    badge: "green",
  },
  blue: {
    badgeStyle: { color: "var(--color-blue-500)" },
    badge: "blue",
  },
  orange: {
    badgeStyle: { color: "var(--color-orange-400)" },
    badge: "orange",
  },
  red: {
    badgeStyle: { color: "var(--color-red-500)" },
    badge: "red",
  },
};

const metricToneClassNames: Record<
  DashboardMetricTone,
  {
    value: string;
    badge: "green" | "blue" | "orange" | "red" | "grey";
    border: string;
    background: string;
  }
> = {
  green: {
    value: "text-green-400",
    badge: "green",
    border: "border-green-200",
    background: "bg-green-100",
  },
  blue: {
    value: "text-blue-500",
    badge: "blue",
    border: "border-blue-50",
    background: "bg-blue-50",
  },
  orange: {
    value: "text-orange-400",
    badge: "orange",
    border: "border-orange-100",
    background: "bg-orange-100",
  },
  red: {
    value: "text-red-500",
    badge: "red",
    border: "border-red-100",
    background: "bg-red-50",
  },
  grey: {
    value: "text-gray-900",
    badge: "grey",
    border: "border-gray-200",
    background: "bg-gray-100",
  },
};

export function DashboardScreen() {
  const [activeFilter, setActiveFilter] =
    useState<DashboardInboxFilter>("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const rows = filterInboxRows(dashboardInboxRows[activeFilter], searchQuery);
  const triggerLabel = getFilterTriggerLabel(activeFilter);
  const countLabel = `${rows.length}건`;

  const dropdownLabelId = "dashboard-inbox-filter-label";

  return (
    <section
      aria-label="운영 인박스"
      className="flex w-full flex-col gap-4"
      data-dashboard-state={activeFilter}
    >
      <div className="relative flex min-h-[38px] items-center justify-between gap-4">
        <div className="relative shrink-0">
          <span id={dropdownLabelId} className="sr-only">
            확인 필요 유형
          </span>
          <FilterTrigger
            ariaLabelledBy={dropdownLabelId}
            dropdownOpen={dropdownOpen}
            label={triggerLabel}
            onClick={() => setDropdownOpen((open) => !open)}
            testId="dashboard-filter-trigger"
          />
          {dropdownOpen ? (
            <FilterMenu
              activeFilter={activeFilter}
              onSelect={(filter) => {
                setActiveFilter(filter);
                setDropdownOpen(false);
              }}
            />
          ) : null}
        </div>

        <SearchBox
          className="ml-auto"
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <InboxTable countLabel={countLabel} rows={rows} />
    </section>
  );
}

function FilterTrigger({
  ariaLabelledBy,
  dropdownOpen,
  label,
  onClick,
  testId,
}: {
  ariaLabelledBy: string;
  dropdownOpen: boolean;
  label: string;
  onClick: () => void;
  testId: string;
}) {
  const Icon = dropdownOpen ? IconChevronUp : IconChevronDown;

  return (
    <button
      type="button"
      aria-expanded={dropdownOpen}
      aria-haspopup="listbox"
      aria-labelledby={ariaLabelledBy}
      data-testid={testId}
      onClick={onClick}
      className="flex h-10 max-w-[190px] items-center gap-1.5 rounded-[6px] border border-gray-200 bg-white px-2.5 text-h-18-regular text-gray-700 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] transition-colors duration-150 ease-out hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
    >
      <span className="min-w-0 truncate">{label}</span>
      <Icon className="size-5 shrink-0 text-gray-600" />
    </button>
  );
}

function FilterMenu({
  activeFilter,
  onSelect,
}: {
  activeFilter: DashboardInboxFilter;
  onSelect: (filter: DashboardInboxFilter) => void;
}) {
  return (
    <div
      role="listbox"
      aria-label="확인 필요 유형"
      data-testid="dashboard-filter-menu"
      className="absolute left-[-5px] top-[46px] z-30 w-[155px] overflow-hidden rounded-[4px] bg-white py-1 shadow-[0px_8px_20px_rgba(17,24,39,0.12)]"
    >
      {dashboardFilterOptions.map((option, index) => {
        const selected = option.id === activeFilter;

        return (
          <button
            key={option.id}
            type="button"
            role="option"
            aria-selected={selected}
            data-testid={`dashboard-filter-option-${option.id}`}
            onClick={() => onSelect(option.id)}
            className={cn(
              "flex h-11 w-full items-center justify-between gap-2 border-gray-100 px-3 text-left text-h-18-regular text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200",
              index > 0 && "border-t",
            )}
          >
            <span className="min-w-0 truncate">{option.label}</span>
            {selected ? (
              <IconCheck className="size-5 shrink-0 text-green-400" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function SearchBox({
  className,
  onChange,
  value,
}: {
  className?: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label
      className={cn(
        "flex h-[43px] w-[416px] shrink-0 items-center justify-between rounded-[6px] bg-white px-4",
        className,
      )}
    >
      <span className="sr-only">운영 인박스 검색</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="검색어를 입력해 주세요"
        className="min-w-0 flex-1 bg-transparent text-h-18-regular text-gray-900 outline-none placeholder:text-gray-400"
      />
      <IconSearch className="size-6 shrink-0 text-green-400" />
    </label>
  );
}

function InboxTable({
  countLabel,
  rows,
}: {
  countLabel: string;
  rows: readonly DashboardInboxRow[];
}) {
  return (
    <div className="min-h-[560px] overflow-hidden rounded-[8px] bg-white">
      <div className="flex h-[56px] items-center gap-3 px-4">
        <h2 className="text-h-20 text-gray-900">확인 필요</h2>
        <Badge variant="grey" size="M">
          {countLabel}
        </Badge>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[1540px]">
          <div className="grid h-9 grid-cols-[260px_200px_260px_380px_200px_240px] items-center border-b border-gray-300 px-4 text-h-18-regular text-gray-500">
            <div>유형</div>
            <div>대상</div>
            <div>근무지</div>
            <div>내용</div>
            <div>일시</div>
            <div>상태</div>
          </div>
          {rows.map((row) => (
            <div
              key={row.id}
              data-action-type={row.action.actionType}
              data-target-id={row.action.targetId}
              data-record-type={row.action.recordType}
              className="grid h-[42px] grid-cols-[260px_200px_260px_380px_200px_240px] items-center border-b border-gray-100 px-4 text-h-18-regular text-gray-900"
            >
              <div>
                <InboxTypeBadge filter={row.filter}>{row.type}</InboxTypeBadge>
              </div>
              <div>{row.target}</div>
              <div>{row.location}</div>
              <div>{row.content}</div>
              <div>{row.date}</div>
              <div>
                <Badge variant="grey" size="M">
                  {row.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardLocationsScreen() {
  const [locationId, setLocationId] = useState<DashboardLocationId>("daechi");
  const [periodId, setPeriodId] =
    useState<DashboardLocationPeriodId>("2026-04");
  const summary = dashboardLocationSummaries[locationId][periodId];
  const rows = dashboardLocationWorkerRows[locationId];
  const periodLabel = getOptionLabel(dashboardLocationPeriodOptions, periodId);

  const metrics = [
    {
      id: "total-hours",
      label: "총 근무시간",
      value: String(summary.totalHours),
      unit: "h",
      subLabel: periodLabel,
      tone: "green",
    },
    {
      id: "active-workers",
      label: "활성 조교",
      value: String(summary.activeWorkers),
      unit: "명",
      subLabel: getOptionLabel(dashboardLocationOptions, locationId),
      tone: "blue",
    },
    {
      id: "unresolved-flags",
      label: "미처리 이상 플래그",
      value: String(summary.unresolvedFlags),
      unit: "건",
      subLabel: summary.unresolvedFlags > 3 ? "우선 확인 필요" : "관리 범위",
      tone: summary.unresolvedFlags > 3 ? "red" : "orange",
    },
    {
      id: "late-rate",
      label: "평균 지각률",
      value: summary.lateRate.toFixed(1),
      unit: "%",
      subLabel: summary.lateRate > 5 ? "전월 대비 관찰" : "안정 범위",
      tone: summary.lateRate > 5 ? "orange" : "green",
    },
  ] as const satisfies readonly DashboardOperationalMetric[];

  return (
    <section
      aria-label="근무지별 대시보드"
      className="flex w-full flex-col gap-4"
      data-dashboard-location-state={`${locationId}:${periodId}`}
      data-testid="dashboard-locations-screen"
    >
      <ToolbarShell>
        <div className="flex flex-wrap items-center gap-2.5">
          <DashboardSelectField
            ariaLabel="근무지 선택"
            options={dashboardLocationOptions}
            testId="dashboard-location-select"
            value={locationId}
            onChange={setLocationId}
          />
          <DashboardSelectField
            ariaLabel="기간 선택"
            options={dashboardLocationPeriodOptions}
            testId="dashboard-location-period-select"
            value={periodId}
            onChange={setPeriodId}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 rounded-full px-4 text-h-18-regular font-normal tracking-normal"
        >
          <Printer className="size-5 text-green-400" />
          필터 기준 엑셀 내보내기
        </Button>
      </ToolbarShell>

      <OperationalMetricGrid metrics={metrics} />
      <LocationWorkerTable rows={rows} />
    </section>
  );
}

export function DashboardWorkersScreen() {
  const [periodId, setPeriodId] = useState<DashboardWorkerPeriodId>("month");
  const [searchQuery, setSearchQuery] = useState("");
  const [tagId, setTagId] = useState<DashboardWorkerTagId>("all");
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(
    dashboardWorkerSummaries[0]?.id ?? "",
  );

  const filteredWorkers = useMemo(
    () =>
      dashboardWorkerSummaries.filter((worker) => {
        const trimmedQuery = searchQuery.trim().toLowerCase();
        const matchesQuery =
          trimmedQuery.length === 0 ||
          worker.name.toLowerCase().includes(trimmedQuery);
        const matchesTag =
          tagId === "all" || worker.tags.some((tag) => tag === tagId);

        return matchesQuery && matchesTag;
      }),
    [searchQuery, tagId],
  );

  const selectedWorker =
    filteredWorkers.find((worker) => worker.id === selectedWorkerId) ??
    filteredWorkers[0];
  const activeWorkerId = selectedWorker?.id ?? "";

  return (
    <section
      aria-label="근무자별 대시보드"
      className="flex w-full flex-col gap-4"
      data-dashboard-worker-state={`${periodId}:${tagId}:${selectedWorker?.id ?? "empty"}`}
      data-testid="dashboard-workers-screen"
    >
      <ToolbarShell>
        <div className="flex flex-wrap items-center gap-2.5">
          <DashboardSelectField
            ariaLabel="근무자 집계 기간"
            options={dashboardWorkerPeriodOptions}
            testId="dashboard-worker-period-select"
            value={periodId}
            onChange={setPeriodId}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 rounded-full px-4 text-h-18-regular font-normal tracking-normal"
          >
            <Printer className="size-5 text-green-400" />
            선택 기간 엑셀 내보내기
          </Button>
        </div>
        <p className="text-body-14-regular text-gray-500">
          선택 기간 기준 근태 요약과 급여 추이를 표시합니다.
        </p>
      </ToolbarShell>

      <div className="grid min-h-[520px] grid-cols-[232px_minmax(0,1fr)] gap-4">
        <WorkerSelectorPanel
          filteredWorkers={filteredWorkers}
          searchQuery={searchQuery}
          selectedWorkerId={activeWorkerId}
          tagId={tagId}
          onSearchChange={setSearchQuery}
          onSelectWorker={setSelectedWorkerId}
          onTagChange={setTagId}
        />
        {selectedWorker ? (
          <WorkerDashboardPanel periodId={periodId} worker={selectedWorker} />
        ) : (
          <EmptyPanel>선택 가능한 조교가 없습니다.</EmptyPanel>
        )}
      </div>
    </section>
  );
}

export function DashboardAiMonitoringScreen({
  plan = "standard",
}: {
  plan?: DashboardAiPlan;
}) {
  const [analysisPeriodId, setAnalysisPeriodId] =
    useState<DashboardAiAnalysisPeriodId>(
      dashboardAiMonitoringFixture.defaultPeriodId,
    );
  const [lastRunPeriodId, setLastRunPeriodId] =
    useState<DashboardAiAnalysisPeriodId>(
      dashboardAiMonitoringFixture.defaultPeriodId,
    );

  if (plan === "starter") {
    return <DashboardAiLockedState />;
  }

  return (
    <section
      aria-label="AI 이상탐지 및 모니터링"
      className="flex w-full flex-col gap-4"
      data-dashboard-ai-state={`${plan}:${lastRunPeriodId}`}
      data-testid="dashboard-ai-monitoring-screen"
    >
      <OperationalMetricGrid metrics={dashboardAiMonitoringFixture.metrics} />

      <div className="rounded-[8px] border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h2 className="text-h-20 text-gray-900">AI 이상탐지 실행</h2>
            <p className="mt-1 text-body-14-regular text-gray-500">
              근무기록, 추가근무, 이의신청, 급여 불일치 패턴을 분석합니다.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <DashboardSelectField
              ariaLabel="AI 분석 기간"
              options={dashboardAiAnalysisPeriodOptions}
              testId="dashboard-ai-period-select"
              value={analysisPeriodId}
              onChange={setAnalysisPeriodId}
            />
            <Button
              type="button"
              size="sm"
              onClick={() => setLastRunPeriodId(analysisPeriodId)}
              className="h-10 rounded-full px-4 text-h-18-regular font-normal tracking-normal text-white"
              data-testid="dashboard-ai-run-analysis"
            >
              <Play className="size-4" />
              패턴 분석 실행
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <AiRunInfoCard label="최근 실행" value={dashboardAiMonitoringFixture.lastRunAt} />
          <AiRunInfoCard
            label="분석 범위"
            value={getOptionLabel(dashboardAiAnalysisPeriodOptions, lastRunPeriodId)}
          />
          <AiRunInfoCard label="권장 액션" value="REC-01 검토" />
        </div>
      </div>

      <AiPatternTable rows={dashboardAiMonitoringFixture.patternRows} />
    </section>
  );
}

function ToolbarShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[38px] items-center justify-between gap-4">
      {children}
    </div>
  );
}

function DashboardSelectField<T extends string>({
  ariaLabel,
  onChange,
  options,
  testId,
  value,
}: {
  ariaLabel: string;
  onChange: (value: T) => void;
  options: readonly DashboardSelectOption<T>[];
  testId?: string;
  value: T;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{ariaLabel}</span>
      <select
        aria-label={ariaLabel}
        data-testid={testId}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-10 min-w-[150px] appearance-none rounded-[6px] border border-gray-200 bg-white py-0 pl-3 pr-9 text-h-18-regular text-gray-800 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] outline-none transition-colors duration-150 ease-out hover:border-gray-300 focus-visible:ring-2 focus-visible:ring-green-200"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <IconChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-5 -translate-y-1/2 text-gray-600" />
    </label>
  );
}

function OperationalMetricGrid({
  metrics,
}: {
  metrics: readonly DashboardOperationalMetric[];
}) {
  return (
    <div className="grid grid-cols-4 gap-4" aria-label="운영 요약">
      {metrics.map((metric) => (
        <OperationalMetricCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
}

function OperationalMetricCard({
  metric,
}: {
  metric: DashboardOperationalMetric;
}) {
  const tone = metricToneClassNames[metric.tone ?? "green"];
  const compactValue = !metric.unit && metric.value.length >= 7;

  return (
    <div className="min-h-[92px] rounded-[8px] border border-gray-200 bg-white px-4 py-4">
      <div className="truncate text-label-18 text-gray-800">{metric.label}</div>
      <div className={cn("mt-1 flex items-baseline gap-1", tone.value)}>
        <span
          className={cn(
            "tracking-normal",
            compactValue ? "text-h-24 font-semibold" : "text-h-32",
          )}
        >
          {metric.value}
        </span>
        {metric.unit ? <span className="text-h-20">{metric.unit}</span> : null}
      </div>
      {metric.subLabel ? (
        <p className="mt-1 truncate text-body-14-regular text-gray-500">
          {metric.subLabel}
        </p>
      ) : null}
    </div>
  );
}

function LocationWorkerTable({
  rows,
}: {
  rows: readonly DashboardLocationWorkerRow[];
}) {
  return (
    <div className="min-h-[520px] overflow-hidden rounded-[8px] bg-white">
      <div className="flex h-[56px] items-center gap-3 px-4">
        <h2 className="text-h-20 text-gray-900">조교별 근태 현황</h2>
        <Badge variant="grey" size="M">
          {rows.length}명
        </Badge>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[1120px]">
          <div className="grid h-9 grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1fr] items-center border-b border-gray-300 px-4 text-h-18-regular text-gray-500">
            <div>조교</div>
            <div>근무시간</div>
            <div>지각</div>
            <div>위치이상</div>
            <div>결근</div>
            <div>이상 비율</div>
          </div>
          {rows.map((row) => (
            <div
              key={row.id}
              data-action-type={row.action.actionType}
              data-target-id={row.action.targetId}
              data-record-type={row.action.recordType}
              className="grid h-11 grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1fr] items-center border-b border-gray-100 px-4 text-h-18-regular text-gray-900 last:border-b-0"
            >
              <div className="min-w-0 truncate">{row.workerName}</div>
              <div>{row.workHours}h</div>
              <CountCell count={row.lateCount} unit="회" tone="orange" />
              <CountCell count={row.locationAnomalyCount} unit="건" tone="red" />
              <CountCell count={row.absenceCount} unit="건" tone="red" />
              <div
                className={cn(
                  row.anomalyRate > 5 ? "text-orange-400" : "text-gray-600",
                )}
              >
                {row.anomalyRate.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CountCell({
  count,
  tone,
  unit,
}: {
  count: number;
  tone: DashboardMetricTone;
  unit: string;
}) {
  if (count === 0) {
    return <div className="text-gray-400">-</div>;
  }

  return (
    <div className={cn("font-semibold", metricToneClassNames[tone].value)}>
      {count}
      {unit}
    </div>
  );
}

function WorkerSelectorPanel({
  filteredWorkers,
  onSearchChange,
  onSelectWorker,
  onTagChange,
  searchQuery,
  selectedWorkerId,
  tagId,
}: {
  filteredWorkers: readonly DashboardWorkerSummary[];
  onSearchChange: (value: string) => void;
  onSelectWorker: (workerId: string) => void;
  onTagChange: (value: DashboardWorkerTagId) => void;
  searchQuery: string;
  selectedWorkerId: string;
  tagId: DashboardWorkerTagId;
}) {
  return (
    <div className="min-h-0 overflow-hidden rounded-[8px] bg-white">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
        <div className="mb-3 text-label-12-medium text-gray-500">
          조교 목록 ({filteredWorkers.length}/{dashboardWorkerSummaries.length}명)
        </div>
        <label className="flex h-10 items-center gap-2 rounded-[6px] border border-gray-200 bg-white px-3 text-h-16-medium text-gray-900">
          <span className="sr-only">조교 이름 검색</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="조교 이름 검색"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-gray-400"
            data-testid="dashboard-worker-search"
          />
          <IconSearch className="size-5 shrink-0 text-green-400" />
        </label>
        <div className="mt-2">
          <DashboardSelectField
            ariaLabel="근무자 태그 필터"
            options={dashboardWorkerTagOptions}
            testId="dashboard-worker-tag-select"
            value={tagId}
            onChange={onTagChange}
          />
        </div>
      </div>

      <div className="max-h-[598px] overflow-y-auto">
        {filteredWorkers.length === 0 ? (
          <EmptyPanel compact>검색 결과가 없습니다.</EmptyPanel>
        ) : (
          filteredWorkers.map((worker) => {
            const selected = worker.id === selectedWorkerId;

            return (
              <button
                key={worker.id}
                type="button"
                aria-pressed={selected}
                data-action-type={worker.action.actionType}
                data-target-id={worker.action.targetId}
                data-record-type={worker.action.recordType}
                onClick={() => onSelectWorker(worker.id)}
                className={cn(
                  "block w-full border-b border-gray-100 px-4 py-3 text-left transition-colors duration-150 ease-out last:border-b-0 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200",
                  selected && "bg-green-100 hover:bg-green-100",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-detail-12 font-semibold",
                      selected
                        ? "bg-green-400 text-white"
                        : "bg-gray-100 text-gray-600",
                    )}
                  >
                    {worker.initials}
                  </span>
                  <span className="min-w-0 truncate text-h-16-semibold text-gray-900">
                    {worker.name}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 pl-9">
                  {worker.tags.map((tag) => (
                    <Badge key={tag} variant="grey" size="M">
                      {getOptionLabel(dashboardWorkerTagOptions, tag)}
                    </Badge>
                  ))}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function WorkerDashboardPanel({
  periodId,
  worker,
}: {
  periodId: DashboardWorkerPeriodId;
  worker: DashboardWorkerSummary;
}) {
  const profile = dashboardWorkerPeriodProfiles[periodId];
  const totalHours = Math.round(worker.baseHours * profile.hoursFactor);
  const totalPay = Math.round(worker.basePay * profile.payFactor);
  const totalFlags = Math.max(0, worker.baseFlags + profile.flagDelta);
  const lateRate = Math.max(0, worker.lateRate + profile.lateDelta);
  const periodLabel = getOptionLabel(dashboardWorkerPeriodOptions, periodId);
  const hourTrend = profile.hourParts.map((part) => Math.round(totalHours * part));
  const payTrend = profile.payParts.map((part) => Math.round(totalPay * part));

  const metrics = [
    {
      id: "work-hours",
      label: "선택 기간 근무시간",
      value: String(totalHours),
      unit: "h",
      subLabel: periodLabel,
      tone: "green",
    },
    {
      id: "expected-pay",
      label: "선택 기간 예상 급여",
      value: formatCurrency(totalPay),
      subLabel: periodLabel,
      tone: "orange",
    },
    {
      id: "flags",
      label: "이상 플래그",
      value: String(totalFlags),
      unit: "건",
      subLabel: totalFlags > 0 ? "확인 필요" : "미처리 없음",
      tone: totalFlags > 0 ? "orange" : "green",
    },
    {
      id: "late-rate",
      label: "지각률",
      value: lateRate.toFixed(1),
      unit: "%",
      subLabel: lateRate > 5 ? "주의" : "안정",
      tone: lateRate > 5 ? "orange" : "green",
    },
  ] as const satisfies readonly DashboardOperationalMetric[];

  return (
    <div className="min-w-0 overflow-y-auto">
      <div className="flex flex-col gap-4">
        <OperationalMetricGrid metrics={metrics} />

        <div className="grid grid-cols-2 gap-4">
          <TrendCard
            accentTone="green"
            labels={profile.labels}
            title="근무시간 추이"
            values={hourTrend}
            valueFormatter={(value) => `${value}h`}
          />
          <TrendCard
            accentTone="orange"
            labels={profile.labels}
            title="급여 추이"
            values={payTrend}
            valueFormatter={formatCurrency}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FlagDistributionCard worker={worker} />
          <WorkerMemoCard worker={worker} />
        </div>

        <WorkerPayrollHistoryTable worker={worker} />
      </div>
    </div>
  );
}

function TrendCard({
  accentTone,
  labels,
  title,
  valueFormatter,
  values,
}: {
  accentTone: DashboardMetricTone;
  labels: readonly string[];
  title: string;
  valueFormatter: (value: number) => string;
  values: readonly number[];
}) {
  const data = values.map((value, index) => ({
    id: `${title}-${labels[index] ?? index}`,
    label: labels[index] ?? String(index + 1),
    value,
  }));

  return (
    <TrendChartCard
      data={data}
      title={title}
      tone={accentTone}
      valueFormatter={valueFormatter}
    />
  );
}

function FlagDistributionCard({ worker }: { worker: DashboardWorkerSummary }) {
  return (
    <div className="rounded-[8px] border border-gray-200 bg-white p-4">
      <h2 className="text-h-20 text-gray-900">이상 플래그 분포</h2>
      <div className="mt-4 divide-y divide-gray-100">
        {worker.flagDistribution.map((item) => (
          <div
            key={item.type}
            className="flex h-10 items-center justify-between gap-4 text-h-16-medium"
          >
            <span className="text-gray-600">{item.type}</span>
            <span
              className={cn(
                "font-semibold",
                item.count > 0
                  ? metricToneClassNames[item.tone].value
                  : "text-gray-400",
              )}
            >
              {item.count}건
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkerMemoCard({ worker }: { worker: DashboardWorkerSummary }) {
  return (
    <div className="rounded-[8px] border border-gray-200 bg-white p-4">
      <h2 className="text-h-20 text-gray-900">운영 메모</h2>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {worker.tags.map((tag) => (
          <Badge key={tag} variant="grey" size="M">
            {getOptionLabel(dashboardWorkerTagOptions, tag)}
          </Badge>
        ))}
      </div>
      <p className="mt-4 rounded-[8px] bg-gray-50 px-4 py-3 text-body-14-regular text-gray-600">
        {worker.memoSummary}
      </p>
      <div className="mt-4 space-y-2">
        {worker.memoPoints.map((point) => (
          <div key={point} className="flex items-start gap-2 text-body-14-regular text-gray-600">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-green-400" />
            <span>{point}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-gray-100 pt-3 text-label-12-regular text-gray-500">
        최근 업데이트 · {worker.memoUpdatedAt}
      </div>
    </div>
  );
}

function WorkerPayrollHistoryTable({
  worker,
}: {
  worker: DashboardWorkerSummary;
}) {
  return (
    <div className="overflow-hidden rounded-[8px] bg-white">
      <div className="flex h-[56px] items-center gap-3 px-4">
        <h2 className="text-h-20 text-gray-900">최근 명세 상태</h2>
        <Badge variant="grey" size="M">
          {worker.payrollHistory.length}건
        </Badge>
      </div>
      <div className="grid h-9 grid-cols-[1fr_1fr_1fr] items-center border-b border-gray-300 px-4 text-h-18-regular text-gray-500">
        <div>월</div>
        <div>최종 급여</div>
        <div>상태</div>
      </div>
      {worker.payrollHistory.map((item) => (
        <div
          key={item.month}
          className="grid h-11 grid-cols-[1fr_1fr_1fr] items-center border-b border-gray-100 px-4 text-h-18-regular text-gray-900 last:border-b-0"
        >
          <div>{item.month}</div>
          <div>{formatCurrency(item.finalPay)}</div>
          <div>
            <MetricToneBadge tone={item.tone}>{item.status}</MetricToneBadge>
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardAiLockedState() {
  return (
    <section
      aria-label="AI 이상탐지 잠금"
      className="rounded-[8px] border border-gray-200 bg-white p-6"
      data-dashboard-ai-state="starter"
      data-testid="dashboard-ai-locked-state"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_280px] items-center gap-6">
        <div>
          <Badge variant="grey" size="M">
            Standard 전용
          </Badge>
          <h2 className="mt-4 text-h-24 text-gray-900">
            AI 이상탐지/모니터링 잠금
          </h2>
          <p className="mt-2 max-w-[720px] text-body-16-regular text-gray-600">
            규칙 기반 이상 플래그는 모든 플랜에서 계속 동작합니다. 복합 패턴
            분석, 이상률 추이, AI 권장 액션은 Standard 플랜에서 사용할 수
            있습니다.
          </p>
          <div className="mt-5 flex gap-2.5">
            <Button type="button" size="sm" className="h-10 rounded-full px-4 text-white">
              Standard로 업그레이드
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 rounded-full px-4"
            >
              규칙 기반 플래그 보기
            </Button>
          </div>
        </div>
        <div className="rounded-[8px] border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-h-16-semibold text-gray-900">Standard 포함 기능</h3>
          <div className="mt-3 space-y-2 text-body-14-regular text-gray-600">
            {dashboardAiMonitoringFixture.lockedFeatures.map((feature) => (
              <div key={feature}>- {feature}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AiRunInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="text-label-12-medium text-gray-500">{label}</div>
      <div className="mt-1 truncate text-h-16-semibold text-gray-900">
        {value}
      </div>
    </div>
  );
}

function AiPatternTable({ rows }: { rows: readonly DashboardAiPatternRow[] }) {
  return (
    <div className="min-h-[360px] overflow-hidden rounded-[8px] bg-white">
      <div className="flex h-[56px] items-center gap-3 px-4">
        <h2 className="text-h-20 text-gray-900">탐지 결과</h2>
        <Badge variant="grey" size="M">
          {rows.length}건
        </Badge>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[1060px]">
          <div className="grid h-9 grid-cols-[120px_170px_250px_minmax(360px,1fr)_130px] items-center border-b border-gray-300 px-4 text-h-18-regular text-gray-500">
            <div>심각도</div>
            <div>대상</div>
            <div>패턴</div>
            <div>근거</div>
            <div>상태</div>
          </div>
          {rows.map((row) => (
            <div
              key={row.id}
              data-action-type={row.action.actionType}
              data-target-id={row.action.targetId}
              data-record-type={row.action.recordType}
              className="grid min-h-[48px] grid-cols-[120px_170px_250px_minmax(360px,1fr)_130px] items-center border-b border-gray-100 px-4 text-h-18-regular text-gray-900 last:border-b-0"
            >
              <div>
                <MetricToneBadge tone={row.severityTone}>{row.severity}</MetricToneBadge>
              </div>
              <div className="min-w-0 truncate">{row.target}</div>
              <div className="min-w-0 truncate">{row.pattern}</div>
              <div className="min-w-0 truncate text-gray-600">{row.evidence}</div>
              <div>
                <MetricToneBadge tone={row.statusTone}>{row.status}</MetricToneBadge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyPanel({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center text-center text-body-14-regular text-gray-500",
        compact ? "min-h-[180px] px-4" : "min-h-[320px] rounded-[8px] bg-white",
      )}
    >
      {children}
    </div>
  );
}

function MetricToneBadge({
  children,
  tone,
}: {
  children: string;
  tone: DashboardMetricTone;
}) {
  return (
    <Badge
      variant={metricToneClassNames[tone].badge}
      size="M"
      className={dashboardBadgeClassName}
    >
      {children}
    </Badge>
  );
}

function getOptionLabel<T extends string>(
  options: readonly DashboardSelectOption<T>[],
  value: T,
) {
  return options.find((option) => option.id === value)?.label ?? value;
}

function formatCurrency(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function filterInboxRows(
  rows: readonly DashboardInboxRow[],
  searchQuery: string,
) {
  const query = searchQuery.trim().toLowerCase();

  if (!query) {
    return rows;
  }

  return rows.filter((row) =>
    [row.type, row.target, row.location, row.content, row.date, row.status]
      .join(" ")
      .toLowerCase()
      .includes(query),
  );
}

function InboxTypeBadge({
  children,
  filter,
}: {
  children: string;
  filter: Exclude<DashboardInboxFilter, "all">;
}) {
  const metric = dashboardMetrics.find((item) => item.id === filter);
  const tone = toneClassNames[metric?.tone ?? "green"];

  return (
    <Badge
      variant={tone.badge}
      size="M"
      className={dashboardBadgeClassName}
      style={tone.badgeStyle}
    >
      {children}
    </Badge>
  );
}

function getFilterTriggerLabel(activeFilter: DashboardInboxFilter) {
  if (activeFilter !== "all") {
    return getOption(activeFilter).triggerLabel;
  }

  return getOption("all").triggerLabel;
}

function getOption(filter: DashboardInboxFilter) {
  return (
    dashboardFilterOptions.find((option) => option.id === filter) ??
    dashboardFilterOptions[0]
  );
}
