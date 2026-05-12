"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  createRecordsDataSource,
  shouldUseRecordsFixtureDataSource,
  type RecordsDataSource,
} from "./records-data-source";
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
} from "./records-fixtures";

type PositionedRecordBlock = {
  block: RecordTimelineBlock;
  lane: number;
  startColumn: number;
  spanColumns: number;
  endColumn: number;
};

const timelineStartHour = Number(
  recordMainFixtureViewModel.timeline.hourLabels[0],
);
const timelineColumnCount = recordMainFixtureViewModel.timeline.hourLabels.length;
const timelineHeaderHeight = 45;
const timelineRowHeight = 110;
const timelineLaneHeight = 54;
const timelineLaneStride = 56;

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
}: {
  dataSource?: RecordsDataSource;
} = {}) {
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
  const [loading, setLoading] = useState(!fixtureMode);
  const [errorMessage, setErrorMessage] = useState("");
  const selectedState =
    viewModel.detailStates[selectedStateId] ?? viewModel.detailStates.empty;
  const selectedBlockId = findSelectedBlockId(selectedStateId, viewModel.blocks);
  const tallDetailState = selectedStateId === "anomaly-step-3";

  useEffect(() => {
    let active = true;

    void dataSource
      .getMainRecords()
      .then((nextViewModel) => {
        if (!active) {
          return;
        }

        setViewModel(nextViewModel);
        setSelectedStateId(nextViewModel.initialDetailStateId);
        setLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setViewModel(
          createEmptyRecordMainViewModel(["표시할 근무 기록이 없습니다."]),
        );
        setSelectedStateId("empty");
        setErrorMessage("근무 기록을 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource]);

  return (
    <section
      aria-label="근무기록"
      className="w-full tracking-normal"
      data-record-main-state={selectedStateId}
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

      <RecordToolbar timeline={viewModel.timeline} />

      <div
        className={cn(
          "mt-4 grid grid-cols-[minmax(760px,1fr)_340px] gap-4 overflow-hidden",
          tallDetailState
            ? "h-[640px] min-h-[640px]"
            : "h-[calc(100vh-192px)] min-h-[520px]",
        )}
      >
        <RecordTimelineGrid
          blocks={viewModel.blocks}
          onSelectState={setSelectedStateId}
          selectedBlockId={selectedBlockId}
          timeline={viewModel.timeline}
        />
        <RecordDetailPanel
          state={selectedState}
          onSelectState={setSelectedStateId}
        />
      </div>
    </section>
  );
}

function RecordToolbar({ timeline }: { timeline: RecordTimelineFixture }) {
  const { filters } = timeline;

  return (
    <div className="flex h-9 items-center justify-between gap-4">
      <div className="flex shrink-0 items-center gap-3">
        <RoundArrowButton direction="left" />
        <h2 className="text-h-20 tracking-normal text-gray-900">
          {timeline.weekLabel}
        </h2>
        <RoundArrowButton direction="right" />
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <FilterSelect
          label={filters.location[0]?.label ?? "조교 (전체)"}
          widthClassName="w-[128px]"
        />
        <FilterSelect
          label={filters.status[0]?.label ?? "상태 (전체)"}
          widthClassName="w-[128px]"
        />
        <RecordTypeChips options={filters.type} />
      </div>
    </div>
  );
}

function RoundArrowButton({ direction }: { direction: "left" | "right" }) {
  const Icon = direction === "left" ? IconChevronLeft : IconChevronRight;

  return (
    <button
      type="button"
      aria-label={direction === "left" ? "이전 주" : "다음 주"}
      className="flex size-5 items-center justify-center rounded-full bg-gray-600 text-white transition-colors duration-150 ease-out hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
    >
      <Icon className="size-4" />
    </button>
  );
}

function FilterSelect({
  label,
  widthClassName,
}: {
  label: string;
  widthClassName: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-10 items-center justify-between gap-2 rounded-[6px] border border-gray-200 bg-white px-3 text-h-18-regular tracking-normal text-gray-800 transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200",
        widthClassName,
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      <IconChevronDown className="size-5 shrink-0 text-gray-700" />
    </button>
  );
}

function RecordTypeChips({
  options,
}: {
  options: readonly RecordsFilterOption[];
}) {
  return (
    <div className="flex items-center gap-3">
      {options.map((option) => {
        const selected = option.selected;
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
  onSelectState,
  selectedBlockId,
  timeline,
}: {
  blocks: readonly RecordTimelineBlock[];
  onSelectState: (stateId: RecordDetailStateId) => void;
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
    <div className="min-w-0 overflow-hidden rounded-[8px] border border-gray-200 bg-white">
      <div
        aria-label="주간 근무기록"
        className="grid min-w-[860px] grid-cols-[46px_minmax(0,1fr)]"
        role="grid"
      >
        <div
          aria-hidden="true"
          className="border-b border-r border-gray-200 bg-white"
          style={{ height: timelineHeaderHeight }}
        />
        <div
          className="grid grid-cols-[repeat(17,minmax(0,1fr))] border-b border-gray-200"
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
                  "flex items-center justify-center border-r border-gray-200 bg-white px-1 text-h-18-semibold tracking-normal text-gray-800",
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
                    onSelectState={onSelectState}
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
  onSelectState,
  positionedBlock,
  selected,
}: {
  onSelectState: (stateId: RecordDetailStateId) => void;
  positionedBlock: PositionedRecordBlock;
  selected: boolean;
}) {
  const { block, lane } = positionedBlock;
  const selectedStateId = block.selectedStateId;
  const selectable = Boolean(selectedStateId);
  const style = getBlockStyle(positionedBlock);
  const selectedClassName =
    block.selectedStateId === "normal-selected"
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
        onClick={() => onSelectState(selectedStateId)}
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
  onSelectState,
  state,
}: {
  onSelectState: (stateId: RecordDetailStateId) => void;
  state: RecordDetailState;
}) {
  return (
    <aside
      className="flex min-h-0 min-w-0 flex-col rounded-[8px] border border-gray-200 bg-white px-4 py-4"
      data-testid="record-detail-panel"
    >
      {state.id === "empty" ? (
        <EmptyDetail state={state} />
      ) : (
        <SelectedDetail onSelectState={onSelectState} state={state} />
      )}
    </aside>
  );
}

function EmptyDetail({ state }: { state: RecordDetailState }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center text-h-18-regular tracking-normal text-gray-400">
      {(state.emptyText ?? []).map((line) => (
        <span key={line}>{line}</span>
      ))}
    </div>
  );
}

function SelectedDetail({
  onSelectState,
  state,
}: {
  onSelectState: (stateId: RecordDetailStateId) => void;
  state: RecordDetailState;
}) {
  const compactForm = state.id === "anomaly-step-3";

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 overflow-y-auto pr-0.5">
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
                readOnly
                aria-label={state.reasonField.label}
                className={cn(
                  "mt-3 w-full resize-none rounded-[8px] border border-gray-200 bg-white px-4 py-4 text-h-18-regular tracking-normal text-gray-500 outline-none",
                  compactForm ? "h-[76px]" : "h-[84px]",
                )}
                placeholder={state.reasonField.placeholder}
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
                  <div className="mt-3 flex h-11 items-center rounded-[8px] border border-gray-200 bg-white px-4 text-h-18-regular tracking-normal text-gray-800">
                    {field.value}
                  </div>
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
                    aria-pressed={option.active}
                    className={cn(
                      "rounded-[6px] text-h-18-semibold tracking-normal transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200",
                      option.active
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
        </div>
      </div>

      {state.confirmLabel ? (
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            className="flex h-11 min-w-[78px] items-center justify-center rounded-[10px] bg-green-400 px-4 text-h-18-semibold tracking-normal text-white transition-colors duration-150 ease-out hover:bg-green-450 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
          >
            {state.confirmLabel}
          </button>
        </div>
      ) : null}
    </>
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

function findSelectedBlockId(
  stateId: RecordDetailStateId,
  blocks: readonly RecordTimelineBlock[],
) {
  if (stateId === "empty") {
    return undefined;
  }

  const selectedStateId =
    stateId === "normal-selected" ? "normal-selected" : "anomaly-step-1";

  return blocks.find(
    (block) => block.selectedStateId === selectedStateId,
  )?.id;
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
    initialDetailStateId: "empty",
    timeline: {
      ...recordMainFixtureViewModel.timeline,
      emptyDetailText: emptyText,
    },
  };
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
