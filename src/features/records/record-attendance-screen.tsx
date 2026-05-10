import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  attendanceLogColumns,
  attendanceLogFilters,
  attendanceLogRows,
  type AttendanceLogRow,
  type AttendanceLogStatus,
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

export function RecordAttendanceScreen() {
  return (
    <section
      aria-label="출퇴근 이력"
      className="mx-auto flex w-full max-w-[1580px] flex-col tracking-normal"
      data-testid="record-attendance-screen"
    >
      <AttendanceFilters />
      <AttendanceTable />
    </section>
  );
}

function AttendanceFilters() {
  return (
    <div
      aria-label="출퇴근 이력 필터"
      className="flex h-10 items-center gap-3"
      role="group"
    >
      {attendanceLogFilters.map((filter) => (
        <AttendanceFilterButton filter={filter} key={filter.id} />
      ))}
    </div>
  );
}

function AttendanceFilterButton({
  filter,
}: {
  filter: (typeof attendanceLogFilters)[number];
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

function AttendanceTable() {
  return (
    <div
      aria-label="출퇴근 이력 표"
      className="mt-[29px] min-h-[calc(100vh-252px)] overflow-hidden rounded-[8px] bg-white px-5"
      data-testid="record-attendance-table"
      role="table"
    >
      <div
        className="grid h-[64px] grid-cols-6 items-end border-b border-gray-200 px-[18px] pb-3 text-h-18-regular text-gray-500"
        role="row"
      >
        {attendanceLogColumns.map((column) => (
          <div key={column.id} role="columnheader">
            {column.label}
          </div>
        ))}
      </div>

      <div role="rowgroup">
        {attendanceLogRows.map((row) => (
          <AttendanceTableRow key={row.id} row={row} />
        ))}
      </div>
    </div>
  );
}

function AttendanceTableRow({ row }: { row: AttendanceLogRow }) {
  return (
    <div
      className="grid h-[46px] grid-cols-6 items-center border-b border-gray-100 px-[18px] text-h-18-regular text-gray-900 last:border-b-0"
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
