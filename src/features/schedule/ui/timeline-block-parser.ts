import type { CSSProperties } from "react";
import type {
  ScheduleSelectedWorkerContext,
  ScheduleTimelineBlock,
  ScheduleTimelineDay,
} from "../model/schedule-fixtures";
import { getTimelineBlockHeight } from "./timeline-grid-frame";

export type ParsedTimelineBlock = {
  block: ScheduleTimelineBlock;
  endColumn: number;
  firstSelectable: boolean;
  lane: number;
  selected: boolean;
  spanColumns: number;
  startColumn: number;
  style: CSSProperties;
  workerContext: ScheduleSelectedWorkerContext | null;
};

export type ParsedTimelineDay = {
  blocks: readonly ParsedTimelineBlock[];
  day: ScheduleTimelineDay;
  laneCount: number;
};

export type ParsedTimelineBlocks = {
  dayLayouts: readonly ParsedTimelineDay[];
  firstSelectableBlockId?: string;
};

type ParseTimelineBlocksInput = {
  blocks: readonly ScheduleTimelineBlock[];
  days: readonly ScheduleTimelineDay[];
  layout?: TimelineBlockLayoutOptions;
  selectedBlockIds?: readonly string[];
  timeSlots: readonly string[];
  workerContexts?: readonly ScheduleSelectedWorkerContext[];
};

type TimelineBlockLayoutOptions = {
  blockHeight?: number;
  laneStride?: number;
  topOffset?: number;
  xInset?: number;
};

type TimelineColumnRange = {
  endColumn: number;
  spanColumns: number;
  startColumn: number;
};

type TimelinePositionedBlock = TimelineColumnRange & {
  block: ScheduleTimelineBlock;
  lane: number;
};

export function parseTimelineBlocks({
  blocks,
  days,
  layout,
  selectedBlockIds = [],
  timeSlots,
  workerContexts = [],
}: ParseTimelineBlocksInput): ParsedTimelineBlocks {
  const selectedBlockIdSet = new Set(selectedBlockIds);
  const columnMeta = getTimelineColumnMeta(timeSlots);
  const firstSelectableBlockId = blocks.find((block) =>
    findTimelineWorkerContext(block, workerContexts),
  )?.id;

  return {
    dayLayouts: days.map((day) => {
      const positionedBlocks = layoutTimelineBlocks(
        blocks.filter((block) => block.dayId === day.id),
        columnMeta,
      );
      const laneCount = getTimelineLaneCount(positionedBlocks);

      return {
        day,
        laneCount,
        blocks: positionedBlocks.map((positionedBlock) => {
          const workerContext = findTimelineWorkerContext(
            positionedBlock.block,
            workerContexts,
          );

          return {
            ...positionedBlock,
            firstSelectable: positionedBlock.block.id === firstSelectableBlockId,
            selected: selectedBlockIdSet.has(positionedBlock.block.id),
            style: getTimelineBlockStyle(
              positionedBlock,
              columnMeta,
              layout,
              laneCount,
            ),
            workerContext,
          } satisfies ParsedTimelineBlock;
        }),
      };
    }),
    firstSelectableBlockId,
  };
}

function layoutTimelineBlocks(
  blocks: readonly ScheduleTimelineBlock[],
  columnMeta: TimelineColumnMeta,
): TimelinePositionedBlock[] {
  const laneEnds: number[] = [];

  return [...blocks]
    .sort((firstBlock, secondBlock) => {
      const firstRange = getTimelineColumnRange(firstBlock, columnMeta);
      const secondRange = getTimelineColumnRange(secondBlock, columnMeta);

      return (
        firstRange.startColumn - secondRange.startColumn ||
        firstRange.endColumn - secondRange.endColumn
      );
    })
    .map((block) => {
      const range = getTimelineColumnRange(block, columnMeta);
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

function getTimelineColumnRange(
  block: ScheduleTimelineBlock,
  { columnCount, startHour }: TimelineColumnMeta,
): TimelineColumnRange {
  const startHourValue = normalizeHour(block.startHour, startHour);
  const endHourValue = normalizeHour(block.endHour, startHour);
  const startColumn = clamp(startHourValue - startHour, 0, columnCount - 1);
  const endColumn = clamp(endHourValue - startHour, startColumn + 1, columnCount);

  return {
    endColumn,
    spanColumns: endColumn - startColumn,
    startColumn,
  };
}

function getTimelineBlockStyle(
  { lane, spanColumns, startColumn }: TimelinePositionedBlock,
  { columnCount }: TimelineColumnMeta,
  layout: TimelineBlockLayoutOptions = {},
  laneCount: number,
): CSSProperties {
  const {
    blockHeight,
    laneStride = 0,
    topOffset = 0,
    xInset = 0,
  } = layout;
  const style: CSSProperties = {
    left: getTimelineInsetPosition(startColumn, columnCount, xInset),
    top: topOffset + lane * laneStride,
    width: getTimelineInsetSize(spanColumns, columnCount, xInset),
  };

  if (blockHeight !== undefined) {
    style.height = getTimelineBlockHeight({
      blockHeight,
      laneCount,
      topOffset,
    });
  }

  return style;
}

function getTimelineLaneCount(blocks: readonly TimelinePositionedBlock[]) {
  return blocks.reduce((count, block) => Math.max(count, block.lane + 1), 0);
}

function findTimelineWorkerContext(
  block: ScheduleTimelineBlock,
  workerContexts: readonly ScheduleSelectedWorkerContext[],
) {
  if (block.workerId) {
    return (
      workerContexts.find((context) => context.workerId === block.workerId) ??
      null
    );
  }

  return (
    workerContexts.find((context) => context.workerName === block.worker) ?? null
  );
}

type TimelineColumnMeta = {
  columnCount: number;
  startHour: number;
};

function getTimelineColumnMeta(timeSlots: readonly string[]): TimelineColumnMeta {
  return {
    columnCount: timeSlots.length,
    startHour: Number(timeSlots[0]),
  };
}

function getTimelineInsetPosition(
  startColumn: number,
  columnCount: number,
  inset: number,
) {
  const percent = (startColumn / columnCount) * 100;

  return inset === 0 ? `${percent}%` : `calc(${percent}% + ${inset}px)`;
}

function getTimelineInsetSize(
  spanColumns: number,
  columnCount: number,
  inset: number,
) {
  const percent = (spanColumns / columnCount) * 100;
  const totalInset = inset * 2;

  return totalInset === 0
    ? `${percent}%`
    : `calc(${percent}% - ${totalInset}px)`;
}

function normalizeHour(hour: number, startHour: number) {
  return hour < startHour ? hour + 24 : hour;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
