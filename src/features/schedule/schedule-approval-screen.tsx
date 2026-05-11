"use client";

import { useState, type CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconChevronLeft, IconNotice } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  scheduleApprovalRequests,
  scheduleApprovalSummary,
  scheduleTimelineDays,
  scheduleTimelineTimeSlots,
  type ScheduleApprovalRequestDetail,
  type ScheduleApprovalRequestRow,
  type ScheduleTimelineBlock,
} from "./schedule-fixtures";
import { TimelineBlockText, TimelineGridFrame } from "./timeline-grid-frame";

const visibleTimelineDays = scheduleTimelineDays.slice(0, 5);
const timelineStartHour = Number(scheduleTimelineTimeSlots[0]);
const timelineColumnCount = scheduleTimelineTimeSlots.length;
const activeBadgeStyle = { color: "var(--color-green-400)" };

export function ScheduleApprovalScreen() {
  const [selectedRequestId, setSelectedRequestId] = useState<string>();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const selectedRequest = scheduleApprovalRequests.find(
    (request) => request.id === selectedRequestId,
  );

  if (selectedRequest) {
    return (
      <SelectedApprovalState
        request={selectedRequest}
        rejectDialogOpen={rejectDialogOpen}
        onBack={() => {
          setSelectedRequestId(undefined);
          setRejectDialogOpen(false);
        }}
        onCloseRejectDialog={() => setRejectDialogOpen(false)}
        onOpenRejectDialog={() => setRejectDialogOpen(true)}
      />
    );
  }

  return (
    <ApprovalWaitingList
      rows={scheduleApprovalRequests}
      onSelectRegisteredRequest={() =>
        setSelectedRequestId(scheduleApprovalSummary.selectedRequestId)
      }
    />
  );
}

function ApprovalWaitingList({
  rows,
  onSelectRegisteredRequest,
}: {
  rows: readonly ScheduleApprovalRequestRow[];
  onSelectRegisteredRequest: () => void;
}) {
  return (
    <section
      aria-label="시간표 승인 대기"
      className="h-[calc(100vh-202px)] min-h-[760px] overflow-hidden rounded-[8px] bg-white"
      data-testid="schedule-approval-screen"
    >
      <div className="flex h-[70px] items-center gap-3 px-5">
        <h2 className="text-h-20 tracking-normal text-gray-900">
          승인 대기 목록
        </h2>
        <Badge variant="grey" size="M">
          {scheduleApprovalSummary.listCountText}
        </Badge>
      </div>

      <div className="grid h-[41px] grid-cols-[22%_22%_22%_1fr_114px] items-center border-b border-gray-300 px-5 text-h-18-regular tracking-normal text-gray-500">
        <div>조교</div>
        <div>유형</div>
        <div>제출일</div>
        <div>요약</div>
        <div aria-hidden="true" />
      </div>

      <div>
        {rows.map((row) => (
          <ApprovalWaitingRow
            key={row.id}
            row={row}
            onSelect={
              row.id === scheduleApprovalSummary.selectedRequestId
                ? onSelectRegisteredRequest
                : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}

function ApprovalWaitingRow({
  row,
  onSelect,
}: {
  row: ScheduleApprovalRequestRow;
  onSelect?: () => void;
}) {
  return (
    <div className="grid min-h-[61px] grid-cols-[22%_22%_22%_1fr_114px] items-center border-b border-gray-100 px-5 text-h-18-regular tracking-normal text-gray-900 last:border-b-0">
      <div className="min-w-0 truncate">{row.workerName}</div>
      <div>
        <RequestKindBadge row={row} />
      </div>
      <div className="min-w-0 truncate">{row.requestDate}</div>
      <div className="min-w-0 truncate">{row.reasonText}</div>
      <div className="flex justify-end">
        <button
          type="button"
          data-testid={
            row.id === scheduleApprovalSummary.selectedRequestId
              ? "schedule-approval-first-detail"
              : undefined
          }
          onClick={
            row.id === scheduleApprovalSummary.selectedRequestId
              ? onSelect
              : undefined
          }
          className="flex h-[42px] items-center justify-center rounded-full border border-gray-200 bg-white px-4 text-h-16-medium tracking-normal text-gray-800 transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
        >
          상세보기
        </button>
      </div>
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
  request,
  rejectDialogOpen,
  onBack,
  onCloseRejectDialog,
  onOpenRejectDialog,
}: {
  request: ScheduleApprovalRequestRow;
  rejectDialogOpen: boolean;
  onBack: () => void;
  onCloseRejectDialog: () => void;
  onOpenRejectDialog: () => void;
}) {
  const detail = request.selectedDetail;

  return (
    <section
      aria-label="시간표 승인 상세"
      className="fixed bottom-0 left-[300px] right-0 top-0 z-40 flex min-w-[880px] flex-col bg-gray-100"
      data-testid="schedule-approval-selected-state"
    >
      <header className="flex h-[92px] shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5">
        <button
          type="button"
          onClick={onBack}
          className="flex h-[42px] items-center gap-4 rounded-[8px] pr-4 text-h-20 tracking-normal text-gray-900 transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
        >
          <IconChevronLeft className="size-6 text-gray-800" />
          <span>목록</span>
        </button>
        <button
          type="button"
          aria-label="알림"
          className="flex size-10 items-center justify-center rounded-full text-gray-700 transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
        >
          <IconNotice className="size-6 [--notice-dot:var(--color-green-400)]" hasNotice />
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden px-5 py-7">
        <div className="flex h-full min-h-0 flex-col gap-7">
          <SelectedProfileHeader
            request={request}
            onOpenRejectDialog={onOpenRejectDialog}
          />

          <div className="grid min-h-0 flex-1 grid-cols-[minmax(780px,1fr)_360px] gap-5">
            <section className="min-h-0 overflow-hidden rounded-[8px] bg-white p-5">
              <ApprovalSummaryCards detail={detail} />
              <ApprovalTimelineGrid
                blocks={detail.timelineBlocks}
                selectedBlockId={detail.timelineBlocks[0]?.id}
              />
            </section>

            <TimeAdjustmentPanel detail={detail} />
          </div>
        </div>
      </main>

      {rejectDialogOpen ? (
        <RejectDialog detail={detail} onClose={onCloseRejectDialog} />
      ) : null}
    </section>
  );
}

function SelectedProfileHeader({
  request,
  onOpenRejectDialog,
}: {
  request: ScheduleApprovalRequestRow;
  onOpenRejectDialog: () => void;
}) {
  const detail = request.selectedDetail;

  return (
    <section className="flex min-h-[96px] shrink-0 items-center justify-between gap-6 rounded-[8px] border border-gray-300 bg-white px-5 py-4">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h2 className="text-h-20 tracking-normal text-gray-900">
            {detail.workerName}
          </h2>
          <Badge variant="grey" size="M">
            {detail.workerTag}
          </Badge>
          <Badge variant="green" size="M" style={activeBadgeStyle}>
            {detail.workerStatusText}
          </Badge>
        </div>
        <p className="mt-3 text-h-18-regular tracking-normal text-gray-800">
          {request.requestDate} {detail.submittedKindText}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Button
          type="button"
          variant="danger"
          data-testid="schedule-approval-reject-trigger"
          onClick={onOpenRejectDialog}
          className="h-[42px] rounded-full px-4 tracking-normal"
        >
          {scheduleApprovalSummary.rejectLabel}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-[42px] rounded-full px-4 tracking-normal"
        >
          {scheduleApprovalSummary.approveLabel}
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
    { label: "제출 유형", value: detail.submittedKindText },
    { label: "제출일", value: detail.submittedAt },
    { label: "제출 블록", value: detail.submittedBlockCountText },
    { label: "수정 반영", value: detail.correctionStatusText },
  ] as const;

  return (
    <div className="grid grid-cols-4 gap-4">
      {summaryCards.map((card) => (
        <section
          key={card.label}
          className="h-[118px] rounded-[8px] border border-gray-200 bg-white px-5 py-4"
        >
          <h3 className="text-h-18-semibold tracking-normal text-gray-800">
            {card.label}
          </h3>
          <p className="mt-5 text-[32px] font-semibold leading-[42px] tracking-normal text-green-400">
            {card.value}
          </p>
        </section>
      ))}
    </div>
  );
}

function ApprovalTimelineGrid({
  blocks,
  selectedBlockId,
}: {
  blocks: readonly ScheduleTimelineBlock[];
  selectedBlockId?: string;
}) {
  return (
    <TimelineGridFrame
      ariaLabel="승인 요청 주간 시간표"
      className="mt-5 max-h-[597px]"
      dayColumnWidth={48}
      days={visibleTimelineDays}
      headerHeight={47}
      minWidthClassName="min-w-[920px]"
      renderBlocks={(day) =>
        blocks
          .filter((block) => block.dayId === day.id)
          .map((block) => (
            <TimelineBlock
              key={block.id}
              block={block}
              selected={block.id === selectedBlockId}
            />
          ))
      }
      timeSlots={scheduleTimelineTimeSlots}
    />
  );
}

function TimelineBlock({
  block,
  selected,
}: {
  block: ScheduleTimelineBlock;
  selected: boolean;
}) {
  const style = getTimelineBlockStyle(block);

  return (
    <div
      aria-label={`${block.worker} ${block.label} ${block.time}`}
      className={cn(
        "absolute top-0 z-10 flex h-[54px] min-w-0 flex-col justify-center overflow-hidden rounded-[6px] border px-2.5 text-left shadow-[0_1px_2px_rgba(17,24,39,0.04)]",
        selected
          ? "border-green-400 bg-green-400 text-white"
          : "border-green-400 bg-green-100 text-gray-900",
      )}
      role="gridcell"
      style={style}
    >
      <TimelineBlockText
        selected={selected}
        subtitle={block.label}
        title={block.worker}
      />
    </div>
  );
}

function TimeAdjustmentPanel({
  detail,
}: {
  detail: ScheduleApprovalRequestDetail;
}) {
  return (
    <aside className="flex min-h-0 flex-col rounded-[8px] border border-gray-300 bg-white p-5">
      <h2 className="text-h-20 tracking-normal text-gray-900">시간 조정</h2>

      <section className="mt-6 rounded-[8px] border border-gray-100 px-4 py-4">
        <h3 className="text-h-18-semibold tracking-normal text-gray-900">
          {detail.adjustmentDutyName}
        </h3>
        <dl className="mt-4 space-y-4 text-h-18-regular tracking-normal text-gray-900">
          <InfoRow label="근무일" value={detail.adjustmentDayText} />
          <InfoRow label="장소" value={detail.adjustmentLocationName} />
          <InfoRow label="시간" value={detail.adjustmentTimeText} />
        </dl>
      </section>

      <label className="mt-6 block">
        <span className="text-h-18-semibold tracking-normal text-gray-900">
          시작 시간
        </span>
        <input
          readOnly
          value={detail.adjustmentStartTime}
          className="mt-3 h-[50px] w-full rounded-[8px] border border-gray-200 bg-gray-50 px-4 text-h-18-regular tracking-normal text-gray-400 outline-none"
        />
      </label>

      <label className="mt-6 block">
        <span className="text-h-18-semibold tracking-normal text-gray-900">
          종료 시간
        </span>
        <input
          readOnly
          value={detail.adjustmentEndTime}
          className="mt-3 h-[50px] w-full rounded-[8px] border border-gray-200 bg-gray-50 px-4 text-h-18-regular tracking-normal text-gray-400 outline-none"
        />
      </label>

      <div className="mt-auto flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          className="h-[50px] rounded-[8px] px-6 tracking-normal"
        >
          취소
        </Button>
        <Button
          type="button"
          className="h-[50px] rounded-[8px] px-6 tracking-normal"
        >
          시간 반영
        </Button>
      </div>
    </aside>
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
  onClose,
}: {
  detail: ScheduleApprovalRequestDetail;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-approval-reject-title"
        data-testid="schedule-approval-reject-dialog"
        className="flex h-[371px] w-[680px] flex-col rounded-[8px] bg-white p-10 shadow-[0px_16px_44px_rgba(17,24,39,0.18)]"
      >
        <h2
          id="schedule-approval-reject-title"
          className="text-h-20 tracking-normal text-gray-900"
        >
          {detail.rejectDialog.title}
        </h2>

        <label className="mt-10 block">
          <span className="text-h-18-semibold tracking-normal text-gray-900">
            {detail.rejectDialog.reasonLabel}
          </span>
          <textarea
            readOnly
            value=""
            placeholder={detail.rejectDialog.reasonPlaceholder}
            className="mt-3 h-[100px] w-full resize-none rounded-[8px] border border-gray-200 bg-gray-50 px-4 py-3 text-h-18-regular tracking-normal text-gray-900 outline-none placeholder:text-gray-400"
          />
        </label>

        <div className="mt-auto flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="h-[50px] rounded-[8px] px-6 tracking-normal"
          >
            취소
          </Button>
          <Button
            type="button"
            className="h-[50px] rounded-[8px] px-6 tracking-normal"
          >
            {detail.rejectDialog.confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}

function getTimelineBlockStyle(block: ScheduleTimelineBlock): CSSProperties {
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
    left: `calc(${(startColumn / timelineColumnCount) * 100}% + 2px)`,
    width: `calc(${((endColumn - startColumn) / timelineColumnCount) * 100}% - 4px)`,
  };
}

function normalizeHour(hour: number) {
  return hour < timelineStartHour ? hour + 24 : hour;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
