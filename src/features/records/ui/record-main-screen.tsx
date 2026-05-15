"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type CSSProperties,
} from "react";
import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { FilterChip } from "@/shared/ui/filter-chip";
import { IconChevronLeft, IconChevronRight } from "@/shared/ui/icons";
import { Input } from "@/shared/ui/input";
import { OptionSelect, type SelectOption } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
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
  type RecordOvertimeCreateCandidate,
  type RecordTimelineBlock,
  type RecordTimelineFixture,
  type RecordsFilterOption,
  type RecordsTone,
} from "../model/records-fixtures";
import {
  createEmptyRecordMainViewModel,
  createVisibleTimeline,
  createWorkerFilterId,
  createWorkerFilterOptionsWithInitialWorker,
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
  resolveWorkerFilterId,
  selectDefaultBlockFromBlocks,
  type PositionedRecordBlock,
  type RecordFilterState,
} from "../model/record-main-view";

type RecordMainScreenProps = {
  dataSource?: RecordsDataSource;
  initialFocusId?: string;
  initialTypeFilterId?: string;
  initialWorkerIdFilter?: string;
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
  initialWorkerIdFilter,
  initialWorkerNameFilter,
}: RecordMainScreenProps = {}) {
  const fixtureMode = shouldUseRecordsFixtureDataSource();
  const fallbackDataSource = useMemo(() => createRecordsDataSource(), []);
  const dataSource = dataSourceProp ?? fallbackDataSource;
  const initialWorkerFilterId = createWorkerFilterId(
    initialWorkerIdFilter,
    initialWorkerNameFilter,
  );
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
  const [overtimeCreateSaving, setOvertimeCreateSaving] = useState(false);
  const [overtimeCreateCandidateId, setOvertimeCreateCandidateId] = useState<
    string | null
  >(null);
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
      createWorkerFilterOptionsWithInitialWorker(
        viewModel.timeline.filters.location ?? emptyRecordFilterOptions,
        {
          workerId: initialWorkerIdFilter,
          workerName: initialWorkerNameFilter,
        },
      ),
    [
      initialWorkerIdFilter,
      initialWorkerNameFilter,
      viewModel.timeline.filters.location,
    ],
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

  async function handleCreateOvertime(input: {
    endTime: string;
    reason: string;
    recordId: string;
    startTime: string;
  }) {
    setOvertimeCreateSaving(true);
    setErrorMessage("");

    try {
      await dataSource.createOvertimeWork(input);
      const nextViewModel = await dataSource.getMainRecords();
      const nextBlock =
        nextViewModel.blocks.find((block) => block.id === input.recordId) ??
        nextViewModel.blocks.find(
          (block) => block.id === nextViewModel.initialBlockId,
        ) ??
        null;

      setViewModel(nextViewModel);
      setSelectedBlockId(nextBlock?.id ?? null);
      setSelectedStateId(resolveBlockStateId(nextBlock));
      setSelectedWeekStartKey(
        nextBlock?.dateKey
          ? getWeekStartKeyFromDateKey(nextBlock.dateKey)
          : (nextViewModel.initialWeekStartKey ?? null),
      );
      setOvertimeCreateCandidateId(null);
      weeToast.compact({ title: "추가근무를 등록했습니다." });
    } catch (error) {
      weeToast.error({
        title: "등록 실패",
        description:
          error instanceof Error
            ? error.message
            : "추가근무를 등록하지 못했습니다.",
        testId: "wee-toast",
      });
      throw error;
    } finally {
      setOvertimeCreateSaving(false);
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

        const nextTypeFilterId = normalizeRecordTypeFilterId(initialTypeFilterId);
        const nextWorkerOptions = createWorkerFilterOptionsWithInitialWorker(
          nextViewModel.timeline.filters.location ?? emptyRecordFilterOptions,
          {
            workerId: initialWorkerIdFilter,
            workerName: initialWorkerNameFilter,
          },
        );
        const nextWorkerFilterId = resolveWorkerFilterId(nextWorkerOptions, {
          workerId: initialWorkerIdFilter,
          workerName: initialWorkerNameFilter,
        });
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
  }, [
    dataSource,
    initialFocusId,
    initialTypeFilterId,
    initialWorkerIdFilter,
    initialWorkerNameFilter,
  ]);

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
        onOpenOvertimeCreate={() =>
          setOvertimeCreateCandidateId(
            getDefaultOvertimeCandidateId(viewModel, selectedVisibleBlockId),
          )
        }
        onNavigateWeek={handleNavigateWeek}
        selectedStatusFilterId={selectedStatusFilterId}
        selectedTypeFilterId={selectedTypeFilterId}
        selectedWorkerFilterId={selectedWorkerFilterId}
        timeline={timeline}
        workerFilterOptions={workerFilterOptions}
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
      {overtimeCreateCandidateId !== null ? (
        <OvertimeCreateDialog
          candidates={viewModel.overtimeCreate.candidates}
          defaultCandidateId={overtimeCreateCandidateId}
          emptyText={viewModel.overtimeCreate.emptyText}
          onClose={() => setOvertimeCreateCandidateId(null)}
          onCreateOvertime={handleCreateOvertime}
          saving={overtimeCreateSaving}
        />
      ) : null}
    </section>
  );
}

function getDefaultOvertimeCandidateId(
  viewModel: RecordMainViewModel,
  selectedRecordId: string | undefined,
) {
  const selectedCandidate = selectedRecordId
    ? viewModel.overtimeCreate.candidates.find(
        (candidate) =>
          candidate.recordId === selectedRecordId && !candidate.disabledReason,
      )
    : null;

  return (
    selectedCandidate?.id ??
    viewModel.overtimeCreate.candidates.find(
      (candidate) => !candidate.disabledReason,
    )?.id ??
    viewModel.overtimeCreate.candidates[0]?.id ??
    ""
  );
}

function OvertimeCreateDialog({
  candidates,
  defaultCandidateId,
  emptyText,
  onClose,
  onCreateOvertime,
  saving,
}: {
  candidates: readonly RecordOvertimeCreateCandidate[];
  defaultCandidateId: string;
  emptyText: string;
  onClose: () => void;
  onCreateOvertime: (input: {
    endTime: string;
    reason: string;
    recordId: string;
    startTime: string;
  }) => Promise<void>;
  saving: boolean;
}) {
  const initialCandidate =
    candidates.find(
      (candidate) =>
        candidate.id === defaultCandidateId && !candidate.disabledReason,
    ) ??
    candidates.find((candidate) => !candidate.disabledReason) ??
    candidates[0] ??
    null;
  const [selectedWorkerId, setSelectedWorkerId] = useState(
    initialCandidate?.workerId ?? "",
  );
  const [selectedDateKey, setSelectedDateKey] = useState(
    initialCandidate?.dateKey ?? "",
  );
  const [selectedCandidateId, setSelectedCandidateId] = useState(
    initialCandidate?.id ?? "",
  );
  const [startTime, setStartTime] = useState(
    initialCandidate?.defaultStartTime ?? "",
  );
  const [endTime, setEndTime] = useState(initialCandidate?.defaultEndTime ?? "");
  const [reason, setReason] = useState("");
  const [dialogError, setDialogError] = useState("");
  const workerOptions = createOvertimeWorkerOptions(candidates);
  const workerCandidates = candidates.filter(
    (candidate) => candidate.workerId === selectedWorkerId,
  );
  const dateOptions = createOvertimeDateOptions(workerCandidates);
  const attendanceCandidates = workerCandidates.filter(
    (candidate) => candidate.dateKey === selectedDateKey,
  );
  const attendanceOptions = attendanceCandidates.map((candidate) => ({
    disabled: Boolean(candidate.disabledReason),
    label: candidate.disabledReason
      ? `${candidate.label} · ${candidate.disabledReason}`
      : candidate.label,
    value: candidate.id,
  }));
  const selectedCandidate =
    attendanceCandidates.find(
      (candidate) => candidate.id === selectedCandidateId,
    ) ??
    attendanceCandidates.find((candidate) => !candidate.disabledReason) ??
    attendanceCandidates[0] ??
    null;

  function applyCandidate(candidate: RecordOvertimeCreateCandidate | null) {
    setSelectedCandidateId(candidate?.id ?? "");
    setSelectedDateKey(candidate?.dateKey ?? "");
    setSelectedWorkerId(candidate?.workerId ?? "");
    setStartTime(candidate?.defaultStartTime ?? "");
    setEndTime(candidate?.defaultEndTime ?? "");
    setDialogError("");
  }

  function handleWorkerChange(workerId: string) {
    const nextCandidate =
      candidates.find(
        (candidate) =>
          candidate.workerId === workerId && !candidate.disabledReason,
      ) ?? candidates.find((candidate) => candidate.workerId === workerId) ?? null;

    applyCandidate(nextCandidate);
  }

  function handleDateChange(dateKey: string) {
    const nextCandidate =
      candidates.find(
        (candidate) =>
          candidate.workerId === selectedWorkerId &&
          candidate.dateKey === dateKey &&
          !candidate.disabledReason,
      ) ??
      candidates.find(
        (candidate) =>
          candidate.workerId === selectedWorkerId &&
          candidate.dateKey === dateKey,
      ) ??
      null;

    applyCandidate(nextCandidate);
  }

  function handleAttendanceChange(candidateId: string) {
    const nextCandidate =
      attendanceCandidates.find((candidate) => candidate.id === candidateId) ??
      null;

    applyCandidate(nextCandidate);
  }

  async function handleSubmit() {
    setDialogError("");

    if (!selectedCandidate || selectedCandidate.disabledReason) {
      setDialogError(selectedCandidate?.disabledReason ?? emptyText);
      return;
    }

    if (!isTimeInputValue(startTime) || !isTimeInputValue(endTime)) {
      setDialogError("추가근무 시작과 종료 시각을 입력해 주세요.");
      return;
    }

    if (startTime === endTime) {
      setDialogError("추가근무 종료 시각은 시작 시각과 달라야 합니다.");
      return;
    }

    if (!reason.trim()) {
      setDialogError("추가근무 사유를 입력해 주세요.");
      return;
    }

    try {
      await onCreateOvertime({
        endTime,
        reason: reason.trim(),
        recordId: selectedCandidate.recordId,
        startTime,
      });
    } catch (error) {
      setDialogError(
        error instanceof Error
          ? error.message
          : "추가근무를 등록하지 못했습니다.",
      );
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="record-overtime-create-dialog"
        className="w-[calc(100vw-32px)] max-w-[560px] rounded-[8px] bg-white p-8 text-gray-900 shadow-[0px_16px_44px_rgba(17,24,39,0.18)] ring-0"
      >
        <DialogHeader className="gap-3">
          <DialogTitle className="text-h-20 tracking-normal text-gray-900">
            추가근무 등록
          </DialogTitle>
          <DialogDescription className="text-body-16-regular leading-[24px] tracking-normal text-gray-600">
            조교의 출퇴근 기록에 연결할 추가근무 시간을 입력합니다.
          </DialogDescription>
        </DialogHeader>

        {candidates.length > 0 ? (
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-h-18-semibold tracking-normal text-gray-900">
                  조교
                </span>
                <OptionSelect
                  value={selectedWorkerId}
                  onValueChange={handleWorkerChange}
                  options={workerOptions}
                  triggerAriaLabel="조교 선택"
                  triggerClassName="mt-3 h-11 w-full rounded-[8px] border-gray-200 bg-white px-3 text-h-18-regular tracking-normal text-gray-800"
                  contentClassName="z-[70]"
                  itemClassName="text-h-16-medium tracking-normal"
                />
              </label>
              <label className="block">
                <span className="text-h-18-semibold tracking-normal text-gray-900">
                  날짜
                </span>
                <OptionSelect
                  value={selectedDateKey}
                  onValueChange={handleDateChange}
                  options={dateOptions}
                  triggerAriaLabel="근무 날짜"
                  triggerClassName="mt-3 h-11 w-full rounded-[8px] border-gray-200 bg-white px-3 text-h-18-regular tracking-normal text-gray-800"
                  contentClassName="z-[70]"
                  itemClassName="text-h-16-medium tracking-normal"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-h-18-semibold tracking-normal text-gray-900">
                출퇴근 기록
              </span>
              <OptionSelect
                value={selectedCandidateId}
                onValueChange={handleAttendanceChange}
                options={attendanceOptions}
                placeholder="출퇴근 기록 없음"
                triggerAriaLabel="출퇴근 기록"
                triggerClassName="mt-3 h-11 w-full rounded-[8px] border-gray-200 bg-white px-3 text-h-18-regular tracking-normal text-gray-800"
                contentClassName="z-[70]"
                itemClassName="text-h-16-medium tracking-normal"
              />
            </label>
          </div>
        ) : (
          <p className="mt-5 rounded-[8px] border border-gray-200 bg-gray-50 px-4 py-3 text-body-16-regular leading-[1.5] tracking-normal text-gray-600">
            {emptyText}
          </p>
        )}

        {selectedCandidate ? (
          <div
            className="mt-5 rounded-[8px] border border-gray-200 bg-gray-50 px-4 py-3"
            data-testid="record-overtime-create-attendance-summary"
          >
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-body-14-regular leading-[1.45] tracking-normal">
              <span className="text-gray-500">조교</span>
              <span className="text-right text-gray-900">
                {selectedCandidate.workerName}
              </span>
              <span className="text-gray-500">근무일</span>
              <span className="text-right text-gray-900">
                {selectedCandidate.dateLabel}
              </span>
              <span className="text-gray-500">출퇴근 기록</span>
              <span className="text-right text-gray-900">
                {selectedCandidate.attendanceLabel}
              </span>
            </div>
          </div>
        ) : null}

        <section className="mt-5">
          <h3 className="text-h-18-semibold tracking-normal text-gray-900">
            추가근무 시간
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-body-14-medium tracking-normal text-gray-900">
                시작
              </span>
              <Input
                type="time"
                aria-label="추가근무 시작"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="mt-2 flex h-11 w-full items-center rounded-[8px] border-gray-200 bg-white text-h-18-regular tracking-normal text-gray-800"
              />
            </label>
            <label className="block">
              <span className="text-body-14-medium tracking-normal text-gray-900">
                종료
              </span>
              <Input
                type="time"
                aria-label="추가근무 종료"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="mt-2 flex h-11 w-full items-center rounded-[8px] border-gray-200 bg-white text-h-18-regular tracking-normal text-gray-800"
              />
            </label>
          </div>
        </section>

        <label className="mt-5 block">
          <span className="text-h-18-semibold tracking-normal text-gray-900">
            사유
          </span>
          <Textarea
            aria-label="추가근무 사유"
            className="mt-3 h-[92px] w-full rounded-[8px] border-gray-200 bg-white py-4 text-h-18-regular tracking-normal text-gray-800"
            placeholder="예) 보강 수업 연장"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>

        {dialogError ? (
          <p className="mt-4 rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-h-16-medium text-red-500">
            {dialogError}
          </p>
        ) : null}

        <DialogFooter className="-mx-0 -mb-0 mt-7 flex-row justify-end gap-3 rounded-none border-0 bg-transparent p-0">
          <button
            type="button"
            disabled={saving}
            className="h-11 rounded-[8px] border border-gray-200 bg-white px-6 text-h-18-semibold tracking-normal text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200 disabled:cursor-not-allowed disabled:text-gray-400"
            onClick={onClose}
          >
            취소
          </button>
          <button
            type="button"
            disabled={saving || candidates.length === 0}
            className="h-11 rounded-[8px] bg-green-400 px-6 text-h-18-semibold tracking-normal text-white transition-colors hover:bg-green-450 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 disabled:cursor-not-allowed disabled:bg-gray-300"
            onClick={() => {
              void handleSubmit();
            }}
          >
            {saving ? "저장 중" : "등록"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function createOvertimeWorkerOptions(
  candidates: readonly RecordOvertimeCreateCandidate[],
): SelectOption[] {
  const optionsByWorkerId = new Map<string, SelectOption>();

  for (const candidate of candidates) {
    if (!optionsByWorkerId.has(candidate.workerId)) {
      optionsByWorkerId.set(candidate.workerId, {
        label: candidate.workerName,
        value: candidate.workerId,
      });
    }
  }

  return Array.from(optionsByWorkerId.values()).sort((first, second) =>
    String(first.label).localeCompare(String(second.label), "ko-KR"),
  );
}

function createOvertimeDateOptions(
  candidates: readonly RecordOvertimeCreateCandidate[],
): SelectOption[] {
  const optionsByDateKey = new Map<string, SelectOption>();

  for (const candidate of candidates) {
    if (!optionsByDateKey.has(candidate.dateKey)) {
      optionsByDateKey.set(candidate.dateKey, {
        label: candidate.dateLabel,
        value: candidate.dateKey,
      });
    }
  }

  return Array.from(optionsByDateKey.values()).sort((first, second) =>
    second.value.localeCompare(first.value),
  );
}

function isTimeInputValue(value: string | undefined) {
  return Boolean(value?.match(/^\d{2}:\d{2}$/));
}

function RecordToolbar({
  canGoNext,
  canGoPrevious,
  onStatusFilterChange,
  onTypeFilterChange,
  onWorkerFilterChange,
  onOpenOvertimeCreate,
  onNavigateWeek,
  selectedStatusFilterId,
  selectedTypeFilterId,
  selectedWorkerFilterId,
  timeline,
  workerFilterOptions,
}: {
  canGoNext: boolean;
  canGoPrevious: boolean;
  onStatusFilterChange: (filterId: string) => void;
  onTypeFilterChange: (filterId: string) => void;
  onWorkerFilterChange: (filterId: string) => void;
  onOpenOvertimeCreate: () => void;
  onNavigateWeek: (direction: -1 | 1) => void;
  selectedStatusFilterId: string;
  selectedTypeFilterId: string;
  selectedWorkerFilterId: string;
  timeline: RecordTimelineFixture;
  workerFilterOptions: readonly RecordsFilterOption[];
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
          options={workerFilterOptions}
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
        <Button
          type="button"
          variant="secondary"
          onClick={onOpenOvertimeCreate}
          className="ml-1 h-10 rounded-full px-4 font-normal tracking-normal"
        >
          <Plus className="size-5" strokeWidth={2.2} />
          추가근무 등록
        </Button>
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
