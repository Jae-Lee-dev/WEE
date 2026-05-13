import {
  recordMainFixtureViewModel,
  type RecordDetailStateId,
  type RecordMainViewModel,
  type RecordTimelineBlock,
  type RecordTimelineFixture,
  type RecordsFilterOption,
} from "./records-fixtures";

export type PositionedRecordBlock = {
  block: RecordTimelineBlock;
  lane: number;
  startColumn: number;
  spanColumns: number;
  endColumn: number;
};

export type RecordFilterState = {
  statusFilterId: string;
  typeFilterId: string;
  workerFilterId: string;
};

export type RecordBlockStyle = {
  height: number;
  left: string;
  top: number;
  width: string;
};

export const emptyRecordFilterOptions: readonly RecordsFilterOption[] = [];

const timelineStartHour = Number(
  recordMainFixtureViewModel.timeline.hourLabels[0],
);
const timelineColumnCount = recordMainFixtureViewModel.timeline.hourLabels.length;
const timelineLaneHeight = 54;
const timelineLaneStride = 56;
const weekDayLabels = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function createEmptyRecordMainViewModel(
  emptyText: readonly string[],
): RecordMainViewModel {
  return {
    ...recordMainFixtureViewModel,
    blocks: [],
    detailStates: {
      ...recordMainFixtureViewModel.detailStates,
      empty: {
        id: "empty",
        emptyText,
      },
    },
    detailStatesByBlockId: {},
    initialBlockId: null,
    initialWeekStartKey: null,
    initialDetailStateId: "empty",
    timeline: {
      ...recordMainFixtureViewModel.timeline,
      emptyDetailText: emptyText,
    },
  };
}

export function createVisibleTimeline(
  timeline: RecordTimelineFixture,
  activeWeekStartKey: string | null,
): RecordTimelineFixture {
  if (!activeWeekStartKey || !timeline.weekNavigation) {
    return timeline;
  }

  return {
    ...timeline,
    weekLabel: formatWeekLabelFromStartKey(activeWeekStartKey),
  };
}

export function getNavigatedWeekStartKey(
  activeWeekStartKey: string | null,
  navigation: RecordTimelineFixture["weekNavigation"],
  direction: -1 | 1,
) {
  if (!activeWeekStartKey || !navigation) {
    return null;
  }

  const nextWeekStartKey = addWeeksToDateKey(activeWeekStartKey, direction);

  if (!nextWeekStartKey) {
    return null;
  }

  if (
    nextWeekStartKey < navigation.minWeekStartKey ||
    nextWeekStartKey > navigation.maxWeekStartKey
  ) {
    return null;
  }

  return nextWeekStartKey;
}

export function resolveInitialRecordSelection(
  viewModel: RecordMainViewModel,
  focusId: string | undefined,
  workerFilterId = "all",
) {
  const focusedBlock = focusId
    ? selectBlockByFocusId(viewModel.blocks, focusId)
    : null;
  const workerScopedBlock =
    workerFilterId === "all"
      ? null
      : selectDefaultBlockFromBlocks(
          viewModel.blocks.filter((block) =>
            matchesWorkerFilter(
              block,
              workerFilterId,
              viewModel.timeline.filters.location ?? emptyRecordFilterOptions,
            ),
          ),
        );
  const initialBlock =
    focusedBlock ??
    workerScopedBlock ??
    (workerFilterId === "all" && viewModel.initialBlockId
      ? viewModel.blocks.find((block) => block.id === viewModel.initialBlockId) ??
        null
      : null);
  const weekStartKey = initialBlock?.dateKey
    ? getWeekStartKeyFromDateKey(initialBlock.dateKey)
    : viewModel.initialWeekStartKey ??
      viewModel.timeline.weekNavigation?.initialWeekStartKey ??
      null;

  return {
    block: initialBlock,
    stateId: initialBlock
      ? resolveBlockStateId(initialBlock)
      : viewModel.initialDetailStateId,
    weekStartKey,
  };
}

export function selectDefaultBlockFromBlocks(
  blocks: readonly RecordTimelineBlock[],
) {
  return (
    blocks.find((block) => block.selectedStateId === "anomaly-step-1") ??
    blocks.find((block) => block.selectedStateId) ??
    blocks[0] ??
    null
  );
}

export function resolveBlockStateId(
  block: RecordTimelineBlock | null | undefined,
): RecordDetailStateId {
  return block ? block.selectedStateId ?? "normal-selected" : "empty";
}

export function getFilteredBlocks(
  blocks: readonly RecordTimelineBlock[],
  filters: RecordFilterState,
  workerOptions: readonly RecordsFilterOption[],
) {
  return blocks.filter((block) =>
    matchesRecordFilters(block, filters, workerOptions),
  );
}

export function matchesRecordFilters(
  block: RecordTimelineBlock,
  filters: RecordFilterState,
  workerOptions: readonly RecordsFilterOption[],
) {
  return (
    matchesWorkerFilter(block, filters.workerFilterId, workerOptions) &&
    matchesBlockKindFilter(block, filters.statusFilterId) &&
    matchesBlockKindFilter(block, filters.typeFilterId)
  );
}

export function createWorkerFilterIdFromName(name: string | undefined) {
  const filterId = name ? createStableFilterId(name) : "";

  return filterId || "all";
}

export function createWorkerFilterOptionsWithInitialName(
  options: readonly RecordsFilterOption[],
  initialWorkerName: string | undefined,
) {
  const label = initialWorkerName?.trim();
  const filterId = createWorkerFilterIdFromName(label);

  if (
    !label ||
    filterId === "all" ||
    options.some((option) => option.id === filterId || option.label === label)
  ) {
    return options;
  }

  return [
    ...options,
    { id: filterId, label },
  ] satisfies readonly RecordsFilterOption[];
}

export function isBlockInWeek(
  block: RecordTimelineBlock,
  weekStartKey: string,
) {
  const blockDate = block.dateKey ? parseDateKey(block.dateKey) : null;
  const weekStart = parseDateKey(weekStartKey);

  if (!blockDate || !weekStart) {
    return false;
  }

  const nextWeekStart = addDays(weekStart, 7);

  return blockDate >= weekStart && blockDate < nextWeekStart;
}

export function getWeekStartKeyFromDateKey(dateKey: string) {
  const date = parseDateKey(dateKey);

  return date ? formatDateKey(startOfWeekSunday(date)) : null;
}

export function layoutBlocks(
  blocks: readonly RecordTimelineBlock[],
): PositionedRecordBlock[] {
  const laneEnds: number[] = [];

  return [...blocks]
    .sort((firstBlock, secondBlock) => {
      const firstRange = getBlockColumnRange(firstBlock);
      const secondRange = getBlockColumnRange(secondBlock);

      return (
        firstRange.startColumn - secondRange.startColumn ||
        firstRange.endColumn - secondRange.endColumn
      );
    })
    .map((block) => {
      const range = getBlockColumnRange(block);
      let lane = laneEnds.findIndex(
        (endColumn) => range.startColumn >= endColumn,
      );

      if (lane === -1) {
        lane = laneEnds.length;
      }

      laneEnds[lane] = range.endColumn;

      return {
        block,
        lane,
        ...range,
      };
    });
}

export function getBlockStyle(
  positionedBlock: PositionedRecordBlock,
): RecordBlockStyle {
  return {
    height: timelineLaneHeight,
    left: `calc(${(positionedBlock.startColumn / timelineColumnCount) * 100}% + 1px)`,
    top: 1 + positionedBlock.lane * timelineLaneStride,
    width: `calc(${(positionedBlock.spanColumns / timelineColumnCount) * 100}% - 2px)`,
  };
}

function selectBlockByFocusId(
  blocks: readonly RecordTimelineBlock[],
  focusId: string,
) {
  const normalizedFocusId = focusId.trim();

  if (!normalizedFocusId) {
    return null;
  }

  return (
    blocks.find(
      (block) =>
        block.id === normalizedFocusId ||
        (block.focusIds ?? []).includes(normalizedFocusId),
    ) ?? null
  );
}

function matchesWorkerFilter(
  block: RecordTimelineBlock,
  workerFilterId: string,
  workerOptions: readonly RecordsFilterOption[],
) {
  if (workerFilterId === "all") {
    return true;
  }

  const option = workerOptions.find((candidate) => candidate.id === workerFilterId);

  return (
    option?.label === block.workerName ||
    workerFilterId === createStableFilterId(block.workerName)
  );
}

function matchesBlockKindFilter(block: RecordTimelineBlock, filterId: string) {
  if (filterId === "all") {
    return true;
  }

  return getBlockFilterKind(block) === filterId;
}

function getBlockFilterKind(block: RecordTimelineBlock) {
  return block.kind === "location-anomaly" ? "anomaly" : block.kind;
}

function createStableFilterId(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("ko-KR")
    .replace(/[^0-9a-z가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function addWeeksToDateKey(dateKey: string, weekOffset: number) {
  const date = parseDateKey(dateKey);

  if (!date) {
    return null;
  }

  return formatDateKey(addDays(date, weekOffset * 7));
}

function formatWeekLabelFromStartKey(weekStartKey: string) {
  const sunday = parseDateKey(weekStartKey);

  if (!sunday) {
    return weekStartKey || "-";
  }

  const saturday = addDays(sunday, 6);

  return `${formatMonthDay(sunday)} (${weekDayLabels[sunday.getDay()]}) ~ ${formatMonthDay(
    saturday,
  )} (${weekDayLabels[saturday.getDay()]})`;
}

function parseDateKey(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);

  if (!match) {
    return null;
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate(),
  )}`;
}

function formatMonthDay(date: Date) {
  return `${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;
}

function startOfWeekSunday(date: Date) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  next.setDate(next.getDate() - next.getDay());

  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  next.setDate(next.getDate() + days);

  return next;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function getBlockColumnRange(block: RecordTimelineBlock) {
  const startHour = normalizeHour(block.startHour);
  const endHour = normalizeHour(block.endHour);
  const startColumn = clamp(
    startHour - timelineStartHour,
    0,
    timelineColumnCount - 1,
  );
  const endColumn = clamp(
    Math.max(endHour - timelineStartHour, startColumn + 1),
    startColumn + 1,
    timelineColumnCount,
  );

  return {
    startColumn,
    endColumn,
    spanColumns: Math.max(1, endColumn - startColumn),
  };
}

function normalizeHour(hour: number) {
  return hour === 0 ? 24 : hour;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
