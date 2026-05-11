"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconCheck, IconChevronDown } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  scheduleSelectedWorkerContext,
  scheduleTimelineBlocks,
  scheduleTimelineDays,
  scheduleTimelineFilters,
  scheduleTimelineTimeSlots,
  type ScheduleSelectedWorkerAssignment,
  type ScheduleTimelineBlock,
  type ScheduleTimelineTone,
} from "./schedule-fixtures";
import {
  orderTimelineDaysSundayFirst,
  TimelineBlockText,
  TimelineGridFrame,
} from "./timeline-grid-frame";

type PositionedBlock = {
  block: ScheduleTimelineBlock;
  lane: number;
  startColumn: number;
  spanColumns: number;
  endColumn: number;
};

const timelineColumnCount = scheduleTimelineTimeSlots.length;
const timelineStartHour = Number(scheduleTimelineTimeSlots[0]);
const timelineLaneHeight = 54;
const timelineLaneStride = 55;
const timelineDays = orderTimelineDaysSundayFirst(scheduleTimelineDays);

const blockToneClassNames: Record<ScheduleTimelineTone, string> = {
  green: "border-green-400 bg-green-100 text-gray-800",
  orange: "border-orange-400 bg-orange-100 text-gray-800",
  pink: "border-red-500 bg-red-50 text-gray-800",
  blue: "border-blue-500 bg-blue-50 text-gray-800",
};

const assignmentTagTone: Record<
  ScheduleSelectedWorkerAssignment["tagLabel"],
  {
    variant: "orange" | "blue" | "grey";
    style?: CSSProperties;
  }
> = {
  질문: {
    variant: "orange",
    style: { color: "var(--color-orange-400)" },
  },
  논술: {
    variant: "blue",
    style: { color: "var(--color-blue-500)" },
  },
  행정: {
    variant: "grey",
  },
};

export function ScheduleTimelineScreen() {
  const [locationMenuOpen, setLocationMenuOpen] = useState(false);
  const [workerSelected, setWorkerSelected] = useState(false);
  const timelineBlocks = getTimelineBlocksForDisplay();
  const selectedBlockIds = workerSelected
    ? scheduleSelectedWorkerContext.selectedBlockIds
    : [];

  return (
    <section
      aria-label="근무 시간표"
      className="mx-auto flex h-[calc(100vh-144px)] w-full max-w-[1480px] flex-col overflow-hidden tracking-normal"
      data-schedule-timeline-state={
        workerSelected ? "worker-selected" : "default"
      }
    >
      <Toolbar
        locationMenuOpen={locationMenuOpen}
        onLocationToggle={() => setLocationMenuOpen((open) => !open)}
      />

      <div className="mt-4 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px] gap-4">
        <TimelineGrid
          blocks={timelineBlocks}
          selectedBlockIds={selectedBlockIds}
          onWorkerSelect={() => {
            setWorkerSelected(true);
            setLocationMenuOpen(false);
          }}
        />
        <WorkerDetailPanel selected={workerSelected} />
      </div>
    </section>
  );
}

function Toolbar({
  locationMenuOpen,
  onLocationToggle,
}: {
  locationMenuOpen: boolean;
  onLocationToggle: () => void;
}) {
  return (
    <div className="flex h-10 items-start gap-3">
      <div className="relative">
        <FilterButton
          ariaExpanded={locationMenuOpen}
          label={scheduleTimelineFilters.locationOptions[0].label}
          onClick={onLocationToggle}
          testId="schedule-timeline-location-filter"
          widthClassName="w-[138px]"
        />
        {locationMenuOpen ? <LocationFilterMenu /> : null}
      </div>

      <FilterButton
        label={scheduleTimelineFilters.dutyOptions[0].label}
        widthClassName="w-[124px]"
      />
      <FilterButton
        label={scheduleTimelineFilters.dutyTagOptions[0].label}
        widthClassName="w-[158px]"
      />
      <FilterButton
        label={scheduleTimelineFilters.workerOptions[0].label}
        widthClassName="w-[124px]"
      />
    </div>
  );
}

function FilterButton({
  ariaExpanded,
  label,
  onClick,
  testId,
  widthClassName,
}: {
  ariaExpanded?: boolean;
  label: string;
  onClick?: () => void;
  testId?: string;
  widthClassName: string;
}) {
  return (
    <Button
      type="button"
      aria-expanded={ariaExpanded}
      aria-haspopup="listbox"
      className={cn(
        "h-10 justify-between gap-2 rounded-[6px] px-2.5 font-normal tracking-normal",
        widthClassName,
      )}
      data-testid={testId}
      onClick={onClick}
      variant="secondary"
    >
      <span className="min-w-0 truncate">{label}</span>
      <IconChevronDown className="size-5 shrink-0 text-gray-700" />
    </Button>
  );
}

function LocationFilterMenu() {
  return (
    <div
      role="listbox"
      aria-label="근무지 필터"
      data-testid="schedule-timeline-location-menu"
      className="absolute left-0 top-12 z-30 w-[148px] overflow-hidden rounded-[4px] border border-gray-200 bg-white px-3 shadow-[0px_8px_20px_rgba(17,24,39,0.12)]"
    >
      {scheduleTimelineFilters.locationOptions.map((option, index) => {
        const selected = index === 0;

        return (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={selected}
            className="flex h-11 w-full items-center justify-between gap-2 border-b border-gray-100 text-left text-h-18-regular text-gray-800 last:border-b-0 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200"
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

function TimelineGrid({
  blocks,
  selectedBlockIds,
  onWorkerSelect,
}: {
  blocks: readonly ScheduleTimelineBlock[];
  selectedBlockIds: readonly string[];
  onWorkerSelect: () => void;
}) {
  const selectedBlockIdSet = new Set(selectedBlockIds);
  const dayLayouts = timelineDays.map((day) => ({
    day,
    positionedBlocks: layoutBlocks(
      blocks.filter((block) => block.dayId === day.id),
    ),
  }));

  return (
    <TimelineGridFrame
      ariaLabel="주간 근무 시간표"
      className="h-full"
      days={timelineDays}
      renderBlocks={(day) => {
        const positionedBlocks =
          dayLayouts.find((layout) => layout.day.id === day.id)
            ?.positionedBlocks ?? [];

        return positionedBlocks.map((positionedBlock) => (
          <TimelineBlock
            key={positionedBlock.block.id}
            onWorkerSelect={onWorkerSelect}
            positionedBlock={positionedBlock}
            selected={selectedBlockIdSet.has(positionedBlock.block.id)}
          />
        ));
      }}
      testId="schedule-timeline-grid"
      timeSlots={scheduleTimelineTimeSlots}
    />
  );
}

function TimelineBlock({
  onWorkerSelect,
  positionedBlock,
  selected,
}: {
  onWorkerSelect: () => void;
  positionedBlock: PositionedBlock;
  selected: boolean;
}) {
  const { block, lane } = positionedBlock;
  const selectable = block.worker === scheduleSelectedWorkerContext.workerName;
  const firstSelectableBlock =
    block.id === scheduleSelectedWorkerContext.selectedBlockIds[0];
  const style = getBlockStyle(positionedBlock);
  const blockClassName = cn(
    "absolute z-10 flex min-w-0 flex-col justify-center overflow-hidden rounded-[6px] border px-2 text-left tracking-normal transition-colors duration-150 ease-out",
    selected
      ? "border-green-400 bg-green-400 text-white"
      : blockToneClassNames[block.tone],
    selectable &&
      "cursor-pointer hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 focus-visible:ring-offset-1",
  );
  const content = (
    <TimelineBlockText
      selected={selected}
      subtitle={block.label}
      title={block.worker}
    />
  );

  if (selectable) {
    return (
      <button
        type="button"
        aria-label={`${block.worker} ${block.label} ${block.time}`}
        aria-pressed={selected}
        className={blockClassName}
        data-lane={lane}
        data-schedule-block-id={block.id}
        data-testid={
          firstSelectableBlock ? "schedule-timeline-worker-select" : undefined
        }
        onClick={onWorkerSelect}
        style={style}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      aria-label={`${block.worker} ${block.label} ${block.time}`}
      className={blockClassName}
      data-lane={lane}
      data-schedule-block-id={block.id}
      role="gridcell"
      style={style}
    >
      {content}
    </div>
  );
}

function WorkerDetailPanel({ selected }: { selected: boolean }) {
  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[8px] border border-gray-200 bg-white px-4 py-4">
      {selected ? <SelectedWorkerDetail /> : <EmptyWorkerDetail />}
    </aside>
  );
}

function EmptyWorkerDetail() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center text-h-18-regular text-gray-400">
      선택된 조교가 없습니다.
    </div>
  );
}

function SelectedWorkerDetail() {
  return (
    <>
      <div className="flex h-[26px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="size-4 shrink-0 rounded-full bg-green-400"
          />
          <h2 className="truncate text-h-20 text-gray-900">
            {scheduleSelectedWorkerContext.workerName}
          </h2>
        </div>
        <span className="shrink-0 text-h-18-regular text-gray-700">
          {scheduleSelectedWorkerContext.assignedCountText}
        </span>
      </div>

      <div
        className="mt-7 min-h-0 flex-1 overflow-y-auto pr-1"
        data-testid="schedule-timeline-worker-detail-scroll"
      >
        <div className="flex flex-col gap-3 pb-4">
          {scheduleSelectedWorkerContext.assignments.map((assignment) => (
            <AssignmentCard assignment={assignment} key={assignment.id} />
          ))}
        </div>
      </div>

      <div className="mt-5 flex shrink-0 gap-3">
        <Button
          asChild
          variant="secondary"
          className="h-11 flex-1 rounded-[6px] border-0 bg-gray-100 px-3 tracking-normal text-gray-700 shadow-none hover:bg-gray-100"
        >
          <Link href={scheduleSelectedWorkerContext.scheduleHref}>
            {scheduleSelectedWorkerContext.actions.editScheduleLabel}
          </Link>
        </Button>
        <Button
          asChild
          variant="secondary"
          className="h-11 flex-1 rounded-[6px] border-0 bg-gray-100 px-3 tracking-normal text-gray-700 shadow-none hover:bg-gray-100"
        >
          <Link href={scheduleSelectedWorkerContext.detailHref}>
            {scheduleSelectedWorkerContext.actions.viewWorkerLabel}
          </Link>
        </Button>
      </div>
    </>
  );
}

function AssignmentCard({
  assignment,
}: {
  assignment: ScheduleSelectedWorkerAssignment;
}) {
  const tagTone = assignmentTagTone[assignment.tagLabel];

  return (
    <article className="flex h-20 flex-col justify-center rounded-[8px] border border-gray-200 px-4">
      <div className="flex min-w-0 items-center gap-2">
        <h3 className="min-w-0 truncate text-h-20 text-gray-900">
          {assignment.dutyName}
        </h3>
        <Badge
          variant={tagTone.variant}
          size="M"
          className="text-detail-16-semibold"
          style={tagTone.style}
        >
          {assignment.tagLabel}
        </Badge>
      </div>
      <div className="mt-3 flex min-w-0 items-center text-h-18-regular text-gray-700">
        <span className="min-w-0 truncate">
          {assignment.dayLabel} {assignment.time}
        </span>
        <span className="mx-3 h-5 w-px shrink-0 bg-gray-200" />
        <span className="min-w-0 truncate">{assignment.locationName}</span>
      </div>
    </article>
  );
}

function getTimelineBlocksForDisplay(): ScheduleTimelineBlock[] {
  return scheduleTimelineBlocks.map((block) =>
    block.id === "schedule-kang-taewoo-mon-chemistry-g"
      ? {
          ...block,
          time: "10:00~12:00",
          startHour: 10,
          endHour: 12,
        }
      : block,
  );
}

function layoutBlocks(
  blocks: readonly ScheduleTimelineBlock[],
): PositionedBlock[] {
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

function getBlockColumnRange(block: ScheduleTimelineBlock) {
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

function getBlockStyle({
  lane,
  spanColumns,
  startColumn,
}: PositionedBlock): CSSProperties {
  return {
    height: timelineLaneHeight,
    left: `${(startColumn / timelineColumnCount) * 100}%`,
    top: 1 + lane * timelineLaneStride,
    width: `${(spanColumns / timelineColumnCount) * 100}%`,
  };
}

function normalizeHour(hour: number) {
  return hour < timelineStartHour ? hour + 24 : hour;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
