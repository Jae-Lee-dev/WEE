import { type CSSProperties, type ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { type ScheduleTimelineDay } from "../model/schedule-fixtures";

type TimelineGridFrameProps = {
  ariaLabel: string;
  className?: string;
  dayColumnWidth?: number;
  days: readonly ScheduleTimelineDay[];
  headerHeight?: number;
  minWidthClassName?: string;
  renderBlocks: (day: ScheduleTimelineDay) => ReactNode;
  rowHeight?: number;
  testId?: string;
  timeSlots: readonly string[];
};

const sundayFirstDayOrder: readonly ScheduleTimelineDay["id"][] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];
const emphasizedTimelineBoundaryColor = "var(--color-gray-300)";
const nextDayBoundaryMarkerStyle = {
  backgroundImage:
    "linear-gradient(to right, var(--color-gray-100) 0, var(--color-gray-100) 1px, transparent 1px, transparent 2px, var(--color-gray-100) 2px, var(--color-gray-100) 3px)",
} satisfies CSSProperties;

export function orderTimelineDaysSundayFirst(
  days: readonly ScheduleTimelineDay[],
) {
  return sundayFirstDayOrder.map((dayId) => {
    const day = days.find((item) => item.id === dayId);

    if (!day) {
      throw new Error(`Missing schedule timeline day: ${dayId}`);
    }

    return day;
  });
}

export function TimelineGridFrame({
  ariaLabel,
  className,
  dayColumnWidth = 46,
  days,
  headerHeight = 45,
  minWidthClassName = "min-w-[1072px]",
  renderBlocks,
  rowHeight = 110,
  testId,
  timeSlots,
}: TimelineGridFrameProps) {
  const nextDayBoundaryIndex = getNextDayBoundaryIndex(timeSlots);

  return (
    <div
      className={cn(
        "min-h-0 min-w-0 overflow-auto overscroll-contain rounded-[8px] border border-gray-200 bg-white",
        className,
      )}
      data-testid={testId}
    >
      <div aria-label={ariaLabel} className={minWidthClassName} role="grid">
        <div
          className="grid"
          style={{ gridTemplateColumns: `${dayColumnWidth}px minmax(0, 1fr)` }}
        >
          <div
            aria-hidden="true"
            className="sticky left-0 top-0 z-40 border-r border-b border-gray-200 bg-white"
            style={{
              borderBottomColor: emphasizedTimelineBoundaryColor,
              borderRightColor: emphasizedTimelineBoundaryColor,
              height: headerHeight,
            }}
          />
          <div
            className="sticky top-0 z-30 grid border-b border-gray-200 bg-white"
            style={{
              borderBottomColor: emphasizedTimelineBoundaryColor,
              gridTemplateColumns: `repeat(${timeSlots.length}, minmax(0, 1fr))`,
              height: headerHeight,
            }}
          >
            {timeSlots.map((slot, index) => (
              <div
                className={cn(
                  "flex min-w-0 items-center justify-center border-r border-gray-100 px-1 text-h-14-regular tracking-normal text-gray-500",
                  index === nextDayBoundaryIndex && "relative",
                  index === timeSlots.length - 1 && "border-r-0",
                )}
                key={slot}
                role="columnheader"
              >
                <span className="truncate">{slot}</span>
                {index === nextDayBoundaryIndex && (
                  <TimelineNextDayBoundaryMarker />
                )}
              </div>
            ))}
          </div>

          {days.map((day, dayIndex) => {
            const isLastDay = dayIndex === days.length - 1;

            return (
              <div className="contents" key={day.id}>
                <div
                  className={cn(
                    "sticky left-0 z-20 flex items-center justify-center border-r border-gray-200 bg-gray-50 px-1 text-label-18 tracking-normal",
                    getTimelineDayTextClassName(day.id),
                    !isLastDay && "border-b border-gray-100",
                  )}
                  role="rowheader"
                  style={{
                    borderRightColor: emphasizedTimelineBoundaryColor,
                    height: rowHeight,
                  }}
                >
                  {day.label}
                </div>
                <div
                  className={cn(
                    "relative min-w-0 bg-white",
                    !isLastDay && "border-b border-gray-100",
                  )}
                  role="row"
                  style={{ height: rowHeight }}
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 grid"
                    style={{
                      gridTemplateColumns: `repeat(${timeSlots.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {timeSlots.map((slot, index) => (
                      <div
                        className={cn(
                          "border-r border-gray-100",
                          index === nextDayBoundaryIndex && "relative",
                          index === timeSlots.length - 1 && "border-r-0",
                        )}
                        key={`${day.id}-${slot}`}
                      >
                        {index === nextDayBoundaryIndex && (
                          <TimelineNextDayBoundaryMarker />
                        )}
                      </div>
                    ))}
                  </div>

                  {renderBlocks(day)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TimelineNextDayBoundaryMarker() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-0 right-[-1px] h-full w-[3px]"
      data-testid="timeline-next-day-boundary"
      style={nextDayBoundaryMarkerStyle}
    />
  );
}

function getNextDayBoundaryIndex(timeSlots: readonly string[]) {
  const boundaryIndex = timeSlots.findIndex((slot, index) => {
    if (index === 0) {
      return false;
    }

    const previousHour = Number(timeSlots[index - 1]);
    const currentHour = Number(slot);

    return (
      Number.isFinite(previousHour) &&
      Number.isFinite(currentHour) &&
      currentHour < previousHour
    );
  });

  return boundaryIndex === -1 ? -1 : boundaryIndex - 1;
}

type TimelineBlockTextProps = {
  selected?: boolean;
  subtitle: ReactNode;
  title: ReactNode;
};

export function TimelineBlockText({
  selected = false,
  subtitle,
  title,
}: TimelineBlockTextProps) {
  return (
    <>
      <span className="truncate text-label-12-medium tracking-normal">
        {title}
      </span>
      <span
        className={cn(
          "truncate text-label-12-regular tracking-normal",
          selected ? "text-white/90" : "text-gray-800",
        )}
      >
        {subtitle}
      </span>
    </>
  );
}

function getTimelineDayTextClassName(dayId: ScheduleTimelineDay["id"]) {
  switch (dayId) {
    case "sun":
      return "text-red-500";
    case "sat":
      return "text-blue-500";
    default:
      return "text-gray-700";
  }
}
