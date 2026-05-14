"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { IconCheck, IconChevronDown } from "@/shared/ui/icons";
import { cn } from "@/shared/lib/utils";
import {
  createScheduleTimelineDataSource,
  emptyScheduleTimelineViewModel,
  type ScheduleTimelineDataSource,
  type ScheduleTimelineViewModel,
} from "../api/schedule-timeline-data-source";
import {
  scheduleTimelineDays,
  scheduleTimelineTimeSlots,
  type ScheduleFilterOption,
  type ScheduleSelectedWorkerAssignment,
  type ScheduleSelectedWorkerContext,
  type ScheduleTimelineBlock,
  type ScheduleTimelineFilters,
  type ScheduleTimelineTone,
} from "../model/schedule-fixtures";
import {
  orderTimelineDaysSundayFirst,
  TimelineBlockText,
  TimelineGridFrame,
} from "./timeline-grid-frame";
import {
  parseTimelineBlocks,
  type ParsedTimelineBlock,
} from "./timeline-block-parser";

type ScheduleTimelineFilterKey = "location" | "duty" | "dutyTag" | "worker";
type ScheduleTimelineFilterState = Record<ScheduleTimelineFilterKey, string>;

type AssignmentTagTone = {
  variant: "green" | "orange" | "blue" | "red" | "grey";
  style?: CSSProperties;
};

const timelineLaneHeight = 54;
const timelineLaneStride = 55;
const timelineDays = orderTimelineDaysSundayFirst(scheduleTimelineDays);

const blockToneClassNames: Record<ScheduleTimelineTone, string> = {
  green: "border-green-400 bg-green-100 text-gray-800",
  orange: "border-orange-400 bg-orange-100 text-gray-800",
  pink: "border-red-500 bg-red-50 text-gray-800",
  blue: "border-blue-500 bg-blue-50 text-gray-800",
};

const assignmentTagTone: Record<string, AssignmentTagTone> = {
  보강: {
    variant: "blue",
    style: { color: "var(--color-blue-500)" },
  },
  질문: {
    variant: "orange",
    style: { color: "var(--color-orange-400)" },
  },
  자습감독: {
    variant: "orange",
    style: { color: "var(--color-orange-400)" },
  },
  채점: {
    variant: "blue",
    style: { color: "var(--color-blue-500)" },
  },
  시험대비: {
    variant: "red",
    style: { color: "var(--color-red-500)" },
  },
  논술: {
    variant: "blue",
    style: { color: "var(--color-blue-500)" },
  },
  행정: {
    variant: "grey",
  },
};

const initialScheduleTimelineFilters = {
  duty: "all",
  dutyTag: "all",
  location: "all",
  worker: "all",
} as const satisfies ScheduleTimelineFilterState;

export function ScheduleTimelineScreen({
  dataSource: dataSourceProp,
}: {
  dataSource?: ScheduleTimelineDataSource;
} = {}) {
  const fallbackDataSource = useMemo(() => createScheduleTimelineDataSource(), []);
  const dataSource = dataSourceProp ?? fallbackDataSource;
  const [openFilter, setOpenFilter] =
    useState<ScheduleTimelineFilterKey | null>(null);
  const [selectedFilters, setSelectedFilters] =
    useState<ScheduleTimelineFilterState>(initialScheduleTimelineFilters);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [viewModel, setViewModel] = useState(
    dataSource.initialData ?? emptyScheduleTimelineViewModel,
  );
  const [loading, setLoading] = useState(!dataSource.initialData);
  const [errorMessage, setErrorMessage] = useState("");
  const filteredViewModel = useMemo(
    () => filterScheduleTimelineViewModel(viewModel, selectedFilters),
    [selectedFilters, viewModel],
  );
  const selectedWorkerContext =
    selectedWorkerId === null
      ? null
      : filteredViewModel.workerContexts.find(
          (context) => context.workerId === selectedWorkerId,
        ) ?? null;
  const timelineBlocks = getTimelineBlocksForDisplay(filteredViewModel.blocks);
  const selectedBlockIds = selectedWorkerContext?.selectedBlockIds ?? [];

  useEffect(() => {
    let active = true;

    void dataSource
      .getTimeline()
      .then((nextViewModel) => {
        if (!active) {
          return;
        }

        setViewModel(nextViewModel);
        setSelectedWorkerId((currentWorkerId) =>
          currentWorkerId &&
          nextViewModel.workerContexts.some(
            (context) => context.workerId === currentWorkerId,
          )
            ? currentWorkerId
            : null,
        );
        setErrorMessage("");
        setLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setErrorMessage("시간표를 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource]);

  return (
    <section
      aria-label="근무 시간표"
      className="mx-auto flex h-[calc(100vh-144px)] w-full max-w-[1480px] flex-col overflow-hidden tracking-normal"
      data-schedule-timeline-state={
        selectedWorkerContext ? "worker-selected" : "default"
      }
    >
      {loading || errorMessage ? (
        <div
          className={cn(
            "mb-3 flex min-h-9 items-center rounded-[8px] border px-4 py-2.5 text-body-14-medium tracking-normal",
            errorMessage
              ? "border-red-100 bg-red-50 text-red-500"
              : "border-gray-200 bg-white text-gray-600",
          )}
          role="status"
        >
          {errorMessage || "시간표를 불러오는 중입니다."}
        </div>
      ) : null}

      <Toolbar
        filters={viewModel.filters}
        openFilter={openFilter}
        selectedFilters={selectedFilters}
        onFilterToggle={(filter) =>
          setOpenFilter((currentFilter) =>
            currentFilter === filter ? null : filter,
          )
        }
        onSelectFilter={(filter, value) => {
          setSelectedFilters((currentFilters) => ({
            ...currentFilters,
            [filter]: value,
          }));
          setOpenFilter(null);
        }}
      />

      <div className="mt-4 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px] gap-4">
        <TimelineGrid
          blocks={timelineBlocks}
          selectedBlockIds={selectedBlockIds}
          workerContexts={filteredViewModel.workerContexts}
          onWorkerSelect={(workerId) => {
            setSelectedWorkerId(workerId);
            setOpenFilter(null);
          }}
        />
        <WorkerDetailPanel selectedContext={selectedWorkerContext} />
      </div>
    </section>
  );
}

function Toolbar({
  filters,
  selectedFilters,
  openFilter,
  onFilterToggle,
  onSelectFilter,
}: {
  filters: ScheduleTimelineFilters;
  selectedFilters: ScheduleTimelineFilterState;
  openFilter: ScheduleTimelineFilterKey | null;
  onFilterToggle: (filter: ScheduleTimelineFilterKey) => void;
  onSelectFilter: (filter: ScheduleTimelineFilterKey, value: string) => void;
}) {
  const filterControls = [
    {
      key: "location",
      label: getSelectedFilterLabel(
        filters.locationOptions,
        selectedFilters.location,
        "근무지 (전체)",
      ),
      menuLabel: "근무지 필터",
      menuTestId: "schedule-timeline-location-menu",
      options: filters.locationOptions,
      testId: "schedule-timeline-location-filter",
      widthClassName: "w-[138px]",
    },
    {
      key: "duty",
      label: getSelectedFilterLabel(
        filters.dutyOptions,
        selectedFilters.duty,
        "근무 (전체)",
      ),
      menuLabel: "근무 필터",
      menuTestId: undefined,
      options: filters.dutyOptions,
      testId: undefined,
      widthClassName: "w-[124px]",
    },
    {
      key: "dutyTag",
      label: getSelectedFilterLabel(
        filters.dutyTagOptions,
        selectedFilters.dutyTag,
        "근무 태그 (전체)",
      ),
      menuLabel: "근무 태그 필터",
      menuTestId: undefined,
      options: filters.dutyTagOptions,
      testId: undefined,
      widthClassName: "w-[158px]",
    },
    {
      key: "worker",
      label: getSelectedFilterLabel(
        filters.workerOptions,
        selectedFilters.worker,
        "조교 (전체)",
      ),
      menuLabel: "조교 필터",
      menuTestId: undefined,
      options: filters.workerOptions,
      testId: undefined,
      widthClassName: "w-[124px]",
    },
  ] as const satisfies readonly {
    key: ScheduleTimelineFilterKey;
    label: string;
    menuLabel: string;
    menuTestId?: string;
    options: readonly ScheduleFilterOption[];
    testId?: string;
    widthClassName: string;
  }[];

  return (
    <div className="flex h-10 items-start gap-3">
      {filterControls.map((control) => {
        const menuOpen = openFilter === control.key;

        return (
          <div className="relative" key={control.key}>
            <FilterButton
              ariaExpanded={menuOpen}
              label={control.label}
              onClick={() => onFilterToggle(control.key)}
              testId={control.testId}
              widthClassName={control.widthClassName}
            />
            {menuOpen ? (
              <FilterMenu
                label={control.menuLabel}
                selectedValue={selectedFilters[control.key]}
                onOptionClick={(value) => {
                  onSelectFilter(control.key, value);
                }}
                options={control.options}
                testId={control.menuTestId}
              />
            ) : null}
          </div>
        );
      })}
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

function FilterMenu({
  label,
  onOptionClick,
  options,
  selectedValue,
  testId,
}: {
  label: string;
  onOptionClick: (value: string) => void;
  options: readonly ScheduleFilterOption[];
  selectedValue: string;
  testId?: string;
}) {
  return (
    <div
      role="listbox"
      aria-label={label}
      data-testid={testId}
      className="absolute left-0 top-12 z-30 w-[148px] overflow-hidden rounded-[4px] border border-gray-200 bg-white px-3 shadow-[0px_8px_20px_rgba(17,24,39,0.12)]"
    >
      {options.map((option) => {
        const selected = option.value === selectedValue;

        return (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onOptionClick(option.value)}
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
  workerContexts,
  onWorkerSelect,
}: {
  blocks: readonly ScheduleTimelineBlock[];
  selectedBlockIds: readonly string[];
  workerContexts: readonly ScheduleSelectedWorkerContext[];
  onWorkerSelect: (workerId: string) => void;
}) {
  const { dayLayouts } = parseTimelineBlocks({
    blocks,
    days: timelineDays,
    layout: {
      blockHeight: timelineLaneHeight,
      laneStride: timelineLaneStride,
      topOffset: 1,
    },
    selectedBlockIds,
    timeSlots: scheduleTimelineTimeSlots,
    workerContexts,
  });

  return (
    <TimelineGridFrame
      ariaLabel="주간 근무 시간표"
      className="h-full"
      days={timelineDays}
      renderBlocks={(day) => {
        const parsedBlocks =
          dayLayouts.find((layout) => layout.day.id === day.id)?.blocks ?? [];

        return parsedBlocks.map((parsedBlock) => (
          <TimelineBlock
            key={parsedBlock.block.id}
            onWorkerSelect={onWorkerSelect}
            parsedBlock={parsedBlock}
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
  parsedBlock,
}: {
  onWorkerSelect: (workerId: string) => void;
  parsedBlock: ParsedTimelineBlock;
}) {
  const { block, firstSelectable, lane, selected, style, workerContext } =
    parsedBlock;
  const selectable = workerContext !== null;
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

  if (workerContext) {
    return (
      <button
        type="button"
        aria-label={`${block.worker} ${block.label} ${block.time}`}
        aria-pressed={selected}
        className={blockClassName}
        data-lane={lane}
        data-schedule-block-id={block.id}
        data-testid={
          firstSelectable ? "schedule-timeline-worker-select" : undefined
        }
        onClick={() => onWorkerSelect(workerContext.workerId)}
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

function WorkerDetailPanel({
  selectedContext,
}: {
  selectedContext: ScheduleSelectedWorkerContext | null;
}) {
  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[8px] border border-gray-200 bg-white px-4 py-4">
      {selectedContext ? (
        <SelectedWorkerDetail context={selectedContext} />
      ) : (
        <EmptyWorkerDetail />
      )}
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

function SelectedWorkerDetail({
  context,
}: {
  context: ScheduleSelectedWorkerContext;
}) {
  return (
    <>
      <div className="flex h-[26px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="size-4 shrink-0 rounded-full bg-green-400"
          />
          <h2 className="truncate text-h-20 text-gray-900">
            {context.workerName}
          </h2>
        </div>
        <span className="shrink-0 text-h-18-regular text-gray-700">
          {context.assignedCountText}
        </span>
      </div>

      <div
        className="mt-7 min-h-0 flex-1 overflow-y-auto pr-1"
        data-testid="schedule-timeline-worker-detail-scroll"
      >
        <div className="flex flex-col gap-3 pb-4">
          {context.assignments.map((assignment) => (
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
          <Link href={context.scheduleHref}>
            {context.actions.editScheduleLabel}
          </Link>
        </Button>
        <Button
          asChild
          variant="secondary"
          className="h-11 flex-1 rounded-[6px] border-0 bg-gray-100 px-3 tracking-normal text-gray-700 shadow-none hover:bg-gray-100"
        >
          <Link href={context.detailHref}>
            {context.actions.viewWorkerLabel}
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
  const tagTone = getAssignmentTagTone(assignment.tagLabel);

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

function getAssignmentTagTone(tagLabel: string): AssignmentTagTone {
  return assignmentTagTone[tagLabel] ?? { variant: "grey" };
}

function filterScheduleTimelineViewModel(
  viewModel: ScheduleTimelineViewModel,
  selectedFilters: ScheduleTimelineFilterState,
): ScheduleTimelineViewModel {
  const blocks = viewModel.blocks.filter((block) =>
    matchesScheduleFilters(block, viewModel.filters, selectedFilters),
  );
  const visibleBlockIds = new Set(blocks.map((block) => block.id));
  const workerContexts = viewModel.workerContexts
    .map((context) => filterWorkerContext(context, visibleBlockIds))
    .filter(
      (context): context is ScheduleSelectedWorkerContext => context !== null,
    );

  return {
    ...viewModel,
    blocks,
    workerContexts,
  };
}

function filterWorkerContext(
  context: ScheduleSelectedWorkerContext,
  visibleBlockIds: ReadonlySet<string>,
): ScheduleSelectedWorkerContext | null {
  const selectedBlockIds = context.selectedBlockIds.filter((blockId) =>
    visibleBlockIds.has(blockId),
  );

  if (selectedBlockIds.length === 0) {
    return null;
  }

  const assignments = context.assignments.filter((_, index) =>
    visibleBlockIds.has(context.selectedBlockIds[index] ?? ""),
  );

  return {
    ...context,
    assignedCountText: `현재 배정 근무 (${assignments.length}건)`,
    assignments,
    selectedBlockIds,
  } satisfies ScheduleSelectedWorkerContext;
}

function matchesScheduleFilters(
  block: ScheduleTimelineBlock,
  filters: ScheduleTimelineFilters,
  selectedFilters: ScheduleTimelineFilterState,
) {
  return (
    matchesLocationFilter(
      block,
      filters.locationOptions,
      selectedFilters.location,
    ) &&
    matchesDutyFilter(block, filters.dutyOptions, selectedFilters.duty) &&
    matchesDutyTagFilter(
      block,
      filters.dutyTagOptions,
      selectedFilters.dutyTag,
    ) &&
    matchesWorkerFilter(block, filters.workerOptions, selectedFilters.worker)
  );
}

function matchesLocationFilter(
  block: ScheduleTimelineBlock,
  options: readonly ScheduleFilterOption[],
  selectedValue: string,
) {
  return matchesSelectedOption(options, selectedValue, (option) =>
    block.locationId === option.value ||
    block.locationName === option.label ||
    block.locationName === option.value,
  );
}

function matchesDutyFilter(
  block: ScheduleTimelineBlock,
  options: readonly ScheduleFilterOption[],
  selectedValue: string,
) {
  return matchesSelectedOption(options, selectedValue, (option) =>
    block.dutyId === option.value ||
    block.label === option.label ||
    block.label === option.value,
  );
}

function matchesDutyTagFilter(
  block: ScheduleTimelineBlock,
  options: readonly ScheduleFilterOption[],
  selectedValue: string,
) {
  return matchesSelectedOption(options, selectedValue, (option) =>
    block.tagIds?.includes(option.value) === true ||
    block.tagLabel === option.label ||
    block.tagLabel === option.value,
  );
}

function matchesWorkerFilter(
  block: ScheduleTimelineBlock,
  options: readonly ScheduleFilterOption[],
  selectedValue: string,
) {
  return matchesSelectedOption(options, selectedValue, (option) =>
    block.workerId === option.value ||
    block.worker === option.value ||
    block.worker === getWorkerNameFromFilterLabel(option.label),
  );
}

function matchesSelectedOption(
  options: readonly ScheduleFilterOption[],
  selectedValue: string,
  matcher: (option: ScheduleFilterOption) => boolean,
) {
  if (selectedValue === "all") {
    return true;
  }

  const selectedOption = options.find((option) => option.value === selectedValue);

  return selectedOption ? matcher(selectedOption) : false;
}

function getSelectedFilterLabel(
  options: readonly ScheduleFilterOption[],
  selectedValue: string,
  fallback: string,
) {
  return (
    options.find((option) => option.value === selectedValue)?.label ??
    options[0]?.label ??
    fallback
  );
}

function getWorkerNameFromFilterLabel(label: string) {
  return label.split("·")[0]?.trim() ?? label;
}

function getTimelineBlocksForDisplay(
  blocks: readonly ScheduleTimelineBlock[],
): ScheduleTimelineBlock[] {
  return blocks.map((block) =>
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
