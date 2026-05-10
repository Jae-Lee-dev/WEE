"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
  dashboardMetrics,
  type DashboardInboxFilter,
  type DashboardInboxRow,
  type DashboardMetric,
  type DashboardTone,
} from "./dashboard-fixtures";

const dashboardBadgeClassName =
  "[font-size:16px] font-semibold leading-[1.4] tracking-[-0.02em]";

const toneClassNames: Record<
  DashboardTone,
  {
    text: string;
    textStyle: { color: string };
    badgeStyle: { color: string };
    badge: "green" | "blue" | "orange" | "red";
    selectedBorder: string;
    selectedBackground: string;
  }
> = {
  green: {
    text: "text-green-400",
    textStyle: { color: "var(--color-green-400)" },
    badgeStyle: { color: "var(--color-green-400)" },
    badge: "green",
    selectedBorder: "border-green-400",
    selectedBackground: "bg-green-100",
  },
  blue: {
    text: "text-blue-500",
    textStyle: { color: "var(--color-blue-500)" },
    badgeStyle: { color: "var(--color-blue-500)" },
    badge: "blue",
    selectedBorder: "border-blue-500",
    selectedBackground: "bg-blue-50",
  },
  orange: {
    text: "text-orange-400",
    textStyle: { color: "var(--color-orange-400)" },
    badgeStyle: { color: "var(--color-orange-400)" },
    badge: "orange",
    selectedBorder: "border-orange-400",
    selectedBackground: "bg-orange-100",
  },
  red: {
    text: "text-red-500",
    textStyle: { color: "var(--color-red-500)" },
    badgeStyle: { color: "var(--color-red-500)" },
    badge: "red",
    selectedBorder: "border-red-500",
    selectedBackground: "bg-red-50",
  },
};

export function DashboardScreen() {
  const [activeFilter, setActiveFilter] =
    useState<DashboardInboxFilter>("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const rows = dashboardInboxRows[activeFilter];
  const selectedMetric =
    activeFilter === "all"
      ? undefined
      : dashboardMetrics.find((metric) => metric.id === activeFilter);
  const triggerLabel = getFilterTriggerLabel(activeFilter, dropdownOpen);
  const countLabel =
    activeFilter === "all" || activeFilter === "payroll" ? "24건" : "4건";

  const dropdownLabelId = "dashboard-inbox-filter-label";

  return (
    <section
      aria-label="운영 인박스"
      className="flex w-full flex-col gap-5"
      data-dashboard-state={activeFilter}
    >
      <div className="grid grid-cols-6 gap-4" aria-label="확인 필요 요약">
        {dashboardMetrics.map((metric) => (
          <MetricCard
            key={metric.id}
            metric={metric}
            selected={activeFilter === metric.id}
            onSelect={() => {
              setActiveFilter(metric.id);
              setDropdownOpen(false);
            }}
          />
        ))}
      </div>

      <div className="relative flex min-h-[45px] items-center justify-between gap-4">
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

        <SearchBox className={dropdownOpen ? "mx-auto" : "ml-auto"} />

        {dropdownOpen && selectedMetric ? (
          <FilterTrigger
            ariaLabelledBy={dropdownLabelId}
            dropdownOpen
            label={selectedMetric.inboxType}
            onClick={() => setDropdownOpen(false)}
            testId="dashboard-filter-close-trigger"
          />
        ) : null}
      </div>

      <InboxTable countLabel={countLabel} rows={rows} />
    </section>
  );
}

function MetricCard({
  metric,
  selected,
  onSelect,
}: {
  metric: DashboardMetric;
  selected: boolean;
  onSelect: () => void;
}) {
  const tone = toneClassNames[metric.tone];

  return (
    <button
      type="button"
      aria-pressed={selected}
      data-testid={`dashboard-filter-${metric.id}`}
      onClick={onSelect}
      className={cn(
        "flex h-[111px] min-w-0 flex-col justify-center gap-1 rounded-[8px] border border-gray-200 bg-white px-5 py-4 text-left transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200",
        selected && tone.selectedBorder,
        selected && tone.selectedBackground,
      )}
    >
      <span className="w-full truncate text-label-18 text-gray-800">
        {metric.title}
      </span>
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex shrink-0 items-baseline gap-1">
          <span
            className={cn(
              "text-[36px] font-semibold leading-[45px] tracking-tight",
              tone.text,
            )}
          >
            {metric.value}
          </span>
          <span className="text-h-20" style={tone.textStyle}>
            {metric.unit}
          </span>
        </span>
        <Badge
          variant={tone.badge}
          size="M"
          className={cn("min-w-0 truncate", dashboardBadgeClassName)}
          style={tone.badgeStyle}
        >
          {metric.badge}
        </Badge>
      </span>
    </button>
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
            onClick={() => onSelect(option.id)}
            className={cn(
              "flex h-[49px] w-full items-center justify-between gap-2 border-gray-100 px-3 text-left text-h-18-regular text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200",
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

function SearchBox({ className }: { className?: string }) {
  return (
    <label
      className={cn(
        "flex h-[43px] w-[416px] shrink-0 items-center justify-between rounded-[6px] bg-white px-4",
        className,
      )}
    >
      <span className="sr-only">운영 인박스 검색</span>
      <input
        readOnly
        type="search"
        value=""
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
    <div className="min-h-[680px] overflow-hidden rounded-[8px] bg-white">
      <div className="flex h-[70px] items-center gap-3 px-5">
        <h2 className="text-h-20 text-gray-900">확인 필요</h2>
        <Badge variant="grey" size="M">
          {countLabel}
        </Badge>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[1540px]">
          <div className="grid h-[41px] grid-cols-[260px_200px_260px_380px_200px_240px] items-center border-b border-gray-300 px-5 text-h-18-regular text-gray-500">
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
              className="grid h-[46px] grid-cols-[260px_200px_260px_380px_200px_240px] items-center border-b border-gray-100 px-5 text-h-18-regular text-gray-900"
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

function getFilterTriggerLabel(
  activeFilter: DashboardInboxFilter,
  dropdownOpen: boolean,
) {
  if (dropdownOpen && activeFilter !== "all") {
    return getOption(activeFilter).triggerLabel;
  }

  if (activeFilter === "affiliation" || activeFilter === "schedule") {
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
