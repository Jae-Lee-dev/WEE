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
import { OptionSelect, type SelectOption } from "@/shared/ui/select";
import { useWeeErrorToast, useWeeToast } from "@/shared/ui/wee-toast";
import {
  getTimelineBlockHeight,
  getTimelineLaneTop,
  getTimelineLaneCount,
  getTimelineRowHeight,
  timelineDefaultRowHeight,
  TimelineGridFrame,
} from "@/shared/ui/timeline-grid-frame";
import { cn } from "@/shared/lib/utils";
import {
  getRecordActionSavedMessage,
  RecordActionDetailPanel,
} from "@/shared/ui/record-action-detail-panel";
import { RecordTimelineBlockCard } from "./record-timeline-block-card";
import {
  createRecordsDataSource,
  shouldUseRecordsFixtureDataSource,
  type RecordMainActionInput,
  type RecordsDataSource,
} from "../api/records-data-source";
import {
  recordMainFixtureViewModel,
  type RecordDetailStateId,
  type RecordMainViewModel,
  type RecordTimelineBlock,
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
  useWeeErrorToast(errorMessage);
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
        <RecordActionDetailPanel
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
  const style: CSSProperties = {
    ...getBlockStyle(positionedBlock),
    height: getTimelineBlockHeight({ laneCount }),
    top: getTimelineLaneTop({ lane, laneCount }),
  };

  return (
    <RecordTimelineBlockCard
      block={block}
      className="absolute z-10"
      lane={lane}
      onSelectBlock={onSelectBlock}
      selected={selected}
      style={style}
    />
  );
}
