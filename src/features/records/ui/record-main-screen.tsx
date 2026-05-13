"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { IconChevronLeft, IconChevronRight } from "@/shared/ui/icons";
import { OptionSelect, type SelectOption } from "@/shared/ui/select";
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
  type RecordDetailState,
  type RecordDetailStateId,
  type RecordMainViewModel,
  type RecordTimelineBlock,
  type RecordTimelineFixture,
  type RecordsFilterOption,
  type RecordsTone,
} from "../model/records-fixtures";

type PositionedRecordBlock = {
  block: RecordTimelineBlock;
  lane: number;
  startColumn: number;
  spanColumns: number;
  endColumn: number;
};

type RecordMainScreenProps = {
  dataSource?: RecordsDataSource;
  initialFocusId?: string;
};

type RecordFilterState = {
  statusFilterId: string;
  typeFilterId: string;
  workerFilterId: string;
};

const timelineStartHour = Number(
  recordMainFixtureViewModel.timeline.hourLabels[0],
);
const timelineColumnCount = recordMainFixtureViewModel.timeline.hourLabels.length;
const timelineHeaderHeight = 45;
const timelineRowHeight = 110;
const timelineLaneHeight = 54;
const timelineLaneStride = 56;
const weekDayLabels = ["일", "월", "화", "수", "목", "금", "토"] as const;
const emptyFilterOptions: readonly RecordsFilterOption[] = [];

const blockToneClassNames: Record<RecordsTone, string> = {
  green: "border-green-400 bg-green-100 text-gray-900",
  orange: "border-orange-400 bg-orange-100 text-gray-900",
  pink: "border-red-500 bg-red-50 text-gray-900",
  blue: "border-blue-500 bg-blue-50 text-gray-900",
  grey: "border-gray-500 bg-gray-50 text-gray-900",
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

export function RecordMainScreen({
  dataSource: dataSourceProp,
  initialFocusId,
}: RecordMainScreenProps = {}) {
  const fixtureMode = shouldUseRecordsFixtureDataSource();
  const fallbackDataSource = useMemo(() => createRecordsDataSource(), []);
  const dataSource = dataSourceProp ?? fallbackDataSource;
  const [viewModel, setViewModel] = useState<RecordMainViewModel>(
    fixtureMode
      ? recordMainFixtureViewModel
      : createEmptyRecordMainViewModel(["근무 기록을 불러오는 중입니다."]),
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
  const [selectedWorkerFilterId, setSelectedWorkerFilterId] = useState("all");
  const [selectedStatusFilterId, setSelectedStatusFilterId] = useState("all");
  const [selectedTypeFilterId, setSelectedTypeFilterId] = useState("all");
  const [loading, setLoading] = useState(!fixtureMode);
  const [recordActionSaving, setRecordActionSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const activeWeekStartKey =
    selectedWeekStartKey ??
    viewModel.initialWeekStartKey ??
    viewModel.timeline.weekNavigation?.initialWeekStartKey ??
    null;
  const workerFilterOptions =
    viewModel.timeline.filters.location ?? emptyFilterOptions;
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
  const tallDetailState =
    Boolean(selectedVisibleBlockId) && selectedStateId === "anomaly-step-3";

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

    const nextBlock = selectDefaultBlockFromBlocks(nextVisibleBlocks);

    setSelectedBlockId(nextBlock?.id ?? null);
    setSelectedStateId(resolveBlockStateId(nextBlock));
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
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "근무기록 처리 내용을 저장하지 못했습니다.",
      );
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

        const selection = resolveInitialRecordSelection(
          nextViewModel,
          initialFocusId,
        );

        setViewModel(nextViewModel);
        setSelectedBlockId(selection.block?.id ?? null);
        setSelectedWeekStartKey(selection.weekStartKey);
        setSelectedStateId(selection.stateId);
        setLoading(false);
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
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource, initialFocusId]);

  return (
    <section
      aria-label="근무기록"
      className="w-full tracking-normal"
      data-record-main-state={selectedState.id}
      data-testid="record-main-screen"
    >
      {loading || errorMessage ? (
        <div
          className={cn(
            "mb-3 flex min-h-9 items-center rounded-[8px] border px-4 py-2.5 text-body-14-medium tracking-normal",
            errorMessage
              ? "border-red-100 bg-red-50 text-red-500"
              : "border-green-100 bg-green-50 text-green-500",
          )}
          role={errorMessage ? "alert" : "status"}
        >
          {errorMessage || "근무 기록을 불러오는 중입니다."}
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
        className={cn(
          "mt-4 grid min-h-0 grid-cols-[minmax(760px,1fr)_340px] gap-4 overflow-hidden",
          tallDetailState
            ? "h-[640px] min-h-[640px]"
            : "h-[calc(100vh-196px)] min-h-[520px]",
        )}
      >
        <RecordTimelineGrid
          blocks={visibleBlocks}
          onSelectBlock={handleSelectBlock}
          selectedBlockId={selectedVisibleBlockId}
          timeline={timeline}
        />
        <RecordDetailPanel
          actionSaving={recordActionSaving}
          onConfirmRecordAction={handleConfirmRecordAction}
          state={selectedState}
          onSelectState={setSelectedStateId}
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

        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(option.id)}
            className={cn(
              "flex h-9 items-center justify-center rounded-full border px-4 text-h-18-semibold tracking-normal transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200",
              selected
                ? "border-green-400 bg-green-400 text-white hover:border-green-450 hover:bg-green-450"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
            )}
            style={selected ? undefined : toneTextStyles[tone]}
          >
            {option.label}
          </button>
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
  const dayLayouts = timeline.dayLabels.map((day) => ({
    day,
    positionedBlocks: layoutBlocks(
      blocks.filter((block) => block.dayId === day.id),
    ),
  }));

  return (
    <div
      className="relative h-full min-h-0 min-w-0 overflow-auto overscroll-contain rounded-[8px] border border-gray-200 bg-white"
      data-testid="record-timeline-scroll"
    >
      <div
        aria-label="주간 근무기록"
        className="grid min-w-[860px] grid-cols-[46px_minmax(0,1fr)]"
        role="grid"
      >
        <div
          aria-hidden="true"
          className="sticky left-0 top-0 z-30 border-b border-r border-gray-200 bg-white"
          style={{ height: timelineHeaderHeight }}
        />
        <div
          className="sticky top-0 z-20 grid grid-cols-[repeat(17,minmax(0,1fr))] border-b border-gray-200 bg-white"
          style={{ height: timelineHeaderHeight }}
        >
          {timeline.hourLabels.map((slot, index) => (
            <div
              className={cn(
                "flex min-w-0 items-center justify-center border-r border-gray-100 px-1 text-detail-16-regular tracking-normal text-gray-500",
                index === timeline.hourLabels.length - 1 && "border-r-0",
              )}
              key={slot}
              role="columnheader"
            >
              <span className="truncate">{slot}</span>
            </div>
          ))}
        </div>

        {dayLayouts.map(({ day, positionedBlocks }, dayIndex) => {
          const isLastDay = dayIndex === dayLayouts.length - 1;

          return (
            <div className="contents" key={day.id}>
              <div
                className={cn(
                  "sticky left-0 z-10 flex items-center justify-center border-r border-gray-200 bg-white px-1 text-h-18-semibold tracking-normal text-gray-800",
                  !isLastDay && "border-b border-gray-100",
                )}
                role="rowheader"
                style={{ height: timelineRowHeight }}
              >
                {day.label}
              </div>
              <div
                className={cn(
                  "relative min-w-0 bg-white",
                  !isLastDay && "border-b border-gray-100",
                )}
                role="row"
                style={{ height: timelineRowHeight }}
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0 grid grid-cols-[repeat(17,minmax(0,1fr))]"
                >
                  {timeline.hourLabels.map((slot, index) => (
                    <div
                      className={cn(
                        "border-r border-gray-100",
                        index === timeline.hourLabels.length - 1 &&
                          "border-r-0",
                      )}
                      key={`${day.id}-${slot}`}
                    />
                  ))}
                </div>

                {positionedBlocks.map((positionedBlock) => (
                  <RecordTimelineBlockItem
                    key={positionedBlock.block.id}
                    onSelectBlock={onSelectBlock}
                    positionedBlock={positionedBlock}
                    selected={selectedBlockIds.has(positionedBlock.block.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecordTimelineBlockItem({
  onSelectBlock,
  positionedBlock,
  selected,
}: {
  onSelectBlock: (block: RecordTimelineBlock) => void;
  positionedBlock: PositionedRecordBlock;
  selected: boolean;
}) {
  const { block, lane } = positionedBlock;
  const selectedStateId = block.selectedStateId;
  const selectable = Boolean(selectedStateId);
  const style = getBlockStyle(positionedBlock);
  const selectedClassName =
    block.selectedStateId === "normal-selected" || block.kind === "normal"
      ? "border-green-400 bg-green-400 text-white"
      : "border-red-500 bg-red-500 text-white";
  const blockClassName = cn(
    "absolute z-10 flex min-w-0 flex-col justify-center overflow-hidden rounded-[6px] border px-2 text-left tracking-normal transition-colors duration-150 ease-out",
    selected
      ? selectedClassName
      : selectedStateId === "normal-selected"
        ? blockToneClassNames.grey
        : blockToneClassNames[block.tone],
    selectable &&
      "cursor-pointer hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 focus-visible:ring-offset-1",
  );
  const content = (
    <>
      <span className="truncate text-h-14-semibold tracking-normal">
        {block.workerName}
      </span>
      <span
        className={cn(
          "truncate text-h-14-regular tracking-normal",
          selected ? "text-white" : "text-gray-800",
        )}
      >
        {block.dutyName}
      </span>
    </>
  );

  if (selectable && selectedStateId) {
    return (
      <button
        type="button"
        aria-label={`${block.workerName} ${block.dutyName} ${block.startTime}~${block.endTime}`}
        aria-pressed={selected}
        className={blockClassName}
        data-record-block-id={block.id}
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
      role="gridcell"
      style={style}
    >
      {content}
    </div>
  );
}

function RecordDetailPanel({
  actionSaving,
  onConfirmRecordAction,
  onSelectState,
  state,
}: {
  actionSaving: boolean;
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
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center text-center text-h-18-regular tracking-normal text-gray-400">
      {(state.emptyText ?? []).map((line) => (
        <span key={line}>{line}</span>
      ))}
    </div>
  );
}

function SelectedDetail({
  actionSaving,
  onConfirmRecordAction,
  onSelectState,
  state,
}: {
  actionSaving: boolean;
  onConfirmRecordAction: (
    input: Omit<RecordMainActionInput, "recordId">,
  ) => Promise<void>;
  onSelectState: (stateId: RecordDetailStateId) => void;
  state: RecordDetailState;
}) {
  const compactForm = state.id === "anomaly-step-3";
  const [reason, setReason] = useState("");
  const [timeValues, setTimeValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (state.timeFields ?? []).map((field) => [
        field.id,
        toTimeInputValue(field.value),
      ]),
    ),
  );
  const [payrollModeId, setPayrollModeId] = useState(
    state.payrollMode?.options.find((option) => option.active)?.id ??
      state.payrollMode?.options[0]?.id ??
      "",
  );
  const [savedMessage, setSavedMessage] = useState("");
  const [saveErrorMessage, setSaveErrorMessage] = useState("");

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

          {state.lines ? (
            <div className="mt-7">
              {state.lines.map((line) => (
                <div
                  className="flex h-14 items-center justify-between border-b border-gray-200 text-h-18-regular tracking-normal last:border-b-0"
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

          {state.reasonField ? (
            <label className={cn("block", compactForm ? "mt-4" : "mt-5")}>
              <span className="text-h-18-semibold tracking-normal text-gray-900">
                {state.reasonField.label}
              </span>
              <textarea
                aria-label={state.reasonField.label}
                className={cn(
                  "mt-3 w-full resize-none rounded-[8px] border border-gray-200 bg-white px-4 py-4 text-h-18-regular tracking-normal text-gray-800 outline-none focus-visible:ring-2 focus-visible:ring-green-200",
                  compactForm ? "h-[76px]" : "h-[84px]",
                )}
                placeholder={state.reasonField.placeholder}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          ) : null}

          {state.timeFields ? (
            <div className={cn("grid grid-cols-2 gap-4", compactForm ? "mt-4" : "mt-5")}>
              {state.timeFields.map((field) => (
                <label className="block" key={field.id}>
                  <span className="text-h-18-semibold tracking-normal text-gray-900">
                    {field.label}
                  </span>
                  <input
                    type="time"
                    aria-label={field.label}
                    value={timeValues[field.id] ?? toTimeInputValue(field.value)}
                    onChange={(event) =>
                      setTimeValues((currentValues) => ({
                        ...currentValues,
                        [field.id]: event.target.value,
                      }))
                    }
                    className="mt-3 flex h-11 w-full items-center rounded-[8px] border border-gray-200 bg-white px-4 text-h-18-regular tracking-normal text-gray-800 outline-none focus-visible:ring-2 focus-visible:ring-green-200"
                  />
                </label>
              ))}
            </div>
          ) : null}

          {state.payrollMode ? (
            <div className={compactForm ? "mt-4" : "mt-5"}>
              <h3 className="text-h-18-semibold tracking-normal text-gray-900">
                {state.payrollMode.label}
              </h3>
              <div className="mt-3 grid h-[58px] grid-cols-2 rounded-[8px] border border-gray-200 bg-white p-1">
                {state.payrollMode.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={payrollModeId === option.id}
                    onClick={() => setPayrollModeId(option.id)}
                    className={cn(
                      "rounded-[6px] text-h-18-semibold tracking-normal transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200",
                      payrollModeId === option.id
                        ? "bg-green-400 text-white"
                        : "text-gray-800 hover:bg-gray-50",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {savedMessage ? (
            <p className="mt-4 rounded-[8px] border border-green-100 bg-green-50 px-4 py-3 text-h-16-medium text-green-500">
              {savedMessage}
            </p>
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
              void handleConfirmSelectedRecordAction({
                endTime: timeValues["check-out"],
                onConfirmRecordAction,
                payrollModeId,
                reason,
                setSaveErrorMessage,
                setSavedMessage,
                startTime: timeValues["check-in"],
                state,
              });
            }}
            className="flex h-11 min-w-[78px] items-center justify-center rounded-[10px] bg-green-400 px-4 text-h-18-semibold tracking-normal text-white transition-colors duration-150 ease-out hover:bg-green-450 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {actionSaving ? "저장 중" : state.confirmLabel}
          </button>
        </div>
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
  onSelectState,
}: {
  action: RecordDetailAction;
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
          onSelectState("anomaly-step-3");
        }

        if (action.id === "delete") {
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

async function handleConfirmSelectedRecordAction({
  endTime,
  onConfirmRecordAction,
  payrollModeId,
  reason,
  setSaveErrorMessage,
  setSavedMessage,
  startTime,
  state,
}: {
  endTime?: string;
  onConfirmRecordAction: (
    input: Omit<RecordMainActionInput, "recordId">,
  ) => Promise<void>;
  payrollModeId: string;
  reason: string;
  setSaveErrorMessage: (message: string) => void;
  setSavedMessage: (message: string) => void;
  startTime?: string;
  state: RecordDetailState;
}) {
  const action = getRecordActionFromState(state.id);

  setSavedMessage("");
  setSaveErrorMessage("");

  try {
    await onConfirmRecordAction({
      action,
      endTime,
      payrollEffect: payrollModeId === "hold" ? "hold" : "immediate",
      reason,
      startTime,
    });
    setSavedMessage(getRecordActionSavedMessage(action));
  } catch {
    setSaveErrorMessage("근무기록 처리 내용을 저장하지 못했습니다.");
  }
}

function getRecordActionFromState(
  stateId: RecordDetailStateId,
): RecordMainActionInput["action"] {
  if (stateId === "anomaly-step-4") {
    return "delete";
  }

  if (stateId === "anomaly-step-3") {
    return "edit";
  }

  return "mark-normal";
}

function getRecordActionSavedMessage(action: RecordMainActionInput["action"]) {
  if (action === "delete") {
    return "근무기록 삭제 처리를 적용했습니다.";
  }

  if (action === "edit") {
    return "근무기록 수정 내용을 적용했습니다.";
  }

  return "처리 내용을 적용했습니다.";
}

function createEmptyRecordMainViewModel(
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

function createVisibleTimeline(
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

function getNavigatedWeekStartKey(
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

function resolveInitialRecordSelection(
  viewModel: RecordMainViewModel,
  focusId: string | undefined,
) {
  const focusedBlock = focusId
    ? selectBlockByFocusId(viewModel.blocks, focusId)
    : null;
  const initialBlock =
    focusedBlock ??
    (viewModel.initialBlockId
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

function selectDefaultBlockFromBlocks(blocks: readonly RecordTimelineBlock[]) {
  return (
    blocks.find((block) => block.selectedStateId === "anomaly-step-1") ??
    blocks.find((block) => block.selectedStateId) ??
    blocks[0] ??
    null
  );
}

function resolveBlockStateId(
  block: RecordTimelineBlock | null | undefined,
): RecordDetailStateId {
  return block ? block.selectedStateId ?? "normal-selected" : "empty";
}

function getFilteredBlocks(
  blocks: readonly RecordTimelineBlock[],
  filters: RecordFilterState,
  workerOptions: readonly RecordsFilterOption[],
) {
  return blocks.filter((block) =>
    matchesRecordFilters(block, filters, workerOptions),
  );
}

function matchesRecordFilters(
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

function matchesBlockKindFilter(
  block: RecordTimelineBlock,
  filterId: string,
) {
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

function isBlockInWeek(block: RecordTimelineBlock, weekStartKey: string) {
  const blockDate = block.dateKey ? parseDateKey(block.dateKey) : null;
  const weekStart = parseDateKey(weekStartKey);

  if (!blockDate || !weekStart) {
    return false;
  }

  const nextWeekStart = addDays(weekStart, 7);

  return blockDate >= weekStart && blockDate < nextWeekStart;
}

function getWeekStartKeyFromDateKey(dateKey: string) {
  const date = parseDateKey(dateKey);

  return date ? formatDateKey(startOfWeekSunday(date)) : null;
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

function layoutBlocks(
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

function getBlockStyle(positionedBlock: PositionedRecordBlock): CSSProperties {
  return {
    height: timelineLaneHeight,
    left: `calc(${(positionedBlock.startColumn / timelineColumnCount) * 100}% + 1px)`,
    top: 1 + positionedBlock.lane * timelineLaneStride,
    width: `calc(${(positionedBlock.spanColumns / timelineColumnCount) * 100}% - 2px)`,
  };
}

function normalizeHour(hour: number) {
  return hour === 0 ? 24 : hour;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
