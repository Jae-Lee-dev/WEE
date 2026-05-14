"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type CSSProperties,
} from "react";
import { FilterChip } from "@/shared/ui/filter-chip";
import { IconChevronLeft, IconChevronRight } from "@/shared/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Segment } from "@/shared/ui/segment";
import { OptionSelect, type SelectOption } from "@/shared/ui/select";
import { useWeeToast } from "@/shared/ui/wee-toast";
import {
  getTimelineBlockHeight,
  getTimelineLaneTop,
  getTimelineLaneCount,
  getTimelineRowHeight,
  timelineDefaultRowHeight,
  TimelineGridFrame,
} from "@/shared/ui/timeline-grid-frame";
import { Textarea } from "@/shared/ui/textarea";
import { cn } from "@/shared/lib/utils";
import {
  createRecordsDataSource,
  shouldUseRecordsFixtureDataSource,
  type RecordMainActionInput,
  type RecordsDataSource,
} from "../api/records-data-source";
import {
  recordMainFixtureViewModel,
  type RecordDetailAction,
  type RecordDetailLine,
  type RecordDetailState,
  type RecordDetailStateId,
  type RecordMainViewModel,
  type RecordTimelineBlock,
  type RecordTimelineBlockKind,
  type RecordTimelineFixture,
  type RecordsFilterOption,
  type RecordsTone,
} from "../model/records-fixtures";
import {
  createEmptyRecordMainViewModel,
  createVisibleTimeline,
  createWorkerFilterIdFromName,
  createWorkerFilterOptionsWithInitialName,
  emptyRecordFilterOptions,
  getBlockStyle,
  getFilteredBlocks,
  getNavigatedWeekStartKey,
  getWeekStartKeyFromDateKey,
  isBlockInWeek,
  layoutBlocks,
  matchesRecordFilters,
  resolveBlockStateId,
  resolveInitialRecordSelection,
  selectDefaultBlockFromBlocks,
  type PositionedRecordBlock,
  type RecordFilterState,
} from "../model/record-main-view";

type RecordMainScreenProps = {
  dataSource?: RecordsDataSource;
  initialFocusId?: string;
  initialTypeFilterId?: string;
  initialWorkerNameFilter?: string;
};

const blockToneClassNames: Record<RecordsTone, string> = {
  green: "border-green-400 bg-green-100 text-gray-900",
  orange: "border-orange-400 bg-orange-100 text-gray-900",
  pink: "border-red-500 bg-red-50 text-gray-900",
  blue: "border-blue-500 bg-blue-50 text-gray-900",
  grey: "border-gray-500 bg-gray-50 text-gray-900",
};

const blockToneBackgroundStyles: Record<RecordsTone, string> = {
  green: "var(--color-green-100)",
  orange: "var(--color-orange-100)",
  pink: "var(--color-red-50)",
  blue: "var(--color-blue-50)",
  grey: "var(--color-gray-50)",
};

const blockToneBorderStyles: Record<RecordsTone, string> = {
  green: "var(--color-green-400)",
  orange: "var(--color-orange-400)",
  pink: "var(--color-red-500)",
  blue: "var(--color-blue-500)",
  grey: "var(--color-gray-500)",
};

const selectedBlockToneClassNames: Record<RecordsTone, string> = {
  green: "border-green-400 bg-green-400 text-white",
  orange: "border-orange-400 bg-orange-400 text-white",
  pink: "border-red-500 bg-red-500 text-white",
  blue: "border-blue-500 bg-blue-500 text-white",
  grey: "border-gray-500 bg-gray-500 text-white",
};

const selectedBlockToneBackgroundStyles: Record<RecordsTone, string> = {
  green: "var(--color-green-400)",
  orange: "var(--color-orange-400)",
  pink: "var(--color-red-500)",
  blue: "var(--color-blue-500)",
  grey: "var(--color-gray-500)",
};

const selectedBlockToneBorderStyles: Record<RecordsTone, string> = {
  green: "var(--color-green-400)",
  orange: "var(--color-orange-400)",
  pink: "var(--color-red-500)",
  blue: "var(--color-blue-500)",
  grey: "var(--color-gray-500)",
};

const focusRingToneClassNames: Record<RecordsTone, string> = {
  green: "focus-visible:ring-green-200",
  orange: "focus-visible:ring-orange-100",
  pink: "focus-visible:ring-red-100",
  blue: "focus-visible:ring-blue-100",
  grey: "focus-visible:ring-gray-200",
};

const badgeToneClassNames: Record<RecordsTone, string> = {
  green: "bg-green-100",
  orange: "bg-orange-100",
  pink: "bg-red-50",
  blue: "bg-blue-50",
  grey: "bg-gray-100",
};

const toneTextStyles: Record<RecordsTone, CSSProperties> = {
  green: { color: "var(--color-green-400)" },
  orange: { color: "var(--color-orange-400)" },
  pink: { color: "var(--color-red-500)" },
  blue: { color: "var(--color-blue-500)" },
  grey: { color: "var(--color-gray-600)" },
};

const blockSignalToneByKind: Record<RecordTimelineBlockKind, RecordsTone> = {
  normal: "green",
  "location-anomaly": "pink",
  overtime: "blue",
  correction: "orange",
};

type FilterChipVariant = NonNullable<
  ComponentProps<typeof FilterChip>["variant"]
>;

const recordTypeFilterVariants: Record<
  RecordsTone,
  {
    selected: FilterChipVariant;
    unselected: FilterChipVariant;
  }
> = {
  green: { selected: "selected", unselected: "neutral" },
  orange: { selected: "orangeSelected", unselected: "orange" },
  pink: { selected: "dangerSelected", unselected: "danger" },
  blue: { selected: "blueSelected", unselected: "blue" },
  grey: { selected: "selected", unselected: "neutral" },
};

function normalizeRecordTypeFilterId(value: string | undefined) {
  return value === "anomaly" ||
    value === "overtime" ||
    value === "correction" ||
    value === "normal"
    ? value
    : "all";
}

export function RecordMainScreen({
  dataSource: dataSourceProp,
  initialFocusId,
  initialTypeFilterId,
  initialWorkerNameFilter,
}: RecordMainScreenProps = {}) {
  const fixtureMode = shouldUseRecordsFixtureDataSource();
  const fallbackDataSource = useMemo(() => createRecordsDataSource(), []);
  const dataSource = dataSourceProp ?? fallbackDataSource;
  const initialWorkerFilterId =
    createWorkerFilterIdFromName(initialWorkerNameFilter);
  const initialTypeFilter = normalizeRecordTypeFilterId(initialTypeFilterId);
  const [viewModel, setViewModel] = useState<RecordMainViewModel>(
    fixtureMode
      ? recordMainFixtureViewModel
      : createEmptyRecordMainViewModel([]),
  );
  const [selectedStateId, setSelectedStateId] =
    useState<RecordDetailStateId>(
      fixtureMode ? recordMainFixtureViewModel.initialDetailStateId : "empty",
    );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    fixtureMode ? (recordMainFixtureViewModel.initialBlockId ?? null) : null,
  );
  const [selectedWeekStartKey, setSelectedWeekStartKey] = useState<string | null>(
    fixtureMode
      ? (recordMainFixtureViewModel.initialWeekStartKey ?? null)
      : null,
  );
  const [selectedWorkerFilterId, setSelectedWorkerFilterId] = useState(
    initialWorkerFilterId,
  );
  const [selectedStatusFilterId, setSelectedStatusFilterId] = useState("all");
  const [selectedTypeFilterId, setSelectedTypeFilterId] =
    useState(initialTypeFilter);
  const [recordActionSaving, setRecordActionSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const weeToast = useWeeToast();
  const activeWeekStartKey =
    selectedWeekStartKey ??
    viewModel.initialWeekStartKey ??
    viewModel.timeline.weekNavigation?.initialWeekStartKey ??
    null;
  const workerFilterOptions = useMemo(
    () =>
      createWorkerFilterOptionsWithInitialName(
        viewModel.timeline.filters.location ?? emptyRecordFilterOptions,
        initialWorkerNameFilter,
      ),
    [initialWorkerNameFilter, viewModel.timeline.filters.location],
  );
  const weekScopedBlocks = useMemo(
    () =>
      activeWeekStartKey && viewModel.timeline.weekNavigation
        ? viewModel.blocks.filter((block) =>
            isBlockInWeek(block, activeWeekStartKey),
          )
        : viewModel.blocks,
    [activeWeekStartKey, viewModel.blocks, viewModel.timeline.weekNavigation],
  );
  const visibleBlocks = useMemo(
    () =>
      getFilteredBlocks(
        weekScopedBlocks,
        {
          statusFilterId: selectedStatusFilterId,
          typeFilterId: selectedTypeFilterId,
          workerFilterId: selectedWorkerFilterId,
        },
        workerFilterOptions,
      ),
    [
      selectedStatusFilterId,
      selectedTypeFilterId,
      selectedWorkerFilterId,
      workerFilterOptions,
      weekScopedBlocks,
    ],
  );
  const timeline = createVisibleTimeline(viewModel.timeline, activeWeekStartKey);
  const selectedVisibleBlockId =
    selectedBlockId && visibleBlocks.some((block) => block.id === selectedBlockId)
      ? selectedBlockId
      : undefined;
  const selectedDetailStates = selectedVisibleBlockId
    ? viewModel.detailStatesByBlockId[selectedVisibleBlockId] ?? viewModel.detailStates
    : viewModel.detailStates;
  const selectedState = selectedVisibleBlockId
    ? selectedDetailStates[selectedStateId] ?? selectedDetailStates.empty
    : viewModel.detailStates.empty;

  function syncSelectionForFilters(nextFilters: RecordFilterState) {
    if (!selectedBlockId) {
      return;
    }

    const nextVisibleBlocks = getFilteredBlocks(
      weekScopedBlocks,
      nextFilters,
      workerFilterOptions,
    );

    if (nextVisibleBlocks.some((block) => block.id === selectedBlockId)) {
      return;
    }

    setSelectedBlockId(null);
    setSelectedStateId("empty");
  }

  function handleWorkerFilterChange(workerFilterId: string) {
    setSelectedWorkerFilterId(workerFilterId);
    syncSelectionForFilters({
      statusFilterId: selectedStatusFilterId,
      typeFilterId: selectedTypeFilterId,
      workerFilterId,
    });
  }

  function handleStatusFilterChange(statusFilterId: string) {
    setSelectedStatusFilterId(statusFilterId);
    syncSelectionForFilters({
      statusFilterId,
      typeFilterId: selectedTypeFilterId,
      workerFilterId: selectedWorkerFilterId,
    });
  }

  function handleTypeFilterChange(typeFilterId: string) {
    setSelectedTypeFilterId(typeFilterId);
    syncSelectionForFilters({
      statusFilterId: selectedStatusFilterId,
      typeFilterId,
      workerFilterId: selectedWorkerFilterId,
    });
  }

  function handleSelectBlock(block: RecordTimelineBlock) {
    setSelectedBlockId(block.id);
    setSelectedStateId(resolveBlockStateId(block));

    if (block.dateKey) {
      setSelectedWeekStartKey(getWeekStartKeyFromDateKey(block.dateKey));
    }
  }

  function handleNavigateWeek(direction: -1 | 1) {
    const nextWeekStartKey = getNavigatedWeekStartKey(
      activeWeekStartKey,
      viewModel.timeline.weekNavigation,
      direction,
    );

    if (!nextWeekStartKey) {
      return;
    }

    const nextBlock = selectDefaultBlockFromBlocks(
      viewModel.blocks.filter(
        (block) =>
          isBlockInWeek(block, nextWeekStartKey) &&
          matchesRecordFilters(
            block,
            {
              statusFilterId: selectedStatusFilterId,
              typeFilterId: selectedTypeFilterId,
              workerFilterId: selectedWorkerFilterId,
            },
            workerFilterOptions,
          ),
      ),
    );

    setSelectedWeekStartKey(nextWeekStartKey);
    setSelectedBlockId(nextBlock?.id ?? null);
    setSelectedStateId(resolveBlockStateId(nextBlock));
  }

  async function handleConfirmRecordAction(
    input: Omit<RecordMainActionInput, "recordId">,
  ) {
    if (!selectedVisibleBlockId) {
      throw new Error("선택된 근무기록이 없습니다.");
    }

    setRecordActionSaving(true);
    setErrorMessage("");

    try {
      await dataSource.applyMainRecordAction({
        ...input,
        recordId: selectedVisibleBlockId,
      });
      const nextViewModel = await dataSource.getMainRecords();
      const nextBlock =
        nextViewModel.blocks.find((block) => block.id === selectedVisibleBlockId) ??
        nextViewModel.blocks.find((block) => block.id === nextViewModel.initialBlockId) ??
        null;

      setViewModel(nextViewModel);
      setSelectedBlockId(nextBlock?.id ?? null);
      setSelectedStateId(resolveBlockStateId(nextBlock));
      weeToast.compact({ title: getRecordActionSavedMessage(input.action) });
    } catch (error) {
      weeToast.error({
        title: "처리 실패",
        description:
          error instanceof Error
            ? error.message
            : "근무기록 처리 내용을 저장하지 못했습니다.",
        testId: "wee-toast",
      });
      throw error;
    } finally {
      setRecordActionSaving(false);
    }
  }

  useEffect(() => {
    let active = true;

    void dataSource
      .getMainRecords()
      .then((nextViewModel) => {
        if (!active) {
          return;
        }

        const nextWorkerFilterId =
          createWorkerFilterIdFromName(initialWorkerNameFilter);
        const nextTypeFilterId = normalizeRecordTypeFilterId(initialTypeFilterId);
        const nextWorkerOptions = createWorkerFilterOptionsWithInitialName(
          nextViewModel.timeline.filters.location ?? emptyRecordFilterOptions,
          initialWorkerNameFilter,
        );
        const initialSelection = resolveInitialRecordSelection(
          nextViewModel,
          initialFocusId,
          nextWorkerFilterId,
        );
        const nextFilters: RecordFilterState = {
          statusFilterId: "all",
          typeFilterId: nextTypeFilterId,
          workerFilterId: nextWorkerFilterId,
        };
        const selectedBlock =
          initialSelection.block &&
          matchesRecordFilters(
            initialSelection.block,
            nextFilters,
            nextWorkerOptions,
          )
            ? initialSelection.block
            : selectDefaultBlockFromBlocks(
                nextViewModel.blocks.filter((block) =>
                  matchesRecordFilters(block, nextFilters, nextWorkerOptions),
                ),
              );

        setViewModel(nextViewModel);
        setSelectedWorkerFilterId(nextWorkerFilterId);
        setSelectedTypeFilterId(nextTypeFilterId);
        setSelectedBlockId(selectedBlock?.id ?? null);
        setSelectedWeekStartKey(
          selectedBlock?.dateKey
            ? getWeekStartKeyFromDateKey(selectedBlock.dateKey)
            : initialSelection.weekStartKey,
        );
        setSelectedStateId(resolveBlockStateId(selectedBlock));
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setViewModel(
          createEmptyRecordMainViewModel(["표시할 근무 기록이 없습니다."]),
        );
        setSelectedBlockId(null);
        setSelectedWeekStartKey(null);
        setSelectedStateId("empty");
        setErrorMessage("근무 기록을 불러오지 못했습니다.");
      });

    return () => {
      active = false;
    };
  }, [dataSource, initialFocusId, initialTypeFilterId, initialWorkerNameFilter]);

  return (
    <section
      aria-label="근무기록"
      className="w-full tracking-normal"
      data-record-main-state={selectedState.id}
      data-testid="record-main-screen"
    >
      {errorMessage ? (
        <div
          className="mb-3 flex min-h-9 items-center rounded-[8px] border border-red-100 bg-red-50 px-4 py-2.5 text-body-14-medium tracking-normal text-red-500"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}

      <RecordToolbar
        canGoNext={
          viewModel.timeline.weekNavigation && activeWeekStartKey
            ? activeWeekStartKey < viewModel.timeline.weekNavigation.maxWeekStartKey
            : true
        }
        canGoPrevious={
          viewModel.timeline.weekNavigation && activeWeekStartKey
            ? activeWeekStartKey > viewModel.timeline.weekNavigation.minWeekStartKey
            : true
        }
        onStatusFilterChange={handleStatusFilterChange}
        onTypeFilterChange={handleTypeFilterChange}
        onWorkerFilterChange={handleWorkerFilterChange}
        onNavigateWeek={handleNavigateWeek}
        selectedStatusFilterId={selectedStatusFilterId}
        selectedTypeFilterId={selectedTypeFilterId}
        selectedWorkerFilterId={selectedWorkerFilterId}
        timeline={timeline}
      />

      <div
        className="mt-4 grid h-[calc(100vh-196px)] min-h-[520px] grid-cols-[minmax(760px,1fr)_340px] gap-4 overflow-hidden"
        data-testid="record-main-layout-grid"
      >
        <RecordTimelineGrid
          blocks={visibleBlocks}
          onSelectBlock={handleSelectBlock}
          selectedBlockId={selectedVisibleBlockId}
          timeline={timeline}
        />
        <RecordDetailPanel
          actionSaving={recordActionSaving}
          detailStates={selectedDetailStates}
          onConfirmRecordAction={handleConfirmRecordAction}
          state={selectedState}
          onSelectState={(stateId) => {
            setSelectedStateId(stateId);
          }}
        />
      </div>
    </section>
  );
}

function RecordToolbar({
  canGoNext,
  canGoPrevious,
  onStatusFilterChange,
  onTypeFilterChange,
  onWorkerFilterChange,
  onNavigateWeek,
  selectedStatusFilterId,
  selectedTypeFilterId,
  selectedWorkerFilterId,
  timeline,
}: {
  canGoNext: boolean;
  canGoPrevious: boolean;
  onStatusFilterChange: (filterId: string) => void;
  onTypeFilterChange: (filterId: string) => void;
  onWorkerFilterChange: (filterId: string) => void;
  onNavigateWeek: (direction: -1 | 1) => void;
  selectedStatusFilterId: string;
  selectedTypeFilterId: string;
  selectedWorkerFilterId: string;
  timeline: RecordTimelineFixture;
}) {
  const { filters } = timeline;

  return (
    <div className="flex h-9 items-center justify-between gap-4">
      <div className="flex shrink-0 items-center gap-3">
        <RoundArrowButton
          direction="left"
          disabled={!canGoPrevious}
          onClick={() => onNavigateWeek(-1)}
        />
        <h2 className="text-h-20 tracking-normal text-gray-900">
          {timeline.weekLabel}
        </h2>
        <RoundArrowButton
          direction="right"
          disabled={!canGoNext}
          onClick={() => onNavigateWeek(1)}
        />
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <FilterSelect
          ariaLabel="조교 필터"
          options={filters.location ?? []}
          value={selectedWorkerFilterId}
          onChange={onWorkerFilterChange}
          widthClassName="w-[128px]"
        />
        <FilterSelect
          ariaLabel="상태 필터"
          options={filters.status ?? []}
          value={selectedStatusFilterId}
          onChange={onStatusFilterChange}
          widthClassName="w-[128px]"
        />
        <RecordTypeChips
          onSelect={onTypeFilterChange}
          options={filters.type ?? []}
          selectedId={selectedTypeFilterId}
        />
      </div>
    </div>
  );
}

function RoundArrowButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "left" ? IconChevronLeft : IconChevronRight;

  return (
    <button
      type="button"
      aria-label={direction === "left" ? "이전 주" : "다음 주"}
      className={cn(
        "flex size-5 items-center justify-center rounded-full text-white transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200",
        disabled
          ? "cursor-not-allowed bg-gray-200 text-gray-400"
          : "bg-gray-600 hover:bg-gray-700",
      )}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon className="size-4" />
    </button>
  );
}

function FilterSelect({
  ariaLabel,
  onChange,
  options,
  value,
  widthClassName,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  options: readonly RecordsFilterOption[];
  value: string;
  widthClassName: string;
}) {
  const selectedValue = options.some((option) => option.id === value)
    ? value
    : options[0]?.id ?? "all";
  const selectOptions: SelectOption[] = options.map((option) => ({
    label: option.label,
    value: option.id,
  }));

  return (
    <OptionSelect
      value={selectedValue}
      onValueChange={onChange}
      options={selectOptions}
      triggerAriaLabel={ariaLabel}
      triggerClassName={cn(
        "h-10 rounded-[6px] border-gray-200 bg-white px-2.5 text-h-18-regular tracking-normal text-gray-800",
        widthClassName,
      )}
      contentClassName="z-[70]"
      itemClassName="text-h-16-medium tracking-normal"
    />
  );
}

function RecordTypeChips({
  onSelect,
  options,
  selectedId,
}: {
  onSelect: (optionId: string) => void;
  options: readonly RecordsFilterOption[];
  selectedId: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {options.map((option) => {
        const selected = option.id === selectedId;
        const tone =
          option.id === "anomaly"
            ? "pink"
            : option.id === "overtime"
              ? "blue"
              : option.id === "correction"
                ? "orange"
                : "green";
        const variants = recordTypeFilterVariants[tone];

        return (
          <FilterChip
            key={option.id}
            aria-pressed={selected}
            onClick={() => onSelect(option.id)}
            variant={selected ? variants.selected : variants.unselected}
            className="h-9 px-4 py-0 text-h-18-semibold tracking-normal focus-visible:ring-offset-0"
          >
            {option.label}
          </FilterChip>
        );
      })}
    </div>
  );
}

function RecordTimelineGrid({
  blocks,
  onSelectBlock,
  selectedBlockId,
  timeline,
}: {
  blocks: readonly RecordTimelineBlock[];
  onSelectBlock: (block: RecordTimelineBlock) => void;
  selectedBlockId?: string;
  timeline: RecordTimelineFixture;
}) {
  const selectedBlockIds = selectedBlockId ? new Set([selectedBlockId]) : new Set();
  const dayLayouts = timeline.dayLabels.map((day) => {
    const positionedBlocks = layoutBlocks(
      blocks.filter((block) => block.dayId === day.id),
    );

    return {
      day,
      laneCount: getTimelineLaneCount(positionedBlocks),
      positionedBlocks,
    };
  });
  const rowHeightsByDayId = new Map(
    dayLayouts.map((layout) => [
      layout.day.id,
      getTimelineRowHeight({ laneCount: layout.laneCount }),
    ]),
  );

  return (
    <TimelineGridFrame
      ariaLabel="주간 근무기록"
      className="h-full"
      days={timeline.dayLabels}
      getRowHeight={(day) =>
        rowHeightsByDayId.get(day.id) ?? timelineDefaultRowHeight
      }
      renderBlocks={(day) => {
        const layout = dayLayouts.find(
          ({ day: layoutDay }) => layoutDay.id === day.id,
        );

        return (
          layout?.positionedBlocks.map((positionedBlock) => (
            <RecordTimelineBlockItem
              laneCount={layout.laneCount}
              key={positionedBlock.block.id}
              onSelectBlock={onSelectBlock}
              positionedBlock={positionedBlock}
              selected={selectedBlockIds.has(positionedBlock.block.id)}
            />
          )) ?? null
        );
      }}
      testId="record-timeline-scroll"
      timeSlots={timeline.hourLabels}
    />
  );
}

function RecordTimelineBlockItem({
  laneCount,
  onSelectBlock,
  positionedBlock,
  selected,
}: {
  laneCount: number;
  onSelectBlock: (block: RecordTimelineBlock) => void;
  positionedBlock: PositionedRecordBlock;
  selected: boolean;
}) {
  const { block, lane } = positionedBlock;
  const selectedStateId = block.selectedStateId;
  const selectable = Boolean(selectedStateId);
  const style = {
    ...getBlockStyle(positionedBlock),
    ...getRecordTimelineBlockBackgroundStyle(block, selected),
    height: getTimelineBlockHeight({ laneCount }),
    top: getTimelineLaneTop({ lane, laneCount }),
  };
  const blockClassName = cn(
    "absolute z-10 flex min-w-0 flex-col justify-center overflow-hidden rounded-[6px] border px-1.5 py-1 text-left tracking-normal transition-colors duration-150 ease-out",
    selected
      ? selectedBlockToneClassNames[block.tone]
      : blockToneClassNames[block.tone],
    selectable &&
      cn(
        "cursor-pointer hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        focusRingToneClassNames[block.tone],
      ),
  );
  const content = (
    <RecordTimelineBlockText
      dutyName={block.dutyName}
      selected={selected}
      timeText={`${block.startTime}~${block.endTime}`}
      workerName={block.workerName}
    />
  );

  if (selectable && selectedStateId) {
    return (
      <button
        type="button"
        aria-label={`${block.workerName} ${block.dutyName} ${block.startTime}~${block.endTime}`}
        aria-pressed={selected}
        className={blockClassName}
        data-record-block-id={block.id}
        data-record-signal-kinds={block.signalKinds.join(" ")}
        data-testid={
          selectedStateId === "normal-selected"
            ? "record-block-normal"
            : "record-block-anomaly"
        }
        onClick={() => onSelectBlock(block)}
        style={style}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      aria-label={`${block.workerName} ${block.dutyName} ${block.startTime}~${block.endTime}`}
      className={blockClassName}
      data-lane={lane}
      data-record-block-id={block.id}
      data-record-signal-kinds={block.signalKinds.join(" ")}
      role="gridcell"
      style={style}
    >
      {content}
    </div>
  );
}

function getRecordTimelineBlockBackgroundStyle(
  block: RecordTimelineBlock,
  selected: boolean,
): CSSProperties {
  const signalTones = block.signalKinds.map(
    (kind) => blockSignalToneByKind[kind],
  );

  if (signalTones.length < 2) {
    return {};
  }

  const firstTone = signalTones[0];
  const secondTone = signalTones[1];
  const toneBackgroundStyles = selected
    ? selectedBlockToneBackgroundStyles
    : blockToneBackgroundStyles;
  const toneBorderStyles = selected
    ? selectedBlockToneBorderStyles
    : blockToneBorderStyles;
  const splitGradient = `linear-gradient(to bottom right, ${toneBackgroundStyles[firstTone]} 0 49.5%, ${toneBackgroundStyles[secondTone]} 50.5% 100%)`;
  const borderGradient = `linear-gradient(to bottom right, ${toneBorderStyles[firstTone]} 0 49.5%, ${toneBorderStyles[secondTone]} 50.5% 100%)`;

  return {
    backgroundClip: "padding-box, border-box",
    backgroundImage: `${splitGradient}, ${borderGradient}`,
    backgroundOrigin: "border-box",
    borderColor: "transparent",
  };
}

function RecordTimelineBlockText({
  dutyName,
  selected = false,
  timeText,
  workerName,
}: {
  dutyName: string;
  selected?: boolean;
  timeText: string;
  workerName: string;
}) {
  const secondaryClassName = cn(
    "truncate text-[11px] leading-3 tracking-normal",
    selected ? "text-white/90" : "text-gray-800",
  );

  return (
    <>
      <span className="truncate text-[11px] leading-3 font-semibold tracking-normal">
        {workerName}
      </span>
      <span className={secondaryClassName}>{dutyName}</span>
      <span className={secondaryClassName}>{timeText}</span>
    </>
  );
}

function RecordDetailPanel({
  actionSaving,
  detailStates,
  onConfirmRecordAction,
  onSelectState,
  state,
}: {
  actionSaving: boolean;
  detailStates: Record<RecordDetailStateId, RecordDetailState>;
  onConfirmRecordAction: (
    input: Omit<RecordMainActionInput, "recordId">,
  ) => Promise<void>;
  onSelectState: (stateId: RecordDetailStateId) => void;
  state: RecordDetailState;
}) {
  return (
    <aside
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[8px] border border-gray-200 bg-white px-4 py-4"
      data-testid="record-detail-panel"
    >
      {state.id === "empty" ? (
        <EmptyDetail state={state} />
      ) : (
        <SelectedDetail
          key={`${state.id}:${state.title ?? ""}`}
          actionSaving={actionSaving}
          detailStates={detailStates}
          onConfirmRecordAction={onConfirmRecordAction}
          onSelectState={onSelectState}
          state={state}
        />
      )}
    </aside>
  );
}

function EmptyDetail({ state }: { state: RecordDetailState }) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center text-h-18-regular tracking-normal text-gray-400">
        {(state.emptyText ?? []).map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>
    </div>
  );
}

function RecordDetailLineList({
  compact = false,
  lines,
}: {
  compact?: boolean;
  lines: readonly RecordDetailLine[];
}) {
  return (
    <div className={compact ? "mt-2" : undefined}>
      {lines.map((line) => (
        <div
          className={cn(
            "flex items-center justify-between border-b border-gray-200 text-h-18-regular tracking-normal last:border-b-0",
            compact ? "h-11" : "h-14",
          )}
          key={line.id}
        >
          <span className="text-gray-500">{line.label}</span>
          <span
            className="text-right text-gray-900"
            style={line.tone ? toneTextStyles[line.tone] : undefined}
          >
            {line.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function SelectedDetail({
  actionSaving,
  detailStates,
  onConfirmRecordAction,
  onSelectState,
  state,
}: {
  actionSaving: boolean;
  detailStates: Record<RecordDetailStateId, RecordDetailState>;
  onConfirmRecordAction: (
    input: Omit<RecordMainActionInput, "recordId">,
  ) => Promise<void>;
  onSelectState: (stateId: RecordDetailStateId) => void;
  state: RecordDetailState;
}) {
  const compactForm = state.id === "anomaly-step-3";
  const action = getRecordActionFromState(state.id, state);
  const inlineReasonField = action === "edit" ? undefined : state.reasonField;
  const inlineTimeFields = action === "edit" ? undefined : state.timeFields;
  const [reason, setReason] = useState("");
  const [timeValues, setTimeValues] = useState<Record<string, string>>(() =>
    createTimeInputValues(state.timeFields),
  );
  const [pendingDialog, setPendingDialog] = useState<{
    input: Omit<RecordMainActionInput, "recordId">;
    state: RecordDetailState;
  } | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState("");

  function openEditDialog() {
    const editState = detailStates["anomaly-step-3"];
    const input = createPendingRecordActionInput({
      reason: "",
      setSaveErrorMessage,
      state: editState,
    });

    if (input) {
      setPendingDialog({ input, state: editState });
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
          {state.statusLabel && state.statusTone ? (
            <ToneBadge label={state.statusLabel} tone={state.statusTone} />
          ) : null}

          {state.title ? (
            <h2 className="mt-4 text-h-20 tracking-normal text-gray-900">
              {state.title}
            </h2>
          ) : null}

          {state.lineSections ? (
            <div className="mt-6 space-y-5">
              {state.lineSections.map((section) => (
                <section key={section.id}>
                  <h3 className="text-h-16-semibold tracking-normal text-gray-900">
                    {section.title}
                  </h3>
                  <RecordDetailLineList compact lines={section.lines} />
                </section>
              ))}
            </div>
          ) : state.lines ? (
            <div className="mt-7">
              <RecordDetailLineList lines={state.lines} />
            </div>
          ) : null}

          {state.alertText ? (
            <div
              className={cn(
                "rounded-[8px] bg-red-50 px-4 text-h-18-regular leading-[1.55] tracking-normal text-red-500",
                compactForm ? "mt-4 py-4" : "mt-[26px] py-4",
              )}
            >
              {state.alertText}
            </div>
          ) : null}

          {state.actions ? (
            <div className={cn("flex items-center gap-3", compactForm ? "mt-4" : "mt-5")}>
              {state.actions.map((action) => (
                <DetailActionButton
                  action={action}
                  key={action.id}
                  onOpenEditDialog={openEditDialog}
                  onSelectState={onSelectState}
                />
              ))}
            </div>
          ) : null}

          {state.helperText ? (
            <p
              className="mt-5 text-h-18-regular leading-[1.45] tracking-normal"
              style={
                state.id === "anomaly-step-4"
                  ? toneTextStyles.pink
                  : toneTextStyles.green
              }
            >
              {state.helperText}
            </p>
          ) : null}

          {inlineReasonField ? (
            <label className={cn("block", compactForm ? "mt-4" : "mt-5")}>
              <span className="text-h-18-semibold tracking-normal text-gray-900">
                {inlineReasonField.label}
              </span>
              <Textarea
                aria-label={inlineReasonField.label}
                className={cn(
                  "mt-3 w-full rounded-[8px] border-gray-200 bg-white py-4 text-h-18-regular tracking-normal text-gray-800",
                  compactForm ? "h-[76px]" : "h-[84px]",
                )}
                placeholder={inlineReasonField.placeholder}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          ) : null}

          {inlineTimeFields ? (
            <div className={cn("grid grid-cols-2 gap-4", compactForm ? "mt-4" : "mt-5")}>
              {inlineTimeFields.map((field) => (
                <label className="block" key={field.id}>
                  <span className="text-h-18-semibold tracking-normal text-gray-900">
                    {field.label}
                  </span>
                  <Input
                    type="time"
                    aria-label={field.label}
                    value={timeValues[field.id] ?? toTimeInputValue(field.value)}
                    onChange={(event) =>
                      setTimeValues((currentValues) => ({
                        ...currentValues,
                        [field.id]: event.target.value,
                      }))
                    }
                    className="mt-3 flex h-11 w-full items-center rounded-[8px] border-gray-200 bg-white text-h-18-regular tracking-normal text-gray-800"
                  />
                </label>
              ))}
            </div>
          ) : null}

          {saveErrorMessage ? (
            <p className="mt-4 rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-h-16-medium text-red-500">
              {saveErrorMessage}
            </p>
          ) : null}
        </div>
      </div>

      {state.confirmLabel ? (
        <div className="mt-5 flex shrink-0 justify-end">
          <button
            type="button"
            disabled={actionSaving}
            onClick={() => {
              const input = createPendingRecordActionInput({
                endTime: inlineTimeFields ? timeValues["check-out"] : undefined,
                reason,
                setSaveErrorMessage,
                startTime: inlineTimeFields ? timeValues["check-in"] : undefined,
                state,
              });

              if (input) {
                setPendingDialog({ input, state });
              }
            }}
            className="flex h-11 min-w-[78px] items-center justify-center rounded-[10px] bg-green-400 px-4 text-h-18-semibold tracking-normal text-white transition-colors duration-150 ease-out hover:bg-green-450 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {actionSaving ? "저장 중" : state.confirmLabel}
          </button>
        </div>
      ) : null}
      {pendingDialog ? (
        <RecordActionConfirmDialog
          actionSaving={actionSaving}
          input={pendingDialog.input}
          onClose={() => setPendingDialog(null)}
          onConfirmRecordAction={onConfirmRecordAction}
          setSaveErrorMessage={setSaveErrorMessage}
          state={pendingDialog.state}
        />
      ) : null}
    </div>
  );
}

function ToneBadge({ label, tone }: { label: string; tone: RecordsTone }) {
  return (
    <span
      className={cn(
        "inline-flex h-[26px] items-center rounded-[4px] px-1.5 text-detail-16-semibold tracking-normal",
        badgeToneClassNames[tone],
      )}
      style={toneTextStyles[tone]}
    >
      {label}
    </span>
  );
}

function DetailActionButton({
  action,
  onOpenEditDialog,
  onSelectState,
}: {
  action: RecordDetailAction;
  onOpenEditDialog: () => void;
  onSelectState: (stateId: RecordDetailStateId) => void;
}) {
  return (
    <button
      type="button"
      data-testid={`record-detail-action-${action.id}`}
      aria-pressed={action.active}
      className={cn(
        "flex h-10 items-center justify-center rounded-full border px-4 text-h-16-medium tracking-normal transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200",
        action.active
          ? "border-green-400 bg-green-400 text-white"
          : "border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50",
      )}
      onClick={() => {
        if (action.id === "mark-normal") {
          onSelectState("anomaly-step-2");
        }

        if (action.id === "edit") {
          onOpenEditDialog();
        }

        if (action.id === "delete") {
          onSelectState("anomaly-step-4");
        }

        if (action.id === "approve-correction" || action.id === "approve-overtime") {
          onSelectState("anomaly-step-3");
        }

        if (action.id === "reject-correction" || action.id === "reject-overtime") {
          onSelectState("anomaly-step-4");
        }
      }}
    >
      {action.label}
    </button>
  );
}

function toTimeInputValue(value: string) {
  const normalizedValue = value.trim();
  const timeMatch = normalizedValue.match(/(\d{1,2}):(\d{2})/);

  if (!timeMatch) {
    return "";
  }

  let hour = Number(timeMatch[1]);
  const minute = timeMatch[2];

  if (normalizedValue.includes("오후") && hour < 12) {
    hour += 12;
  }

  if (normalizedValue.includes("오전") && hour === 12) {
    hour = 0;
  }

  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function createTimeInputValues(timeFields: RecordDetailState["timeFields"]) {
  return Object.fromEntries(
    (timeFields ?? []).map((field) => [
      field.id,
      toTimeInputValue(field.value),
    ]),
  );
}

function isTimeInputValue(value: string | undefined) {
  return Boolean(value?.match(/^\d{2}:\d{2}$/));
}

function parseMoneyInput(value: string) {
  const normalized = value.replace(/[^0-9]/g, "");
  const amount = Number.parseInt(normalized, 10);

  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function createPendingRecordActionInput({
  endTime,
  reason,
  setSaveErrorMessage,
  startTime,
  state,
}: {
  endTime?: string;
  reason: string;
  setSaveErrorMessage: (message: string) => void;
  startTime?: string;
  state: RecordDetailState;
}): Omit<RecordMainActionInput, "recordId"> | null {
  const action = getRecordActionFromState(state.id, state);

  setSaveErrorMessage("");

  if (action === "reject-correction" && !reason.trim()) {
    setSaveErrorMessage("반려 사유를 입력해 주세요.");
    return null;
  }

  return {
    action,
    amount: null,
    endTime,
    overtimePayMode: null,
    payrollEffect: "immediate",
    reason,
    startTime,
  };
}

function RecordActionConfirmDialog({
  actionSaving,
  input,
  onClose,
  onConfirmRecordAction,
  setSaveErrorMessage,
  state,
}: {
  actionSaving: boolean;
  input: Omit<RecordMainActionInput, "recordId">;
  onClose: () => void;
  onConfirmRecordAction: (
    input: Omit<RecordMainActionInput, "recordId">,
  ) => Promise<void>;
  setSaveErrorMessage: (message: string) => void;
  state: RecordDetailState;
}) {
  const initialPayrollEffect =
    state.payrollMode?.options.find((option) => option.active)?.id ??
    state.payrollMode?.options[0]?.id ??
    input.payrollEffect;
  const initialPayMode =
    state.payrollPayMode?.options.find((option) => option.active)?.id ??
    state.payrollPayMode?.options[0]?.id ??
    "fixed";
  const [payrollEffect, setPayrollEffect] = useState(initialPayrollEffect);
  const [payMode, setPayMode] = useState(initialPayMode);
  const [amountText, setAmountText] = useState("");
  const [reasonText, setReasonText] = useState(input.reason);
  const [timeValues, setTimeValues] = useState<Record<string, string>>(() =>
    createTimeInputValues(state.timeFields),
  );
  const [dialogError, setDialogError] = useState("");
  const hasPayrollDecision = Boolean(state.payrollMode);
  const showPayMode = hasPayrollDecision && payrollEffect === "immediate";
  const showAmountField = showPayMode && payMode === "fixed" && state.amountField;
  const editReasonField = input.action === "edit" ? state.reasonField : undefined;
  const showEditTimeFields = input.action === "edit" && Boolean(state.timeFields);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="record-action-confirm-dialog"
        className="w-[calc(100vw-32px)] max-w-[520px] rounded-[8px] bg-white p-8 text-gray-900 shadow-[0px_16px_44px_rgba(17,24,39,0.18)] ring-0"
      >
        <DialogHeader className="gap-3">
          <DialogTitle className="text-h-20 tracking-normal text-gray-900">
            {getRecordActionConfirmTitle(input.action)}
          </DialogTitle>
          <DialogDescription className="text-body-16-regular leading-[24px] tracking-normal text-gray-600">
            {getRecordActionConfirmDescription(input.action, hasPayrollDecision)}
          </DialogDescription>
        </DialogHeader>

        {state.payrollMode ? (
          <section className="mt-5">
            <h3 className="text-h-18-semibold tracking-normal text-gray-900">
              {state.payrollMode.label}
            </h3>
            {state.payrollMode.description ? (
              <p className="mt-2 text-body-14-regular leading-[1.45] tracking-normal text-gray-500">
                {state.payrollMode.description}
              </p>
            ) : null}
            <Segment
              size="lg"
              className={cn(
                "mt-3 grid w-full rounded-[8px]",
                getSegmentGridClassName(state.payrollMode.options.length),
              )}
              options={state.payrollMode.options.map((option) => ({
                label: option.label,
                value: option.id,
              }))}
              value={payrollEffect}
              onChange={setPayrollEffect}
            />
          </section>
        ) : null}

        {editReasonField ? (
          <label className="mt-5 block">
            <span className="text-h-18-semibold tracking-normal text-gray-900">
              {editReasonField.label}
            </span>
            <Textarea
              aria-label={editReasonField.label}
              className="mt-3 h-[84px] w-full rounded-[8px] border-gray-200 bg-white py-4 text-h-18-regular tracking-normal text-gray-800"
              placeholder={editReasonField.placeholder}
              value={reasonText}
              onChange={(event) => setReasonText(event.target.value)}
            />
          </label>
        ) : null}

        {showEditTimeFields ? (
          <section className="mt-5">
            <h3 className="text-h-18-semibold tracking-normal text-gray-900">
              변경 예정 시간
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-4">
              {state.timeFields?.map((field) => (
                <label className="block" key={field.id}>
                  <span className="text-body-14-medium tracking-normal text-gray-900">
                    {field.label}
                  </span>
                  <Input
                    type="time"
                    aria-label={field.label}
                    value={timeValues[field.id] ?? toTimeInputValue(field.value)}
                    onChange={(event) =>
                      setTimeValues((currentValues) => ({
                        ...currentValues,
                        [field.id]: event.target.value,
                      }))
                    }
                    className="mt-2 flex h-11 w-full items-center rounded-[8px] border-gray-200 bg-white text-h-18-regular tracking-normal text-gray-800"
                  />
                </label>
              ))}
            </div>
          </section>
        ) : null}

        {showPayMode && state.payrollPayMode ? (
          <section className="mt-5">
            <h3 className="text-h-18-semibold tracking-normal text-gray-900">
              {state.payrollPayMode.label}
            </h3>
            {state.payrollPayMode.description ? (
              <p className="mt-2 text-body-14-regular leading-[1.45] tracking-normal text-gray-500">
                {state.payrollPayMode.description}
              </p>
            ) : null}
            <Segment
              size="lg"
              className={cn(
                "mt-3 grid w-full rounded-[8px]",
                getSegmentGridClassName(state.payrollPayMode.options.length),
              )}
              disabled={state.payrollPayMode.options.length < 2}
              options={state.payrollPayMode.options.map((option) => ({
                label: option.label,
                value: option.id,
              }))}
              value={payMode}
              onChange={setPayMode}
            />
          </section>
        ) : null}

        {showAmountField && state.amountField ? (
          <label className="mt-5 block">
            <span className="text-h-18-semibold tracking-normal text-gray-900">
              {state.amountField.label}
            </span>
            <Input
              aria-label={state.amountField.label}
              className="mt-3 flex h-11 w-full items-center rounded-[8px] border-gray-200 bg-white text-h-18-regular tracking-normal text-gray-800"
              inputMode="numeric"
              placeholder={state.amountField.placeholder}
              value={amountText}
              onChange={(event) => setAmountText(event.target.value)}
            />
          </label>
        ) : null}

        {dialogError ? (
          <p className="mt-4 rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-h-16-medium text-red-500">
            {dialogError}
          </p>
        ) : null}

        <DialogFooter className="-mx-0 -mb-0 mt-7 flex-row justify-end gap-3 rounded-none border-0 bg-transparent p-0">
          <button
            type="button"
            disabled={actionSaving}
            className="h-11 rounded-[8px] border border-gray-200 bg-white px-6 text-h-18-semibold tracking-normal text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200 disabled:cursor-not-allowed disabled:text-gray-400"
            onClick={onClose}
          >
            취소
          </button>
          <button
            type="button"
            disabled={actionSaving}
            className="h-11 rounded-[8px] bg-green-400 px-6 text-h-18-semibold tracking-normal text-white transition-colors hover:bg-green-450 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 disabled:cursor-not-allowed disabled:bg-gray-300"
            onClick={() => {
              const amount = showAmountField ? parseMoneyInput(amountText) : null;
              const startTime = showEditTimeFields
                ? timeValues["check-in"]
                : input.startTime;
              const endTime = showEditTimeFields
                ? timeValues["check-out"]
                : input.endTime;
              const reason = editReasonField ? reasonText.trim() : input.reason;

              setDialogError("");
              if (editReasonField && !reason) {
                setDialogError("수정 사유를 입력해 주세요.");
                return;
              }

              if (
                showEditTimeFields &&
                (!isTimeInputValue(startTime) || !isTimeInputValue(endTime))
              ) {
                setDialogError("변경할 근무 시간을 입력해 주세요.");
                return;
              }

              if (showAmountField && (!amount || amount <= 0)) {
                setDialogError("고정 지급액을 입력해 주세요.");
                return;
              }

              void (async () => {
                try {
                  setSaveErrorMessage("");
                  await onConfirmRecordAction({
                    ...input,
                    amount,
                    endTime,
                    overtimePayMode: showPayMode ? (payMode as "fixed" | "hourly") : null,
                    payrollEffect: hasPayrollDecision
                      ? (payrollEffect as RecordMainActionInput["payrollEffect"])
                      : input.payrollEffect,
                    reason,
                    startTime,
                  });
                  onClose();
                } catch {
                  // Failure feedback is shown as a toast by the parent action.
                }
              })();
            }}
          >
            {actionSaving ? "저장 중" : "확인"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getRecordActionFromState(
  stateId: RecordDetailStateId,
  state?: RecordDetailState,
): RecordMainActionInput["action"] {
  if (state?.submitAction) {
    return state.submitAction;
  }

  if (stateId === "anomaly-step-4") {
    return "delete";
  }

  if (stateId === "anomaly-step-3") {
    return "edit";
  }

  return "mark-normal";
}

function getSegmentGridClassName(optionCount: number) {
  if (optionCount >= 3) {
    return "grid-cols-3";
  }

  if (optionCount === 1) {
    return "grid-cols-1";
  }

  return "grid-cols-2";
}

function getRecordActionConfirmTitle(action: RecordMainActionInput["action"]) {
  if (action === "approve-overtime") {
    return "추가근무 신청을 승인할까요?";
  }

  if (action === "approve-correction") {
    return "이의신청을 승인할까요?";
  }

  if (action === "reject-correction" || action === "reject-overtime") {
    return "반려할까요?";
  }

  if (action === "delete") {
    return "근무기록을 삭제할까요?";
  }

  if (action === "edit") {
    return "수정사항을 저장할까요?";
  }

  return "처리 내용을 저장할까요?";
}

function getRecordActionConfirmDescription(
  action: RecordMainActionInput["action"],
  hasPayrollDecision: boolean,
) {
  if (hasPayrollDecision) {
    return "급여 처리 방식을 선택한 뒤 저장합니다.";
  }

  if (action === "edit") {
    return "일반근무 시간 변경은 근무시간 기준 급여 산정에 반영됩니다.";
  }

  if (action === "delete") {
    return "삭제된 일반근무는 근무시간 기준 급여 산정에서 제외됩니다.";
  }

  if (action === "mark-normal") {
    return "근무기록은 변경하지 않고 이상 플래그만 닫습니다.";
  }

  return "입력한 내용으로 처리 상태를 저장합니다.";
}

function getRecordActionSavedMessage(action: RecordMainActionInput["action"]) {
  if (action === "approve-correction") {
    return "이의신청을 승인했습니다.";
  }

  if (action === "reject-correction") {
    return "이의신청을 반려했습니다.";
  }

  if (action === "approve-overtime") {
    return "추가근무 신청을 승인했습니다.";
  }

  if (action === "reject-overtime") {
    return "추가근무 신청을 반려했습니다.";
  }

  if (action === "delete") {
    return "근무기록 삭제 처리를 적용했습니다.";
  }

  if (action === "edit") {
    return "근무기록 수정 내용을 적용했습니다.";
  }

  return "처리 내용을 적용했습니다.";
}
