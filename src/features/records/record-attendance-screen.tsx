"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  createRecordsDataSource,
  shouldUseRecordsFixtureDataSource,
  type RecordsDataSource,
} from "./records-data-source";
import {
  attendanceLogFixtureViewModel,
  type AttendanceLogRow,
  type AttendanceLogStatus,
  type AttendanceLogViewModel,
  type RecordsFilterOption,
} from "./records-fixtures";

const statusBadgeConfig: Record<
  AttendanceLogStatus,
  {
    variant: "green" | "red";
    className: string;
  }
> = {
  정상: {
    variant: "green",
    className: "bg-green-100 text-green-400",
  },
  이상: {
    variant: "red",
    className: "bg-red-50 text-red-500",
  },
};

export function RecordAttendanceScreen({
  dataSource: dataSourceProp,
}: {
  dataSource?: RecordsDataSource;
} = {}) {
  const fixtureMode = shouldUseRecordsFixtureDataSource();
  const fallbackDataSource = useMemo(() => createRecordsDataSource(), []);
  const dataSource = dataSourceProp ?? fallbackDataSource;
  const [viewModel, setViewModel] = useState<AttendanceLogViewModel>(
    fixtureMode ? attendanceLogFixtureViewModel : createEmptyAttendanceLogs(),
  );
  const [loading, setLoading] = useState(!fixtureMode);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    void dataSource
      .getAttendanceLogs()
      .then((nextViewModel) => {
        if (!active) {
          return;
        }

        setViewModel(nextViewModel);
        setLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setViewModel(createEmptyAttendanceLogs());
        setErrorMessage("출퇴근 이력을 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource]);

  return (
    <section
      aria-label="출퇴근 이력"
      className="mx-auto flex w-full max-w-[1480px] flex-col tracking-normal"
      data-testid="record-attendance-screen"
    >
      <AttendanceFilters filters={viewModel.filters} />
      {loading || errorMessage ? (
        <div
          className={cn(
            "mt-3 flex min-h-9 items-center rounded-[8px] border px-4 py-2.5 text-body-14-medium tracking-normal",
            errorMessage
              ? "border-red-100 bg-red-50 text-red-500"
              : "border-green-100 bg-green-50 text-green-500",
          )}
          role={errorMessage ? "alert" : "status"}
        >
          {errorMessage || "출퇴근 이력을 불러오는 중입니다."}
        </div>
      ) : null}
      <AttendanceTable
        columns={viewModel.columns}
        loading={loading}
        rows={viewModel.rows}
      />
    </section>
  );
}

function AttendanceFilters({
  filters,
}: {
  filters: readonly RecordsFilterOption[];
}) {
  return (
    <div
      aria-label="출퇴근 이력 필터"
      className="flex h-10 items-center gap-3"
      role="group"
    >
      {filters.map((filter) => (
        <AttendanceFilterButton filter={filter} key={filter.id} />
      ))}
    </div>
  );
}

function AttendanceFilterButton({
  filter,
}: {
  filter: RecordsFilterOption;
}) {
  const selected = "selected" in filter && filter.selected;

  return (
    <button
      type="button"
      aria-pressed={selected ? "true" : "false"}
      className={cn(
        "flex h-10 shrink-0 items-center justify-center rounded-full border px-4 text-h-18-regular transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200",
        selected
          ? "border-green-400 bg-green-400 text-white"
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
      )}
      data-testid={`record-attendance-filter-${filter.id}`}
    >
      {filter.label}
    </button>
  );
}

function AttendanceTable({
  columns,
  loading,
  rows,
}: {
  columns: AttendanceLogViewModel["columns"];
  loading: boolean;
  rows: readonly AttendanceLogRow[];
}) {
  return (
    <div
      aria-label="출퇴근 이력 표"
      className="mt-[29px] min-h-[calc(100vh-252px)] overflow-hidden rounded-[8px] bg-white px-4"
      data-testid="record-attendance-table"
      role="table"
    >
      <div
        className="grid h-[48px] grid-cols-6 items-end border-b border-gray-200 px-[18px] pb-3 text-h-18-regular text-gray-500"
        role="row"
      >
        {columns.map((column) => (
          <div key={column.id} role="columnheader">
            {column.label}
          </div>
        ))}
      </div>

      <div role="rowgroup">
        {rows.length > 0 ? (
          rows.map((row) => <AttendanceTableRow key={row.id} row={row} />)
        ) : (
          <div className="flex h-40 items-center justify-center text-h-18-regular tracking-normal text-gray-400">
            {loading ? "출퇴근 이력을 불러오는 중입니다." : "표시할 출퇴근 이력이 없습니다."}
          </div>
        )}
      </div>
    </div>
  );
}

function AttendanceTableRow({ row }: { row: AttendanceLogRow }) {
  return (
    <div
      className="grid h-[42px] grid-cols-6 items-center border-b border-gray-100 px-[18px] text-h-18-regular text-gray-900 last:border-b-0"
      data-testid={`record-attendance-row-${row.id}`}
      role="row"
    >
      <div role="cell">{row.date}</div>
      <div role="cell">{row.workerName}</div>
      <div role="cell">{row.locationName}</div>
      <div role="cell">{row.checkIn}</div>
      <div role="cell">{row.checkOut}</div>
      <div role="cell">
        <AttendanceStatusBadge status={row.locationStatus} />
      </div>
    </div>
  );
}

function createEmptyAttendanceLogs(): AttendanceLogViewModel {
  return {
    ...attendanceLogFixtureViewModel,
    filters: [
      { id: "all", label: "전체 로그 (0)", selected: true },
      { id: "anomaly", label: "이상 표시 (0)" },
    ],
    rows: [],
  };
}

function AttendanceStatusBadge({ status }: { status: AttendanceLogStatus }) {
  const config = statusBadgeConfig[status];

  return (
    <Badge
      className={config.className}
      data-testid={`record-attendance-status-${status}`}
      size="M"
      variant={config.variant}
    >
      {status}
    </Badge>
  );
}
