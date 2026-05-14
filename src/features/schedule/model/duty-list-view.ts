import {
  dutyLocationOptions,
  dutyStatusFilterOptions,
  dutyTagFilterOptions,
  type DutyFilterOption,
  type DutyListRow,
  type DutyWeekday,
} from "./duty-fixtures";
import { type DutyFormField } from "./duty-model";
import {
  scheduleTimelineTimeSlots,
  type ScheduleTimelineDayId,
} from "./schedule-fixtures";

export type DutyFilterKey = "location" | "tag" | "status";
export type DutyFilterState = Record<DutyFilterKey, string>;

export type DutyTimelineBlock = {
  duty: DutyListRow;
  dayId: ScheduleTimelineDayId;
  startHour: number;
  endHour: number;
};

export type PositionedDutyTimelineBlock = DutyTimelineBlock & {
  lane: number;
  startColumn: number;
  spanColumns: number;
  endColumn: number;
};

export type DutyTimelineBlockStyle = {
  height: number;
  left: string;
  top: number;
  width: string;
};

export const initialDutyFilters = {
  location: "all",
  status: "all",
  tag: "all",
} as const satisfies DutyFilterState;

const timelineStartHour = Number(scheduleTimelineTimeSlots[0]);
const timelineColumnCount = scheduleTimelineTimeSlots.length;
const timelineLaneHeight = 46;
const timelineLaneGap = 2;
const timelineLaneStride = timelineLaneHeight + timelineLaneGap;

const weekdayDayIdMap: Record<DutyWeekday, ScheduleTimelineDayId> = {
  월: "mon",
  화: "tue",
  수: "wed",
  목: "thu",
  금: "fri",
  토: "sat",
  일: "sun",
};

const operationEndDateResetFields: readonly DutyFormField[] = [
  "weekday",
  "startTime",
  "endTime",
  "operationStartDate",
];

export function shouldResetOperationEndDate(field: DutyFormField) {
  return operationEndDateResetFields.includes(field);
}

export function createDutyFilterOptions(rows: readonly DutyListRow[]) {
  return {
    location: [
      dutyLocationOptions[0],
      ...uniqueDutyFilterOptions(rows.map((row) => row.location)),
    ],
    status: [
      dutyStatusFilterOptions[0],
      ...uniqueDutyFilterOptions(rows.map((row) => row.status)),
    ],
    tag: [
      dutyTagFilterOptions[0],
      ...uniqueDutyFilterOptions(
        rows.flatMap((row) => row.tags.map((tag) => tag.label)),
      ),
    ],
  } satisfies Record<DutyFilterKey, readonly DutyFilterOption[]>;
}

export function filterDuties(
  duties: readonly DutyListRow[],
  options: Record<DutyFilterKey, readonly DutyFilterOption[]>,
  selectedFilters: DutyFilterState,
) {
  return duties.filter(
    (duty) =>
      matchesDutyFilterOption(
        options.location,
        selectedFilters.location,
        (option) => duty.location === option.label || duty.location === option.id,
      ) &&
      matchesDutyFilterOption(
        options.tag,
        selectedFilters.tag,
        (option) =>
          duty.tags.some(
            (tag) => tag.label === option.label || tag.id === option.id,
          ),
      ) &&
      matchesDutyFilterOption(
        options.status,
        selectedFilters.status,
        (option) => duty.status === option.label || duty.status === option.id,
      ),
  );
}

export function getDutyFilterLabel(
  options: readonly DutyFilterOption[],
  selectedValue: string,
  fallback: string,
) {
  return options.find((option) => option.id === selectedValue)?.label ?? fallback;
}

export function getTimelineEligibleDuties(rows: readonly DutyListRow[]) {
  return rows.filter(
    (row) => row.status !== "만료" && row.status !== "비활성",
  );
}

export function buildDutyTimelineBlocks(
  rows: readonly DutyListRow[],
): DutyTimelineBlock[] {
  return rows
    .map((duty) => {
      const timeRow = duty.timeRows[0];

      if (!timeRow) {
        return null;
      }

      return {
        duty,
        dayId: weekdayDayIdMap[timeRow.weekday],
        startHour: parseHour(timeRow.startTime),
        endHour: parseHour(timeRow.endTime),
      };
    })
    .filter((block): block is DutyTimelineBlock => block != null);
}

export function layoutDutyTimelineBlocks(
  blocks: readonly DutyTimelineBlock[],
): PositionedDutyTimelineBlock[] {
  const laneEnds: number[] = [];

  return [...blocks]
    .sort((firstBlock, secondBlock) => {
      const firstRange = getDutyTimelineColumnRange(firstBlock);
      const secondRange = getDutyTimelineColumnRange(secondBlock);

      return (
        firstRange.startColumn - secondRange.startColumn ||
        firstRange.endColumn - secondRange.endColumn
      );
    })
    .map((block) => {
      const range = getDutyTimelineColumnRange(block);
      let lane = laneEnds.findIndex(
        (endColumn) => range.startColumn >= endColumn,
      );

      if (lane === -1) {
        lane = laneEnds.length;
      }

      laneEnds[lane] = range.endColumn;

      return {
        ...block,
        lane,
        ...range,
      };
    });
}

export function getDutyTimelineBlockStyle({
  lane,
  spanColumns,
  startColumn,
}: PositionedDutyTimelineBlock): DutyTimelineBlockStyle {
  return {
    height: timelineLaneHeight,
    left: `calc(${(startColumn / timelineColumnCount) * 100}% + 1px)`,
    top: 1 + lane * timelineLaneStride,
    width: `calc(${(spanColumns / timelineColumnCount) * 100}% - 2px)`,
  };
}

function uniqueDutyFilterOptions(labels: readonly string[]): DutyFilterOption[] {
  return [...new Set(labels.filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "ko-KR"))
    .map((label) => ({
      id: label,
      label,
    }));
}

function matchesDutyFilterOption(
  options: readonly DutyFilterOption[],
  selectedValue: string,
  matches: (option: DutyFilterOption) => boolean,
) {
  if (selectedValue === "all") {
    return true;
  }

  const option = options.find((item) => item.id === selectedValue);

  return option ? matches(option) : true;
}

function getDutyTimelineColumnRange(block: DutyTimelineBlock) {
  const startHour = normalizeHour(block.startHour);
  const endHour = normalizeHour(block.endHour);
  const startColumn = clamp(
    startHour - timelineStartHour,
    0,
    timelineColumnCount - 1,
  );
  const endColumn = clamp(
    endHour - timelineStartHour,
    startColumn + 1,
    timelineColumnCount,
  );

  return {
    startColumn,
    endColumn,
    spanColumns: endColumn - startColumn,
  };
}

function parseHour(time: string) {
  return Number(time.split(":")[0]);
}

function normalizeHour(hour: number) {
  return hour < timelineStartHour ? hour + 24 : hour;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
