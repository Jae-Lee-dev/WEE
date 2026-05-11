"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  Check,
  ChevronDown,
  LayoutGrid,
  List,
  Plus,
  Search,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  dutyCreateDialog,
  dutyEditBasicDialog,
  dutyEditTimeDialog,
  dutyListRows,
  dutyLocationOptions,
  selectedDutyDetailRouteId,
  dutyStatusFilterOptions,
  dutyTagFilterOptions,
  selectedDutyDetail,
  type DutyAssignedWorker,
  type DutyCreateDialogFixture,
  type DutyDialogField,
  type DutyDialogWeekdayOption,
  type DutyEditBasicDialogFixture,
  type DutyEditTimeDialogFixture,
  type DutyListRow,
  type DutyStatus,
  type DutyTag,
  type DutyTone,
  type DutyWeekday,
} from "./duty-fixtures";
import {
  scheduleTimelineDays,
  scheduleTimelineTimeSlots,
  type ScheduleTimelineDayId,
} from "./schedule-fixtures";
import {
  orderTimelineDaysSundayFirst,
  TimelineBlockText,
  TimelineGridFrame,
} from "./timeline-grid-frame";

type DialogState = "create" | "edit-basic" | "edit-time" | null;
type DutyViewMode = "timeline" | "list";

type BadgeToneConfig = {
  variant: "green" | "orange" | "red" | "blue" | "grey";
  style?: CSSProperties;
};

type DutyTimelineBlock = {
  duty: DutyListRow;
  dayId: ScheduleTimelineDayId;
  startHour: number;
  endHour: number;
};

type PositionedDutyTimelineBlock = DutyTimelineBlock & {
  lane: number;
  startColumn: number;
  spanColumns: number;
  endColumn: number;
};

const toneConfig: Record<DutyTone, BadgeToneConfig> = {
  green: {
    variant: "green",
    style: { color: "var(--color-green-400)" },
  },
  orange: {
    variant: "orange",
    style: { color: "var(--color-orange-400)" },
  },
  red: {
    variant: "red",
    style: { color: "var(--color-red-500)" },
  },
  blue: {
    variant: "blue",
    style: { color: "var(--color-blue-500)" },
  },
  grey: {
    variant: "grey",
  },
};

const selectedFixtureDutyId = selectedDutyDetail.duty.id;
const timelineStartHour = Number(scheduleTimelineTimeSlots[0]);
const timelineColumnCount = scheduleTimelineTimeSlots.length;
const timelineLaneHeight = 54;
const timelineLaneStride = 56;

const weekdayDayIdMap: Record<DutyWeekday, ScheduleTimelineDayId> = {
  월: "mon",
  화: "tue",
  수: "wed",
  목: "thu",
  금: "fri",
  토: "sat",
  일: "sun",
};

const dutyTimelineDays = orderTimelineDaysSundayFirst(scheduleTimelineDays);

const statusToneConfig: Record<DutyStatus, BadgeToneConfig> = {
  상시: {
    variant: "grey",
  },
  운영중: {
    variant: "green",
    style: { color: "var(--color-green-400)" },
  },
  예정: {
    variant: "blue",
    style: { color: "var(--color-blue-500)" },
  },
  만료: {
    variant: "red",
    style: { color: "var(--color-red-500)" },
  },
  비활성: {
    variant: "grey",
  },
};

export function DutyListScreen({
  initialSelectedDutyId,
}: {
  initialSelectedDutyId?: string;
} = {}) {
  const initialSelectedDuty =
    initialSelectedDutyId === selectedDutyDetailRouteId
      ? selectedFixtureDutyId
      : undefined;
  const [selectedDutyId, setSelectedDutyId] = useState<string | undefined>(
    initialSelectedDuty,
  );
  const [viewMode, setViewMode] = useState<DutyViewMode>("timeline");
  const [dialog, setDialog] = useState<DialogState>(null);
  const selectedDuty = dutyListRows.find((duty) => duty.id === selectedDutyId);
  const dutyTimelineRows = getTimelineEligibleDuties(dutyListRows);

  return (
    <section
      aria-label="근무 목록"
      className="flex h-[calc(100vh-202px)] min-h-[760px] w-full flex-col gap-5"
      data-duty-list-state={selectedDuty ? "selected" : "default"}
      data-testid="duty-list-screen"
    >
      <DutyToolbar
        onCreate={() => setDialog("create")}
        onViewModeChange={setViewMode}
        viewMode={viewMode}
      />

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px] gap-5 2xl:grid-cols-[minmax(0,1fr)_400px]">
        {viewMode === "timeline" ? (
          <DutyTimelineGrid
            onSelectDuty={(duty) => setSelectedDutyId(duty.id)}
            rows={dutyTimelineRows}
            selectedDutyId={selectedDutyId}
          />
        ) : (
          <DutyListTable
            onSelectDuty={(duty) => setSelectedDutyId(duty.id)}
            rows={dutyListRows}
            selectedDutyId={selectedDutyId}
          />
        )}
        <DutyDetailPanel
          selectedDuty={selectedDuty}
          onEditBasic={() => setDialog("edit-basic")}
          onEditTime={() => setDialog("edit-time")}
        />
      </div>

      {dialog === "create" ? (
        <CreateDutyDialog onClose={() => setDialog(null)} />
      ) : null}
      {dialog === "edit-basic" ? (
        <EditBasicDialog onClose={() => setDialog(null)} />
      ) : null}
      {dialog === "edit-time" ? (
        <EditTimeDialog onClose={() => setDialog(null)} />
      ) : null}
    </section>
  );
}

function DutyToolbar({
  onCreate,
  onViewModeChange,
  viewMode,
}: {
  onCreate: () => void;
  onViewModeChange: (mode: DutyViewMode) => void;
  viewMode: DutyViewMode;
}) {
  return (
    <div className="flex h-[42px] items-center justify-between gap-5">
      <div className="flex min-w-0 items-center gap-3">
        <FilterTrigger label={dutyLocationOptions[0].label} />
        <FilterTrigger label={dutyTagFilterOptions[0].label} />
        <FilterTrigger label={dutyStatusFilterOptions[0].label} />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <IconModeButton
          active={viewMode === "timeline"}
          label="타임라인 보기"
          onClick={() => onViewModeChange("timeline")}
        >
          <LayoutGrid className="size-6" strokeWidth={2.2} />
        </IconModeButton>
        <IconModeButton
          active={viewMode === "list"}
          label="목록 보기"
          onClick={() => onViewModeChange("list")}
        >
          <List className="size-6" strokeWidth={2.2} />
        </IconModeButton>
        <Button
          type="button"
          variant="secondary"
          onClick={onCreate}
          className="ml-2 h-[42px] gap-2 rounded-full px-4 font-normal tracking-normal"
        >
          <Plus className="size-5" strokeWidth={2.2} />
          근무 개설
        </Button>
      </div>
    </div>
  );
}

function FilterTrigger({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="flex h-10 min-w-[124px] items-center justify-between gap-3 rounded-[6px] border border-gray-200 bg-white px-2.5 text-h-18-regular tracking-normal text-gray-800 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] transition-colors duration-150 ease-out hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
    >
      <span className="min-w-0 truncate">{label}</span>
      <ChevronDown className="size-5 shrink-0 text-gray-700" strokeWidth={2} />
    </button>
  );
}

function IconModeButton({
  active = false,
  children,
  label,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex size-10 items-center justify-center rounded-[6px] border transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200",
        active
          ? "border-green-400 bg-green-400 text-white"
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50",
      )}
    >
      {children}
    </button>
  );
}

function DutyTimelineGrid({
  onSelectDuty,
  rows,
  selectedDutyId,
}: {
  onSelectDuty: (duty: DutyListRow) => void;
  rows: readonly DutyListRow[];
  selectedDutyId?: string;
}) {
  const blocks = buildDutyTimelineBlocks(rows);
  const dayLayouts = dutyTimelineDays.map((day) => ({
    day,
    blocks: layoutDutyTimelineBlocks(
      blocks.filter((block) => block.dayId === day.id),
    ),
  }));

  return (
    <TimelineGridFrame
      ariaLabel="Duty timeline"
      className="h-full"
      days={dutyTimelineDays}
      renderBlocks={(day) => {
        const dayBlocks =
          dayLayouts.find((layout) => layout.day.id === day.id)?.blocks ?? [];

        return dayBlocks.map((block) => (
          <DutyTimelineBlockButton
            block={block}
            key={block.duty.id}
            onSelect={() => onSelectDuty(block.duty)}
            selected={selectedDutyId === block.duty.id}
          />
        ));
      }}
      testId="duty-timeline-view"
      timeSlots={scheduleTimelineTimeSlots}
    />
  );
}

function DutyTimelineBlockButton({
  block,
  onSelect,
  selected,
}: {
  block: PositionedDutyTimelineBlock;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={`${block.duty.name} ${block.duty.location} ${block.duty.weekday} ${block.duty.time}`}
      aria-pressed={selected}
      className={cn(
        "absolute z-10 flex min-w-0 flex-col justify-center overflow-hidden rounded-[6px] border px-2 text-left tracking-normal transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 focus-visible:ring-offset-1",
        selected
          ? "border-green-400 bg-green-400 text-white"
          : getDutyTimelineToneClassName(block.duty.tone),
      )}
      data-testid={
        block.duty.id === selectedFixtureDutyId
          ? "duty-list-select-first"
          : undefined
      }
      onClick={onSelect}
      style={getDutyTimelineBlockStyle(block)}
    >
      <TimelineBlockText
        selected={selected}
        subtitle={block.duty.location}
        title={block.duty.name}
      />
    </button>
  );
}

function DutyListTable({
  onSelectDuty,
  rows,
  selectedDutyId,
}: {
  onSelectDuty: (duty: DutyListRow) => void;
  rows: readonly DutyListRow[];
  selectedDutyId?: string;
}) {
  return (
    <section
      aria-label="Duty list"
      className="min-h-0 overflow-hidden rounded-[8px] border border-gray-200 bg-white"
      data-testid="duty-list-table"
      role="table"
    >
      <div className="flex h-[70px] items-center gap-3 px-5">
        <h2 className="text-h-20 tracking-normal text-gray-900">근무 목록</h2>
        <span className="rounded-[4px] bg-gray-100 px-1.5 py-0.5 text-detail-16-regular tracking-normal text-gray-600">
          {rows.length}건
        </span>
      </div>

      <div
        className="grid h-[41px] grid-cols-[1.45fr_1fr_1.1fr_1.25fr_0.8fr_0.75fr] items-center border-b border-gray-300 px-5 text-h-18-regular tracking-normal text-gray-500"
        role="row"
      >
        <div role="columnheader">근무</div>
        <div role="columnheader">근무지</div>
        <div role="columnheader">요일·시간</div>
        <div role="columnheader">운영 기간</div>
        <div role="columnheader">배정</div>
        <div role="columnheader">상태</div>
      </div>

      <div role="rowgroup">
        {rows.map((row) => (
          <DutyListTableRow
            key={row.id}
            onSelect={() => onSelectDuty(row)}
            row={row}
            selected={selectedDutyId === row.id}
          />
        ))}
      </div>
    </section>
  );
}

function DutyListTableRow({
  onSelect,
  row,
  selected,
}: {
  onSelect: () => void;
  row: DutyListRow;
  selected: boolean;
}) {
  return (
    <button
      type="button"
      aria-selected={selected}
      className={cn(
        "grid min-h-[78px] w-full grid-cols-[1.45fr_1fr_1.1fr_1.25fr_0.8fr_0.75fr] items-center border-b border-gray-100 px-5 text-left text-h-18-regular tracking-normal text-gray-900 transition-colors duration-150 ease-out last:border-b-0 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200",
        selected && "bg-green-50 hover:bg-green-50",
      )}
      data-testid={
        row.id === selectedFixtureDutyId ? "duty-list-select-first" : undefined
      }
      onClick={onSelect}
      role="row"
    >
      <span className="flex min-w-0 flex-col gap-2" role="cell">
        <span className="min-w-0 truncate text-h-18-semibold tracking-normal text-gray-900">
          {row.name}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          {row.tags.map((tag) => (
            <DutyTagBadge key={tag.id} tag={tag} />
          ))}
        </span>
      </span>
      <span className="min-w-0 truncate" role="cell">
        {row.location}
      </span>
      <span className="flex min-w-0 flex-col gap-1" role="cell">
        <span className="min-w-0 truncate">{row.weekday}</span>
        <span className="min-w-0 truncate text-h-16-medium tracking-normal text-gray-500">
          {row.time}
        </span>
      </span>
      <span className="flex min-w-0 flex-col gap-1" role="cell">
        <span className="min-w-0 truncate">{row.operationPeriod}</span>
        <span className="min-w-0 truncate text-h-16-medium tracking-normal text-gray-500">
          {row.operationCountText}
        </span>
      </span>
      <span className="min-w-0 truncate" role="cell">
        {row.appliedWorkerCountText}
      </span>
      <span role="cell">
        <DutyStatusBadge status={row.status} />
      </span>
    </button>
  );
}

function DutyDetailPanel({
  selectedDuty,
  onEditBasic,
  onEditTime,
}: {
  selectedDuty?: DutyListRow;
  onEditBasic: () => void;
  onEditTime: () => void;
}) {
  if (!selectedDuty) {
    return (
      <aside className="flex h-full items-center justify-center rounded-[8px] border border-gray-200 bg-white">
        <p className="w-[210px] text-center text-label-18 tracking-normal text-gray-400">
          근무를 선택하면 근무 상세가 표시됩니다.
        </p>
      </aside>
    );
  }

  const detail =
    selectedDuty.id === selectedFixtureDutyId
      ? selectedDutyDetail
      : {
          duty: selectedDuty,
          basicInfo: {
            name: selectedDuty.name,
            location: selectedDuty.location,
            tags: selectedDuty.tags,
            weekday: selectedDuty.weekday,
            time: selectedDuty.time,
          },
          assignedWorkersTitle: "할당된 조교 (0명)",
          assignedWorkers: [],
          editBasicButtonLabel: selectedDutyDetail.editBasicButtonLabel,
          editTimeButtonLabel: selectedDutyDetail.editTimeButtonLabel,
        };

  return (
    <aside
      className="flex h-full flex-col rounded-[8px] border border-gray-200 bg-white p-5"
      data-testid="duty-detail-panel"
    >
      <h2 className="text-h-20 tracking-normal text-gray-900">
        {detail.basicInfo.name}
      </h2>

      <dl className="mt-5 grid grid-cols-[92px_minmax(0,1fr)] gap-y-4 tracking-normal">
        <dt className="text-h-18-semibold text-gray-500">근무지</dt>
        <dd className="min-w-0 truncate text-right text-label-18 text-gray-900">
          {detail.basicInfo.location}
        </dd>
        <dt className="text-h-18-semibold text-gray-500">태그</dt>
        <dd className="flex min-w-0 justify-end">
          {detail.basicInfo.tags[0] ? (
            <DutyTagBadge tag={detail.basicInfo.tags[0]} />
          ) : (
            <span className="text-label-18 text-gray-400">없음</span>
          )}
        </dd>
        <dt className="text-h-18-semibold text-gray-500">요일</dt>
        <dd className="min-w-0 truncate text-right text-label-18 text-gray-900">
          {detail.basicInfo.weekday}
        </dd>
        <dt className="text-h-18-semibold text-gray-500">시간</dt>
        <dd className="min-w-0 truncate text-right text-label-18 text-gray-900">
          {detail.basicInfo.time}
        </dd>
      </dl>

      <div className="mt-5 rounded-[10px] border border-gray-100 px-4 py-4">
        <h3 className="text-h-18-semibold tracking-normal text-gray-900">
          {detail.assignedWorkersTitle}
        </h3>
        <div className="mt-4 flex flex-col gap-3">
          {detail.assignedWorkers.length > 0 ? (
            detail.assignedWorkers.map((worker) => (
              <AssignedWorkerRow key={worker.id} worker={worker} />
            ))
          ) : (
            <p className="text-h-16-medium tracking-normal text-gray-500">
              아직 할당된 조교가 없습니다.
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onEditBasic}
          className="h-[41px] rounded-full px-4 text-label-18 font-medium tracking-normal"
        >
          {detail.editBasicButtonLabel}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onEditTime}
          className="h-[41px] rounded-full px-4 text-label-18 font-medium tracking-normal"
        >
          {detail.editTimeButtonLabel}
        </Button>
      </div>
    </aside>
  );
}

function AssignedWorkerRow({ worker }: { worker: DutyAssignedWorker }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-h-18-semibold tracking-normal">
      <span className="min-w-0 truncate text-gray-900">{worker.name}</span>
      <span className="shrink-0 text-h-18-regular tracking-normal text-gray-500">
        {worker.weekday} {worker.time}
      </span>
    </div>
  );
}

function DutyTagBadge({ tag }: { tag: DutyTag }) {
  const tone = toneConfig[tag.tone];

  return (
    <Badge variant={tone.variant} size="M" style={tone.style}>
      {tag.label}
    </Badge>
  );
}

function DutyStatusBadge({ status }: { status: DutyStatus }) {
  const tone = statusToneConfig[status];

  return (
    <Badge variant={tone.variant} size="M" style={tone.style}>
      {status}
    </Badge>
  );
}

function CreateDutyDialog({ onClose }: { onClose: () => void }) {
  const fixture = dutyCreateDialog;

  return (
    <DialogShell
      labelledBy="duty-list-create-dialog-title"
      testId="duty-list-create-dialog"
      className="mt-[153px] h-[775px] w-[684px] px-10 py-10"
    >
      <h2
        id="duty-list-create-dialog-title"
        className="text-h-20 tracking-normal text-gray-900"
      >
        {fixture.title}
      </h2>

      <div className="mt-10 flex flex-col gap-8">
        <DialogField field={fixture.nameField} />
        <DialogField field={fixture.tagSearchField} icon="search" />
        <DialogField field={fixture.locationField} icon="search" />
        <WeekdayPicker weekdays={fixture.weekdays} />
        <CreateTimeFields fixture={fixture} />
      </div>

      <DialogActions
        cancelLabel={fixture.cancelLabel}
        saveLabel={fixture.saveLabel}
        onClose={onClose}
      />
    </DialogShell>
  );
}

function EditBasicDialog({ onClose }: { onClose: () => void }) {
  const fixture = dutyEditBasicDialog;

  return (
    <DialogShell
      labelledBy="duty-list-edit-basic-dialog-title"
      testId="duty-list-edit-basic-dialog"
      className="mt-[260px] h-[561px] w-[682px] px-10 py-10"
    >
      <h2
        id="duty-list-edit-basic-dialog-title"
        className="text-h-20 tracking-normal text-gray-900"
      >
        {fixture.title}
      </h2>

      <div className="mt-10 flex flex-col gap-8">
        <DialogField field={fixture.nameField} />
        <EditBasicTagRow fixture={fixture} />
        <WeekdayPicker weekdays={fixture.weekdays} />
        <p className="-mt-5 text-h-16-medium tracking-normal text-gray-600">
          {fixture.timeChangeHint}
        </p>
      </div>

      <DialogActions
        cancelLabel={fixture.cancelLabel}
        saveLabel={fixture.saveLabel}
        onClose={onClose}
      />
    </DialogShell>
  );
}

function EditTimeDialog({ onClose }: { onClose: () => void }) {
  const fixture = dutyEditTimeDialog;

  return (
    <DialogShell
      labelledBy="duty-list-edit-time-dialog-title"
      testId="duty-list-edit-time-dialog"
      className="mt-[267px] h-[548px] w-[684px] px-10 py-10"
    >
      <h2
        id="duty-list-edit-time-dialog-title"
        className="text-h-20 tracking-normal text-gray-900"
      >
        {fixture.title}
      </h2>

      <div className="mt-10 grid grid-cols-2 gap-5">
        <DialogField field={fixture.startTimeField} />
        <DialogField field={fixture.endTimeField} />
      </div>

      <EditTimeWorkerList fixture={fixture} />

      <DialogActions
        cancelLabel={fixture.cancelLabel}
        saveLabel={fixture.saveLabel}
        onClose={onClose}
      />
    </DialogShell>
  );
}

function DialogShell({
  children,
  className,
  labelledBy,
  testId,
}: {
  children: ReactNode;
  className?: string;
  labelledBy: string;
  testId: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        data-testid={testId}
        className={cn(
          "flex flex-col rounded-[8px] bg-white shadow-[0px_16px_44px_rgba(17,24,39,0.18)]",
          className,
        )}
      >
        {children}
      </section>
    </div>
  );
}

function DialogField({
  field,
  icon,
}: {
  field: DutyDialogField;
  icon?: "search";
}) {
  return (
    <label className="block">
      <span className="text-h-18-semibold tracking-normal text-gray-900">
        {field.label}
        {field.required ? <span className="text-red-500"> *</span> : null}
      </span>
      <span className="mt-3 flex h-[49px] items-center gap-3 rounded-[8px] border border-gray-200 bg-gray-50 px-4">
        <input
          readOnly
          value={field.value ?? ""}
          placeholder={field.placeholder}
          className="min-w-0 flex-1 bg-transparent text-h-18-regular tracking-normal text-gray-900 outline-none placeholder:text-gray-400"
        />
        {icon === "search" ? (
          <Search className="size-6 shrink-0 text-green-400" strokeWidth={2.2} />
        ) : null}
      </span>
    </label>
  );
}

function WeekdayPicker({
  weekdays,
}: {
  weekdays: readonly DutyDialogWeekdayOption[];
}) {
  return (
    <div>
      <h3 className="text-h-18-semibold tracking-normal text-gray-900">요일</h3>
      <div className="mt-3 flex items-center gap-3">
        {weekdays.map((weekday) => (
          <button
            key={weekday.value}
            type="button"
            aria-pressed={weekday.selected}
            className={cn(
              "flex h-[49px] w-16 items-center justify-center rounded-[8px] border text-h-18-semibold tracking-normal transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200",
              weekday.selected
                ? "border-green-400 bg-green-400 text-white"
                : "border-gray-200 bg-white text-gray-900",
            )}
          >
            {weekday.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CreateTimeFields({
  fixture,
}: {
  fixture: DutyCreateDialogFixture;
}) {
  const timeRow = fixture.timeRows[0];

  return (
    <div className="grid grid-cols-2 gap-5">
      <TimeField label="시작 시간" value={timeRow.startTime} />
      <TimeField label="종료 시간" value={timeRow.endTime} />
    </div>
  );
}

function TimeField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-h-18-semibold tracking-normal text-gray-900">
        {label}
      </span>
      <input
        readOnly
        value={value}
        className="mt-3 h-[49px] w-full rounded-[8px] border border-gray-200 bg-gray-50 px-4 text-h-18-regular tracking-normal text-gray-400 outline-none"
      />
    </label>
  );
}

function EditBasicTagRow({
  fixture,
}: {
  fixture: DutyEditBasicDialogFixture;
}) {
  return (
    <div>
      <h3 className="text-h-18-semibold tracking-normal text-gray-900">
        근무자 태그
      </h3>
      <div className="mt-3 flex items-center gap-2">
        {fixture.tags.map((tag) => {
          const tone = toneConfig[tag.tone];

          return (
            <span
              key={tag.id}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-[4px] px-2 text-detail-16-semibold tracking-normal",
                tone.variant === "orange"
                  ? "bg-orange-100 text-orange-400"
                  : "bg-green-100 text-green-400",
              )}
              style={tone.style}
            >
              {tag.label}
              <X className="size-4" strokeWidth={2.4} />
            </span>
          );
        })}
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-gray-100 px-2 text-detail-16-semibold tracking-normal text-gray-600"
        >
          {fixture.addTagLabel}
          <Plus className="size-4" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}

function EditTimeWorkerList({
  fixture,
}: {
  fixture: DutyEditTimeDialogFixture;
}) {
  return (
    <div className="mt-9">
      <div className="flex h-[33px] items-start justify-between">
        <h3 className="text-h-18-semibold tracking-normal text-gray-900">
          조교 시간표 적용
        </h3>
        <Button
          type="button"
          variant="secondary"
          className="h-[33px] rounded-[4px] px-3 tracking-normal"
        >
          {fixture.applyScheduleLabel}
        </Button>
      </div>

      <div className="mt-3 overflow-hidden rounded-[8px] border border-gray-100">
        {fixture.assignedWorkers.map((worker) => (
          <div
            key={worker.id}
            className="flex h-[51px] items-center justify-between gap-4 border-b border-gray-100 px-4 last:border-b-0"
          >
            <div className="flex min-w-0 items-center gap-5">
              <span className="min-w-0 truncate text-h-18-semibold tracking-normal text-gray-900">
                {worker.name}
              </span>
              <span className="shrink-0 text-h-18-regular tracking-normal text-gray-500">
                {worker.weekday} {worker.time}
              </span>
            </div>
            <span
              aria-hidden="true"
              className="flex size-5 shrink-0 items-center justify-center rounded-[2px] bg-green-400 text-white"
            >
              <Check className="size-4" strokeWidth={2.6} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DialogActions({
  cancelLabel,
  saveLabel,
  onClose,
}: {
  cancelLabel: string;
  saveLabel: string;
  onClose: () => void;
}) {
  return (
    <div className="mt-auto flex justify-end gap-3">
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        className="h-[50px] rounded-[8px] px-6 tracking-normal"
      >
        {cancelLabel}
      </Button>
      <Button
        type="button"
        className="h-[50px] rounded-[8px] px-6 tracking-normal"
      >
        {saveLabel}
      </Button>
    </div>
  );
}

function getTimelineEligibleDuties(rows: readonly DutyListRow[]) {
  return rows.filter(
    (row) => row.status !== "만료" && row.status !== "비활성",
  );
}

function buildDutyTimelineBlocks(
  rows: readonly DutyListRow[],
): DutyTimelineBlock[] {
  return rows
    .map((duty) => {
      const timeRow = duty.timeRows[0];

      if (!timeRow) {
        return null;
      }

      return {
        duty,
        dayId: weekdayDayIdMap[timeRow.weekday],
        startHour: parseHour(timeRow.startTime),
        endHour: parseHour(timeRow.endTime),
      };
    })
    .filter((block): block is DutyTimelineBlock => block != null);
}

function layoutDutyTimelineBlocks(
  blocks: readonly DutyTimelineBlock[],
): PositionedDutyTimelineBlock[] {
  const laneEnds: number[] = [];

  return [...blocks]
    .sort((firstBlock, secondBlock) => {
      const firstRange = getDutyTimelineColumnRange(firstBlock);
      const secondRange = getDutyTimelineColumnRange(secondBlock);

      return (
        firstRange.startColumn - secondRange.startColumn ||
        firstRange.endColumn - secondRange.endColumn
      );
    })
    .map((block) => {
      const range = getDutyTimelineColumnRange(block);
      let lane = laneEnds.findIndex(
        (endColumn) => range.startColumn >= endColumn,
      );

      if (lane === -1) {
        lane = laneEnds.length;
      }

      laneEnds[lane] = range.endColumn;

      return {
        ...block,
        lane,
        ...range,
      };
    });
}

function getDutyTimelineColumnRange(block: DutyTimelineBlock) {
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

function getDutyTimelineBlockStyle({
  lane,
  spanColumns,
  startColumn,
}: PositionedDutyTimelineBlock): CSSProperties {
  return {
    height: timelineLaneHeight,
    left: `calc(${(startColumn / timelineColumnCount) * 100}% + 1px)`,
    top: 1 + lane * timelineLaneStride,
    width: `calc(${(spanColumns / timelineColumnCount) * 100}% - 2px)`,
  };
}

function getDutyTimelineToneClassName(tone: DutyTone) {
  switch (tone) {
    case "green":
      return "border-green-400 bg-green-100 text-gray-900";
    case "orange":
      return "border-orange-400 bg-orange-100 text-gray-900";
    case "red":
      return "border-red-500 bg-red-50 text-gray-900";
    case "blue":
      return "border-blue-500 bg-blue-50 text-gray-900";
    case "grey":
      return "border-gray-300 bg-gray-50 text-gray-900";
  }
}

function parseHour(time: string) {
  return Number(time.split(":")[0]);
}

function normalizeHour(hour: number) {
  return hour < timelineStartHour ? hour + 24 : hour;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
