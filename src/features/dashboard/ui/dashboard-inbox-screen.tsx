"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { IconCheck, IconChevronDown, IconChevronUp } from "@/shared/ui/icons";
import { SearchField } from "@/shared/ui/search-field";
import { cn } from "@/shared/lib/utils";
import { createDashboardInboxDataSource } from "../api/dashboard-data-source";
import {
  dashboardFilterOptions,
  dashboardMetrics,
  type DashboardInboxFilter,
  type DashboardInboxRow,
  type DashboardTone,
} from "../model/dashboard-fixtures";

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

export function DashboardScreen() {
  const [activeFilter, setActiveFilter] =
    useState<DashboardInboxFilter>("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const dataSource = useMemo(() => createDashboardInboxDataSource(), []);
  const [rowsByFilter, setRowsByFilter] = useState(dataSource.initialRows);
  const [loading, setLoading] = useState(dataSource.mode !== "fixture");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    dataSource
      .listInboxRows()
      .then((nextRowsByFilter) => {
        if (active) {
          setRowsByFilter(nextRowsByFilter);
          setErrorMessage("");
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setErrorMessage("운영 인박스를 불러오지 못했습니다.");
          setRowsByFilter(dataSource.mode === "fixture" ? dataSource.initialRows : {
            all: [],
            affiliation: [],
            schedule: [],
            overtime: [],
            correction: [],
            anomaly: [],
            payroll: [],
          });
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [dataSource]);

  const rows = loading
    ? []
    : filterInboxRows(rowsByFilter[activeFilter], searchQuery);
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
          value={searchInput}
          onChange={setSearchInput}
          onDebouncedChange={setSearchQuery}
        />
      </div>

      <InboxTable
        countLabel={countLabel}
        errorMessage={errorMessage}
        loading={loading}
        rows={rows}
      />
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
  onDebouncedChange,
  value,
}: {
  className?: string;
  onChange: (value: string) => void;
  onDebouncedChange: (value: string) => void;
  value: string;
}) {
  return (
    <SearchField
      aria-label="운영 인박스 검색"
      className={cn(
        "h-[43px] w-[416px] shrink-0 border-0 px-4 py-0 [&_input]:text-gray-900 [&_svg]:text-green-400",
        className,
      )}
      debounceMs={300}
      onChange={(event) => onChange(event.target.value)}
      onDebouncedValueChange={onDebouncedChange}
      placeholder="검색어를 입력해 주세요"
      value={value}
    />
  );
}

function InboxTable({
  countLabel,
  errorMessage,
  loading,
  rows,
}: {
  countLabel: string;
  errorMessage: string;
  loading: boolean;
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
          {loading ? (
            <DashboardTableState label="운영 인박스를 불러오는 중입니다." />
          ) : errorMessage ? (
            <DashboardTableState label={errorMessage} role="alert" />
          ) : rows.length > 0 ? (
            rows.map((row) =>
              row.href ? (
                <Link
                  key={row.id}
                  href={row.href}
                  data-action-type={row.action.actionType}
                  data-target-id={row.action.targetId}
                  data-record-type={row.action.recordType}
                  className="grid h-[42px] grid-cols-[260px_200px_260px_380px_200px_240px] items-center border-b border-gray-100 px-4 text-left text-h-18-regular text-gray-900 transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200"
                >
                  <InboxRowCells row={row} />
                </Link>
              ) : (
                <button
                  key={row.id}
                  type="button"
                  data-action-type={row.action.actionType}
                  data-target-id={row.action.targetId}
                  data-record-type={row.action.recordType}
                  className="grid h-[42px] w-full grid-cols-[260px_200px_260px_380px_200px_240px] items-center border-b border-gray-100 px-4 text-left text-h-18-regular text-gray-900 transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200"
                >
                  <InboxRowCells row={row} />
                </button>
              ),
            )
          ) : (
            <DashboardTableState label="확인할 운영 항목이 없습니다." />
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardTableState({
  label,
  role = "status",
}: {
  label: string;
  role?: "alert" | "status";
}) {
  return (
    <div
      className="flex h-40 items-center justify-center px-4 text-center text-h-18-regular text-gray-500"
      role={role}
    >
      {label}
    </div>
  );
}

function InboxRowCells({ row }: { row: DashboardInboxRow }) {
  return (
    <>
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
    </>
  );
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
