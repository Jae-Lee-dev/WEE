"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DetailStateHeader } from "@/shared/ui/detail-state-header";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { IconNotice } from "@/shared/ui/icons";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { cn } from "@/shared/lib/utils";
import {
  createScheduleApprovalDataSource,
  type ApproveScheduleRequestInput,
  type ScheduleApprovalDataSource,
  type ScheduleApprovalViewModel,
} from "../api/schedule-approval-data-source";
import {
  scheduleApprovalSummary,
  scheduleTimelineDays,
  scheduleTimelineTimeSlots,
  type ScheduleApprovalRequestDetail,
  type ScheduleApprovalRequestRow,
  type ScheduleTimelineBlock,
} from "../model/schedule-fixtures";
import {
  getTimelineRowHeight,
  TimelineBlockText,
  timelineDefaultBlockHeight,
  timelineDefaultLaneStride,
  timelineDefaultRowHeight,
  TimelineGridFrame,
} from "./timeline-grid-frame";
import {
  parseTimelineBlocks,
  type ParsedTimelineBlock,
} from "./timeline-block-parser";

const visibleTimelineDays = scheduleTimelineDays.slice(0, 5);
const timelineLaneHeight = timelineDefaultBlockHeight;
const timelineLaneStride = timelineDefaultLaneStride;
const activeBadgeStyle = { color: "var(--color-green-400)" };

export function ScheduleApprovalScreen({
  dataSource: dataSourceProp,
}: {
  dataSource?: ScheduleApprovalDataSource;
} = {}) {
  const fallbackDataSource = useMemo(() => createScheduleApprovalDataSource(), []);
  const dataSource = dataSourceProp ?? fallbackDataSource;
  const [viewModel, setViewModel] = useState<ScheduleApprovalViewModel>(
    dataSource.initialData ?? {
      approveLabel: scheduleApprovalSummary.approveLabel,
      listCountText: "0",
      rejectLabel: scheduleApprovalSummary.rejectLabel,
      rows: [],
      selectedRequestId: "",
    },
  );
  const [selectedRequestId, setSelectedRequestId] = useState<string>();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [loading, setLoading] = useState(!dataSource.initialData);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const selectedRequest = viewModel.rows.find(
    (request) => request.id === selectedRequestId,
  );

  useEffect(() => {
    let active = true;

    void dataSource
      .listApprovalRequests()
      .then((nextViewModel) => {
        if (!active) {
          return;
        }

        setViewModel(nextViewModel);
        setErrorMessage("");
        setLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setErrorMessage("시간표 승인 대기를 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource]);

  if (selectedRequest) {
    return (
      <SelectedApprovalState
        key={selectedRequest.id}
        approveLabel={viewModel.approveLabel}
        errorMessage={errorMessage}
        request={selectedRequest}
        rejectDialogOpen={rejectDialogOpen}
        rejectLabel={viewModel.rejectLabel}
        saving={saving}
        statusMessage={statusMessage}
        onBack={() => {
          setSelectedRequestId(undefined);
          setRejectDialogOpen(false);
          setErrorMessage("");
          setStatusMessage("");
        }}
        onApprove={(input) => {
          setSaving(true);
          setErrorMessage("");
          setStatusMessage("");

          void dataSource
            .approveRequest(input)
            .then((nextViewModel) => {
              setViewModel(nextViewModel);
              setSelectedRequestId(undefined);
              setRejectDialogOpen(false);
              setStatusMessage("시간표 요청을 승인했습니다.");
            })
            .catch(() => {
              setErrorMessage("시간표 요청을 승인하지 못했습니다.");
            })
            .finally(() => setSaving(false));
        }}
        onCloseRejectDialog={() => setRejectDialogOpen(false)}
        onOpenRejectDialog={() => setRejectDialogOpen(true)}
        onReject={(reason) => {
          setSaving(true);
          setErrorMessage("");
          setStatusMessage("");

          void dataSource
            .rejectRequest({
              reason,
              requestId: selectedRequest.id,
            })
            .then((nextViewModel) => {
              setViewModel(nextViewModel);
              setSelectedRequestId(undefined);
              setRejectDialogOpen(false);
              setStatusMessage("시간표 요청을 반려했습니다.");
            })
            .catch(() => {
              setErrorMessage("시간표 요청을 반려하지 못했습니다.");
            })
            .finally(() => setSaving(false));
        }}
      />
    );
  }

  return (
    <ApprovalWaitingList
      errorMessage={errorMessage}
      loading={loading}
      rows={viewModel.rows}
      summary={viewModel}
      onSelectRequest={setSelectedRequestId}
    />
  );
}

function ApprovalWaitingList({
  errorMessage,
  loading,
  rows,
  summary,
  onSelectRequest,
}: {
  errorMessage: string;
  loading: boolean;
  rows: readonly ScheduleApprovalRequestRow[];
  summary: ScheduleApprovalViewModel;
  onSelectRequest: (requestId: string) => void;
}) {
  return (
    <section
      aria-label="시간표 승인 대기"
      className="h-[calc(100vh-144px)] min-h-[520px] overflow-hidden rounded-[8px] bg-white"
      data-testid="schedule-approval-screen"
    >
      <div className="flex h-[56px] items-center gap-3 px-4">
        <h2 className="text-h-20 tracking-normal text-gray-900">
          승인 대기 목록
        </h2>
        <Badge variant="grey" size="M">
          {summary.listCountText}건
        </Badge>
      </div>

      <div className="grid h-9 grid-cols-[22%_22%_22%_1fr_114px] items-center border-b border-gray-300 px-4 text-h-18-regular tracking-normal text-gray-500">
        <div>조교</div>
        <div>유형</div>
        <div>제출일</div>
        <div>요약</div>
        <div aria-hidden="true" />
      </div>

      <div>
        {loading ? (
          <ApprovalWaitingState label="시간표 승인 대기를 불러오는 중입니다." />
        ) : errorMessage ? (
          <ApprovalWaitingState label={errorMessage} role="alert" />
        ) : rows.length > 0 ? (
          rows.map((row, index) => (
            <ApprovalWaitingRow
              key={row.id}
              first={index === 0}
              row={row}
              onSelect={() => onSelectRequest(row.id)}
            />
          ))
        ) : (
          <ApprovalWaitingState label="승인 대기 중인 시간표 요청이 없습니다." />
        )}
      </div>
    </section>
  );
}

function ApprovalWaitingRow({
  first,
  row,
  onSelect,
}: {
  first: boolean;
  row: ScheduleApprovalRequestRow;
  onSelect: () => void;
}) {
  return (
    <div className="grid min-h-11 grid-cols-[22%_22%_22%_1fr_114px] items-center border-b border-gray-100 px-4 text-h-18-regular tracking-normal text-gray-900 last:border-b-0">
      <div className="min-w-0 truncate">{row.workerName}</div>
      <div>
        <RequestKindBadge row={row} />
      </div>
      <div className="min-w-0 truncate">{row.requestDate}</div>
      <div className="min-w-0 truncate">{row.reasonText}</div>
      <div className="flex justify-end">
        <button
          type="button"
          data-testid={first ? "schedule-approval-first-detail" : undefined}
          data-request-id={row.id}
          onClick={onSelect}
          className="flex h-9 items-center justify-center rounded-full border border-gray-200 bg-white px-4 text-h-16-medium tracking-normal text-gray-800 transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
        >
          상세보기
        </button>
      </div>
    </div>
  );
}

function ApprovalWaitingState({
  label,
  role = "status",
}: {
  label: string;
  role?: "alert" | "status";
}) {
  return (
    <div
      className="flex h-40 items-center justify-center px-4 text-center text-h-18-regular tracking-normal text-gray-500"
      role={role}
    >
      {label}
    </div>
  );
}

function RequestKindBadge({ row }: { row: ScheduleApprovalRequestRow }) {
  return (
    <Badge
      variant={row.requestKind === "initial" ? "green" : "orange"}
      size="M"
      style={
        row.requestKind === "initial" ? activeBadgeStyle : undefined
      }
    >
      {row.requestKindText}
    </Badge>
  );
}

function SelectedApprovalState({
  approveLabel,
  errorMessage,
  onApprove,
  request,
  rejectDialogOpen,
  rejectLabel,
  saving,
  statusMessage,
  onBack,
  onCloseRejectDialog,
  onOpenRejectDialog,
  onReject,
}: {
  approveLabel: string;
  errorMessage: string;
  onApprove: (input: ApproveScheduleRequestInput) => void;
  request: ScheduleApprovalRequestRow;
  rejectDialogOpen: boolean;
  rejectLabel: string;
  saving: boolean;
  statusMessage: string;
  onBack: () => void;
  onCloseRejectDialog: () => void;
  onOpenRejectDialog: () => void;
  onReject: (reason: string) => void;
}) {
  const detail = request.selectedDetail;
  const requestedBlock = getRequestedDutyBlock(detail);
  const [selectedBlockId, setSelectedBlockId] = useState(requestedBlock?.id);
  const selectedBlock =
    detail.timelineBlocks.find((block) => block.id === selectedBlockId) ??
    requestedBlock;
  const [selectedStartTime, selectedEndTime] = getTimelineBlockTimeParts(
    selectedBlock,
    detail,
  );
  const [adjustmentStartTime, setAdjustmentStartTime] = useState(
    selectedStartTime,
  );
  const [adjustmentEndTime, setAdjustmentEndTime] = useState(
    selectedEndTime,
  );

  const slotEdit =
    selectedBlock?.sourceSlotIndex == null
      ? undefined
      : {
          endTime: adjustmentEndTime,
          sourceSlotIndex: selectedBlock.sourceSlotIndex,
          startTime: adjustmentStartTime,
        };
  const timeInvalid =
    !adjustmentStartTime ||
    !adjustmentEndTime ||
    adjustmentStartTime >= adjustmentEndTime;

  const handleSelectBlock = (blockId: string) => {
    const nextBlock = detail.timelineBlocks.find((block) => block.id === blockId);
    const [nextStartTime, nextEndTime] = getTimelineBlockTimeParts(
      nextBlock,
      detail,
    );

    setSelectedBlockId(blockId);
    setAdjustmentStartTime(nextStartTime);
    setAdjustmentEndTime(nextEndTime);
  };

  return (
    <section
      aria-label="시간표 승인 상세"
      className="fixed bottom-0 left-[var(--admin-sidebar-width)] right-0 top-0 z-40 flex min-w-[808px] flex-col bg-gray-100"
      data-testid="schedule-approval-selected-state"
    >
      <DetailStateHeader
        backLabel="승인 대기 목록"
        title="시간표 승인 상세"
        onBack={onBack}
        actions={
          <button
            type="button"
            aria-label="알림"
            className="flex size-10 items-center justify-center rounded-full text-gray-700 transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
          >
            <IconNotice
              className="size-6 [--notice-dot:var(--color-green-400)]"
              hasNotice
            />
          </button>
        }
      />

      <main className="min-h-0 flex-1 overflow-hidden px-4 py-5">
        <div className="flex h-full min-h-0 flex-col gap-4">
          <SelectedRequestHeader
            approveLabel={approveLabel}
            request={request}
            rejectLabel={rejectLabel}
            saving={saving}
            timeInvalid={timeInvalid}
            onApprove={() => {
              if (timeInvalid) {
                return;
              }

              onApprove({
                requestId: request.id,
                slotEdits: slotEdit ? [slotEdit] : [],
              });
            }}
            onOpenRejectDialog={onOpenRejectDialog}
          />

          {statusMessage || errorMessage ? (
            <div
              className={cn(
                "rounded-[8px] border px-4 py-2.5 text-body-14-medium",
                statusMessage
                  ? "border-green-100 bg-green-50 text-green-500"
                  : "border-red-100 bg-red-50 text-red-500",
              )}
              role={statusMessage ? "status" : "alert"}
            >
              {statusMessage || errorMessage}
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px] gap-4">
            <section className="flex min-h-0 min-w-0 flex-col gap-4">
              <ApprovalSummaryCards detail={detail} />
              <ApprovalTimelineGrid
                blocks={detail.timelineBlocks}
                selectedBlockId={selectedBlock?.id}
                onSelectBlock={handleSelectBlock}
              />
            </section>

            <TimeAdjustmentPanel
              detail={detail}
              endTime={adjustmentEndTime}
              saving={saving}
              startTime={adjustmentStartTime}
              timeInvalid={timeInvalid}
              onReset={() => {
                setAdjustmentStartTime(selectedStartTime);
                setAdjustmentEndTime(selectedEndTime);
              }}
              onConfirm={() => {
                if (timeInvalid) {
                  return;
                }

                onApprove({
                  requestId: request.id,
                  slotEdits: slotEdit ? [slotEdit] : [],
                });
              }}
              onUpdateEndTime={setAdjustmentEndTime}
              onUpdateStartTime={setAdjustmentStartTime}
              selectedBlock={selectedBlock}
            />
          </div>
        </div>
      </main>

      {rejectDialogOpen ? (
        <RejectDialog
          detail={detail}
          saving={saving}
          onClose={onCloseRejectDialog}
          onReject={onReject}
        />
      ) : null}
    </section>
  );
}

function SelectedRequestHeader({
  approveLabel,
  onApprove,
  request,
  rejectLabel,
  saving,
  timeInvalid,
  onOpenRejectDialog,
}: {
  approveLabel: string;
  onApprove: () => void;
  request: ScheduleApprovalRequestRow;
  rejectLabel: string;
  saving: boolean;
  timeInvalid: boolean;
  onOpenRejectDialog: () => void;
}) {
  const detail = request.selectedDetail;

  return (
    <section className="flex min-h-[56px] shrink-0 items-center justify-between gap-6 px-1">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h2 className="text-h-20 tracking-normal text-gray-900">
            {detail.adjustmentDutyName}
          </h2>
          <Badge
            variant={request.requestKind === "initial" ? "green" : "orange"}
            size="M"
            style={
              request.requestKind === "initial" ? activeBadgeStyle : undefined
            }
          >
            {detail.submittedKindText}
          </Badge>
          <Badge variant="grey" size="M">
            {detail.adjustmentTimeText}
          </Badge>
        </div>
        <p className="mt-2 text-h-18-regular tracking-normal text-gray-700">
          {detail.adjustmentDayText} · {detail.adjustmentLocationName} ·{" "}
          {request.requestDate} 제출
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Button
          type="button"
          variant="danger"
          data-testid="schedule-approval-reject-trigger"
          disabled={saving}
          onClick={onOpenRejectDialog}
          className="h-9 rounded-full px-4 tracking-normal"
        >
          {rejectLabel}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={saving || timeInvalid}
          onClick={onApprove}
          className="h-9 rounded-full px-4 tracking-normal"
        >
          {saving ? "처리 중" : approveLabel}
        </Button>
      </div>
    </section>
  );
}

function ApprovalSummaryCards({
  detail,
}: {
  detail: ScheduleApprovalRequestDetail;
}) {
  const summaryCards = [
    { label: "요청 근무", value: detail.adjustmentDutyName },
    {
      label: "요청 시간",
      value: `${detail.adjustmentDayText} ${detail.adjustmentTimeText}`,
    },
    { label: "근무지", value: detail.adjustmentLocationName },
    {
      label: "제출 정보",
      value: `${detail.submittedKindText} · ${detail.submittedAt}`,
    },
  ] as const;

  return (
    <div className="grid shrink-0 grid-cols-4 gap-3">
      {summaryCards.map((card) => (
        <section
          key={card.label}
          className="flex min-h-[88px] flex-col justify-center rounded-[8px] bg-white px-4 py-3"
        >
          <h3 className="text-h-16-medium tracking-normal text-gray-600">
            {card.label}
          </h3>
          <p className="mt-2 truncate text-h-20 font-semibold tracking-normal text-green-400">
            {card.value}
          </p>
        </section>
      ))}
    </div>
  );
}

function ApprovalTimelineGrid({
  blocks,
  onSelectBlock,
  selectedBlockId,
}: {
  blocks: readonly ScheduleTimelineBlock[];
  onSelectBlock: (blockId: string) => void;
  selectedBlockId: string | undefined;
}) {
  const { dayLayouts } = parseTimelineBlocks({
    blocks,
    days: visibleTimelineDays,
    layout: {
      blockHeight: timelineLaneHeight,
      laneStride: timelineLaneStride,
      topOffset: 1,
      xInset: 2,
    },
    selectedBlockIds: selectedBlockId ? [selectedBlockId] : [],
    timeSlots: scheduleTimelineTimeSlots,
  });
  const rowHeightsByDayId = new Map(
    dayLayouts.map((layout) => [
      layout.day.id,
      getTimelineRowHeight({
        blockHeight: timelineLaneHeight,
        laneCount: layout.laneCount,
      }),
    ]),
  );

  return (
    <TimelineGridFrame
      ariaLabel="승인 요청 주간 시간표"
      className="min-h-0 flex-1"
      dayColumnWidth={48}
      days={visibleTimelineDays}
      getRowHeight={(day) =>
        rowHeightsByDayId.get(day.id) ?? timelineDefaultRowHeight
      }
      headerHeight={47}
      minWidthClassName="min-w-[920px]"
      renderBlocks={(day) => {
        const parsedBlocks =
          dayLayouts.find((layout) => layout.day.id === day.id)?.blocks ?? [];

        return parsedBlocks.map((parsedBlock) => (
          <TimelineBlock
            key={parsedBlock.block.id}
            onSelectBlock={onSelectBlock}
            parsedBlock={parsedBlock}
          />
        ));
      }}
      timeSlots={scheduleTimelineTimeSlots}
    />
  );
}

function getTimelineBlockTimeParts(
  block: ScheduleTimelineBlock | undefined,
  detail: ScheduleApprovalRequestDetail,
) {
  const [startTime = "", endTime = ""] = block?.time.split("~") ?? [];

  return [
    startTime || detail.adjustmentStartTime,
    endTime || detail.adjustmentEndTime,
  ] as const;
}

function getRequestedDutyBlock(detail: ScheduleApprovalRequestDetail) {
  const exactBlock = detail.timelineBlocks.find(
    (block) =>
      block.label === detail.adjustmentDutyName &&
      block.time === detail.adjustmentTimeText &&
      block.locationName === detail.adjustmentLocationName &&
      matchesAdjustmentDay(block.dayId, detail.adjustmentDayText),
  );
  const matchingBlock = detail.timelineBlocks.find(
    (block) =>
      block.label === detail.adjustmentDutyName &&
      block.time === detail.adjustmentTimeText &&
      block.locationName === detail.adjustmentLocationName,
  );

  return exactBlock ?? matchingBlock ?? detail.timelineBlocks[0];
}

function matchesAdjustmentDay(
  dayId: ScheduleTimelineBlock["dayId"],
  adjustmentDayText: string,
) {
  const day = scheduleTimelineDays.find((item) => item.id === dayId);

  if (!day) {
    return false;
  }

  return (
    adjustmentDayText === day.fullLabel ||
    adjustmentDayText === day.label ||
    adjustmentDayText === `${day.label}요일`
  );
}

function TimelineBlock({
  onSelectBlock,
  parsedBlock,
}: {
  onSelectBlock: (blockId: string) => void;
  parsedBlock: ParsedTimelineBlock;
}) {
  const { block, lane, selected, style } = parsedBlock;

  return (
    <button
      type="button"
      aria-label={`${block.label} ${block.time}`}
      aria-pressed={selected}
      className={cn(
        "absolute z-10 flex min-w-0 cursor-pointer flex-col justify-center overflow-hidden rounded-[6px] border px-1.5 py-1 text-left tracking-normal transition-colors duration-150 ease-out hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 focus-visible:ring-offset-1",
        selected
          ? "border-green-400 bg-green-400 text-white"
          : "border-green-400 bg-green-100 text-gray-900",
      )}
      data-lane={lane}
      data-schedule-block-id={block.id}
      data-schedule-approval-block-id={block.id}
      data-testid={
        selected ? "schedule-approval-selected-timeline-block" : undefined
      }
      onClick={() => onSelectBlock(block.id)}
      style={style}
    >
      <TimelineBlockText
        selected={selected}
        subtitle={block.time}
        title={block.label}
      />
    </button>
  );
}

function TimeAdjustmentPanel({
  detail,
  endTime,
  onConfirm,
  onReset,
  onUpdateEndTime,
  onUpdateStartTime,
  saving,
  startTime,
  selectedBlock,
  timeInvalid,
}: {
  detail: ScheduleApprovalRequestDetail;
  endTime: string;
  onConfirm: () => void;
  onReset: () => void;
  onUpdateEndTime: (value: string) => void;
  onUpdateStartTime: (value: string) => void;
  saving: boolean;
  startTime: string;
  selectedBlock: ScheduleTimelineBlock | undefined;
  timeInvalid: boolean;
}) {
  const selectedDayText = selectedBlock
    ? getTimelineDayFullLabel(selectedBlock.dayId)
    : detail.adjustmentDayText;

  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[8px] bg-white p-4">
      <h2 className="text-h-20 tracking-normal text-gray-900">시간 조정</h2>

      <section className="mt-5 rounded-[8px] bg-gray-50 px-4 py-4">
        <h3 className="text-h-18-semibold tracking-normal text-gray-900">
          {selectedBlock?.label ?? detail.adjustmentDutyName}
        </h3>
        <dl className="mt-4 space-y-4 text-h-18-regular tracking-normal text-gray-900">
          <InfoRow label="근무일" value={selectedDayText} />
          <InfoRow
            label="장소"
            value={selectedBlock?.locationName ?? detail.adjustmentLocationName}
          />
          <InfoRow label="시간" value={selectedBlock?.time ?? detail.adjustmentTimeText} />
        </dl>
      </section>

      <label className="mt-6 block">
        <span className="text-h-18-semibold tracking-normal text-gray-900">
          시작 시간
        </span>
        <Input
          type="time"
          value={startTime}
          disabled={saving}
          onChange={(event) => onUpdateStartTime(event.target.value)}
          className="mt-3 h-11 w-full rounded-[8px] border-gray-200 bg-gray-50 px-4 text-h-18-regular tracking-normal text-gray-900 disabled:text-gray-400"
        />
      </label>

      <label className="mt-6 block">
        <span className="text-h-18-semibold tracking-normal text-gray-900">
          종료 시간
        </span>
        <Input
          type="time"
          value={endTime}
          disabled={saving}
          onChange={(event) => onUpdateEndTime(event.target.value)}
          className="mt-3 h-11 w-full rounded-[8px] border-gray-200 bg-gray-50 px-4 text-h-18-regular tracking-normal text-gray-900 disabled:text-gray-400"
        />
      </label>

      {timeInvalid ? (
        <p className="mt-2 text-label-12-medium text-red-500">
          시작 시간과 종료 시간을 확인해 주세요.
        </p>
      ) : null}

      <div className="mt-auto flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={saving}
          onClick={onReset}
          className="h-11 rounded-[8px] px-6 tracking-normal"
        >
          취소
        </Button>
        <Button
          type="button"
          disabled={saving || timeInvalid}
          onClick={onConfirm}
          className="h-11 rounded-[8px] px-6 tracking-normal"
        >
          {saving ? "처리 중" : "시간 반영 승인"}
        </Button>
      </div>
    </aside>
  );
}

function getTimelineDayFullLabel(dayId: ScheduleTimelineBlock["dayId"]) {
  return (
    scheduleTimelineDays.find((day) => day.id === dayId)?.fullLabel ??
    "근무일 미지정"
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[58px_1fr] gap-3">
      <dt className="font-semibold text-gray-700">{label}</dt>
      <dd className="min-w-0 truncate text-gray-900">{value}</dd>
    </div>
  );
}

function RejectDialog({
  detail,
  onReject,
  onClose,
  saving,
}: {
  detail: ScheduleApprovalRequestDetail;
  onReject: (reason: string) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        data-testid="schedule-approval-reject-dialog"
        className="flex w-[calc(100vw-32px)] max-w-[620px] flex-col rounded-[8px] bg-white p-8 text-gray-900 shadow-[0px_16px_44px_rgba(17,24,39,0.18)] ring-0"
      >
        <DialogHeader className="gap-0">
          <DialogTitle className="text-h-20 tracking-normal text-gray-900">
            {detail.rejectDialog.title}
          </DialogTitle>
        </DialogHeader>

        <label className="mt-8 block">
          <span className="text-h-18-semibold tracking-normal text-gray-900">
            {detail.rejectDialog.reasonLabel}
          </span>
          <Textarea
            value={reason}
            disabled={saving}
            onChange={(event) => setReason(event.target.value)}
            placeholder={detail.rejectDialog.reasonPlaceholder}
            className="mt-3 h-[100px] min-h-0 w-full rounded-[8px] border-gray-200 bg-gray-50 text-h-18-regular tracking-normal text-gray-900 disabled:text-gray-500"
          />
        </label>

        <DialogFooter className="-mx-0 -mb-0 mt-auto flex-row justify-end gap-3 rounded-none border-0 bg-transparent p-0">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
            className="h-11 rounded-[8px] px-6 tracking-normal"
          >
            취소
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => onReject(reason.trim())}
            className="h-11 rounded-[8px] px-6 tracking-normal"
          >
            {saving ? "처리 중" : detail.rejectDialog.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
