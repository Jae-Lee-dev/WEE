"use client";

// TODO(refactor): When DUT-01 receives more interaction work, move the create,
// edit-basic, edit-time dialogs and the detail panel into feature-local UI
// files, and keep this screen focused on data loading, selection, and layout
// orchestration.
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Check,
  ChevronDown,
  LayoutGrid,
  List,
  Plus,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { OptionSelect, type SelectOption } from "@/shared/ui/select";
import {
  TagSearchPicker,
  type TagSearchPickerOption,
} from "@/shared/ui/tag-search-picker";
import { useWeeErrorToast } from "@/shared/ui/wee-toast";
import { cn } from "@/shared/lib/utils";
import {
  createDutyDataSource,
  type DutyDataSource,
} from "../api/duty-data-source";
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
  type DutyDialogField,
  type DutyDialogWeekdayOption,
  type DutyEditTimeDialogFixture,
  type DutyFilterOption,
  type DutyListRow,
  type DutyStatus,
  type DutyTag,
  type DutyTone,
  type DutyWeekday,
} from "../model/duty-fixtures";
import {
  buildDutyTimelineBlocks,
  createDutyFilterOptions,
  filterDuties,
  getDutyFilterLabel,
  getDutyTimelineBlockStyle,
  getTimelineEligibleDuties,
  initialDutyFilters,
  layoutDutyTimelineBlocks,
  shouldResetOperationEndDate,
  type DutyFilterKey,
  type DutyFilterState,
  type PositionedDutyTimelineBlock,
} from "../model/duty-list-view";
import {
  getDutyOperationCountText,
  getDutyFormErrors,
  hasDutyFormErrors,
  initialDutyForm,
  toCreateDutyInput,
  type CreateDutyInput,
  type DutyFormField,
  type DutyFormState,
  type DutyLocationOption,
  type UpdateDutyInput,
} from "../model/duty-model";
import {
  scheduleTimelineDays,
  scheduleTimelineTimeSlots,
} from "../model/schedule-fixtures";
import {
  getTimelineBlockHeight,
  getTimelineLaneTop,
  getTimelineLaneCount,
  getTimelineRowHeight,
  orderTimelineDaysSundayFirst,
  TimelineBlockText,
  timelineDefaultRowHeight,
  TimelineGridFrame,
} from "./timeline-grid-frame";

type DialogState = "create" | "edit-basic" | "edit-time" | null;
type DutyViewMode = "timeline" | "list";

type BadgeToneConfig = {
  variant: "green" | "orange" | "red" | "blue" | "grey";
  style?: CSSProperties;
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
  dataSource: dataSourceProp,
  initialSelectedDutyId,
}: {
  dataSource?: DutyDataSource;
  initialSelectedDutyId?: string;
} = {}) {
  const fixtureMode = initialSelectedDutyId === selectedDutyDetailRouteId;
  const fallbackDataSource = useMemo(() => createDutyDataSource(), []);
  const dataSource = dataSourceProp ?? fallbackDataSource;
  const initialSelectedDuty =
    fixtureMode ? selectedFixtureDutyId : initialSelectedDutyId;
  const [selectedDutyId, setSelectedDutyId] = useState<string | undefined>(
    initialSelectedDuty,
  );
  const [viewMode, setViewMode] = useState<DutyViewMode>("timeline");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [openFilter, setOpenFilter] = useState<DutyFilterKey | null>(null);
  const [selectedFilters, setSelectedFilters] =
    useState<DutyFilterState>(initialDutyFilters);
  const [duties, setDuties] = useState<readonly DutyListRow[]>(
    fixtureMode ? dutyListRows : [],
  );
  const [locations, setLocations] = useState<readonly DutyLocationOption[]>([]);
  const [loading, setLoading] = useState(!fixtureMode);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  useWeeErrorToast(errorMessage, { title: "요청 실패" });
  const selectedDuty = duties.find((duty) => duty.id === selectedDutyId);
  const filterOptions = useMemo(() => createDutyFilterOptions(duties), [duties]);
  const dutyTagPickerOptions = useMemo(
    () => createDutyTagPickerOptions(duties),
    [duties],
  );
  const filteredDuties = useMemo(
    () => filterDuties(duties, filterOptions, selectedFilters),
    [duties, filterOptions, selectedFilters],
  );
  const dutyTimelineRows = getTimelineEligibleDuties(filteredDuties);

  useEffect(() => {
    if (fixtureMode) {
      return;
    }

    let active = true;

    void Promise.all([dataSource.listDuties(), dataSource.listLocations()])
      .then(([nextDuties, nextLocations]) => {
        if (!active) {
          return;
        }

        setDuties(nextDuties);
        setLocations(nextLocations);
        setLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setErrorMessage("근무 목록을 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource, fixtureMode]);

  const handleCreateDuty = async (input: CreateDutyInput) => {
    setSaving(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const duty = await dataSource.createDuty(input);

      setDuties((current) => [duty, ...current]);
      setSelectedDutyId(duty.id);
      setStatusMessage(`${duty.name} 근무를 개설했습니다.`);
      setDialog(null);
    } catch {
      setErrorMessage("근무를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDuty = async (input: UpdateDutyInput) => {
    setSaving(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const duty = await dataSource.updateDuty(input);

      setDuties((current) =>
        current.map((item) => (item.id === duty.id ? duty : item)),
      );
      setSelectedDutyId(duty.id);
      setStatusMessage(`${duty.name} 근무를 수정했습니다.`);
      setDialog(null);
    } catch {
      setErrorMessage("근무를 수정하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectFilter = (filter: DutyFilterKey, value: string) => {
    const nextFilters = {
      ...selectedFilters,
      [filter]: value,
    };
    const nextRows = filterDuties(duties, filterOptions, nextFilters);

    setSelectedFilters(nextFilters);
    setOpenFilter(null);

    if (selectedDutyId && !nextRows.some((duty) => duty.id === selectedDutyId)) {
      setSelectedDutyId(nextRows[0]?.id);
    }
  };

  return (
    <section
      aria-label="근무 목록"
      className="flex h-[calc(100vh-144px)] w-full flex-col gap-4 overflow-hidden"
      data-duty-list-state={selectedDuty ? "selected" : "default"}
      data-testid="duty-list-screen"
    >
      {statusMessage ? (
        <div
          className="flex min-h-9 items-center rounded-[8px] border border-green-100 bg-green-50 px-4 py-2.5 text-body-14-medium tracking-normal text-green-500"
          role="status"
        >
          {statusMessage}
        </div>
      ) : null}

      <DutyToolbar
        createDisabled={!fixtureMode && loading}
        filterOptions={filterOptions}
        openFilter={openFilter}
        onCreate={() => {
          setStatusMessage("");
          setDialog("create");
        }}
        onFilterSelect={handleSelectFilter}
        onFilterToggle={(filter) =>
          setOpenFilter((currentFilter) =>
            currentFilter === filter ? null : filter,
          )
        }
        onViewModeChange={setViewMode}
        selectedFilters={selectedFilters}
        viewMode={viewMode}
      />

      {loading ? (
        <DutyContentState label="근무 목록을 불러오는 중입니다." />
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px] gap-4">
          {viewMode === "timeline" ? (
            <DutyTimelineGrid
              onSelectDuty={(duty) => setSelectedDutyId(duty.id)}
              rows={dutyTimelineRows}
              selectedDutyId={selectedDutyId}
            />
          ) : (
            <DutyListTable
              onSelectDuty={(duty) => setSelectedDutyId(duty.id)}
              rows={filteredDuties}
              selectedDutyId={selectedDutyId}
            />
          )}
          <DutyDetailPanel
            selectedDuty={selectedDuty}
            onEditBasic={() => setDialog("edit-basic")}
            onEditTime={() => setDialog("edit-time")}
          />
        </div>
      )}

      {dialog === "create" ? (
        <CreateDutyDialog
          locations={locations}
          onClose={() => {
            if (!saving) {
              setDialog(null);
            }
          }}
          onCreateDuty={handleCreateDuty}
          saving={saving}
          tagOptions={dutyTagPickerOptions}
        />
      ) : null}
      {dialog === "edit-basic" ? (
        <EditBasicDialog
          locations={locations}
          selectedDuty={selectedDuty}
          saving={saving}
          onClose={() => {
            if (!saving) {
              setDialog(null);
            }
          }}
          onUpdateDuty={handleUpdateDuty}
        />
      ) : null}
      {dialog === "edit-time" ? (
        <EditTimeDialog
          locations={locations}
          selectedDuty={selectedDuty}
          saving={saving}
          onClose={() => {
            if (!saving) {
              setDialog(null);
            }
          }}
          onUpdateDuty={handleUpdateDuty}
        />
      ) : null}
    </section>
  );
}

function DutyContentState({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-0 flex-1 items-center justify-center rounded-[8px] bg-white px-4 text-center text-h-18-regular tracking-normal text-gray-500"
      role="status"
    >
      {label}
    </div>
  );
}

function DutyToolbar({
  createDisabled,
  filterOptions,
  openFilter,
  onCreate,
  onFilterSelect,
  onFilterToggle,
  onViewModeChange,
  selectedFilters,
  viewMode,
}: {
  createDisabled?: boolean;
  filterOptions: Record<DutyFilterKey, readonly DutyFilterOption[]>;
  openFilter: DutyFilterKey | null;
  onCreate: () => void;
  onFilterSelect: (filter: DutyFilterKey, value: string) => void;
  onFilterToggle: (filter: DutyFilterKey) => void;
  onViewModeChange: (mode: DutyViewMode) => void;
  selectedFilters: DutyFilterState;
  viewMode: DutyViewMode;
}) {
  const controls = [
    {
      key: "location",
      label: getDutyFilterLabel(
        filterOptions.location,
        selectedFilters.location,
        dutyLocationOptions[0].label,
      ),
      menuLabel: "근무지 필터",
      options: filterOptions.location,
      testId: "duty-list-location-filter",
      widthClassName: "min-w-[124px]",
    },
    {
      key: "tag",
      label: getDutyFilterLabel(
        filterOptions.tag,
        selectedFilters.tag,
        dutyTagFilterOptions[0].label,
      ),
      menuLabel: "근무 태그 필터",
      options: filterOptions.tag,
      testId: "duty-list-tag-filter",
      widthClassName: "min-w-[148px]",
    },
    {
      key: "status",
      label: getDutyFilterLabel(
        filterOptions.status,
        selectedFilters.status,
        dutyStatusFilterOptions[0].label,
      ),
      menuLabel: "상태 필터",
      options: filterOptions.status,
      testId: "duty-list-status-filter",
      widthClassName: "min-w-[124px]",
    },
  ] as const satisfies readonly {
    key: DutyFilterKey;
    label: string;
    menuLabel: string;
    options: readonly DutyFilterOption[];
    testId: string;
    widthClassName: string;
  }[];

  return (
    <div className="flex min-h-10 items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {controls.map((control) => {
          const menuOpen = openFilter === control.key;

          return (
            <div className="relative" key={control.key}>
              <FilterTrigger
                ariaExpanded={menuOpen}
                label={control.label}
                onClick={() => onFilterToggle(control.key)}
                testId={control.testId}
                widthClassName={control.widthClassName}
              />
              {menuOpen ? (
                <DutyFilterMenu
                  label={control.menuLabel}
                  onOptionClick={(value) => onFilterSelect(control.key, value)}
                  options={control.options}
                  selectedValue={selectedFilters[control.key]}
                />
              ) : null}
            </div>
          );
        })}
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
          disabled={createDisabled}
          onClick={onCreate}
          className="ml-2 h-9 gap-2 rounded-full px-4 font-normal tracking-normal"
        >
          <Plus className="size-5" strokeWidth={2.2} />
          근무 개설
        </Button>
      </div>
    </div>
  );
}

function FilterTrigger({
  ariaExpanded,
  label,
  onClick,
  testId,
  widthClassName,
}: {
  ariaExpanded: boolean;
  label: string;
  onClick: () => void;
  testId: string;
  widthClassName: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={ariaExpanded}
      aria-haspopup="listbox"
      data-testid={testId}
      onClick={onClick}
      className={cn(
        "flex h-10 items-center justify-between gap-3 rounded-[6px] border border-gray-200 bg-white px-2.5 text-h-18-regular tracking-normal text-gray-800 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] transition-colors duration-150 ease-out hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200",
        widthClassName,
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      <ChevronDown className="size-5 shrink-0 text-gray-700" strokeWidth={2} />
    </button>
  );
}

function DutyFilterMenu({
  label,
  onOptionClick,
  options,
  selectedValue,
}: {
  label: string;
  onOptionClick: (value: string) => void;
  options: readonly DutyFilterOption[];
  selectedValue: string;
}) {
  return (
    <div
      role="listbox"
      aria-label={label}
      className="absolute left-0 top-12 z-30 w-[180px] overflow-hidden rounded-[4px] border border-gray-200 bg-white px-3 shadow-[0px_8px_20px_rgba(17,24,39,0.12)]"
    >
      {options.map((option) => {
        const selected = option.id === selectedValue;

        return (
          <button
            key={option.id}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onOptionClick(option.id)}
            className="flex h-11 w-full items-center justify-between gap-2 border-b border-gray-100 text-left text-h-18-regular text-gray-800 last:border-b-0 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200"
          >
            <span className="min-w-0 truncate">{option.label}</span>
            {selected ? <Check className="size-5 shrink-0 text-green-400" /> : null}
          </button>
        );
      })}
    </div>
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
  const dayLayouts = dutyTimelineDays.map((day) => {
    const dayBlocks = layoutDutyTimelineBlocks(
      blocks.filter((block) => block.dayId === day.id),
    );

    return {
      day,
      laneCount: getTimelineLaneCount(dayBlocks),
      blocks: dayBlocks,
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
      ariaLabel="Duty timeline"
      className="h-full"
      days={dutyTimelineDays}
      getRowHeight={(day) =>
        rowHeightsByDayId.get(day.id) ?? timelineDefaultRowHeight
      }
      renderBlocks={(day) => {
        const layout = dayLayouts.find((item) => item.day.id === day.id);

        return layout?.blocks.map((block) => (
          <DutyTimelineBlockButton
            block={block}
            key={block.duty.id}
            laneCount={layout.laneCount}
            onSelect={() => onSelectDuty(block.duty)}
            selected={selectedDutyId === block.duty.id}
          />
        )) ?? null;
      }}
      testId="duty-timeline-view"
      timeSlots={scheduleTimelineTimeSlots}
    />
  );
}

function DutyTimelineBlockButton({
  block,
  laneCount,
  onSelect,
  selected,
}: {
  block: PositionedDutyTimelineBlock;
  laneCount: number;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={`${block.duty.name} ${block.duty.location} ${block.duty.weekday} ${block.duty.time}`}
      aria-pressed={selected}
      className={cn(
        "absolute z-10 flex min-w-0 flex-col justify-center overflow-hidden rounded-[6px] border px-1.5 py-1 text-left tracking-normal transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 focus-visible:ring-offset-1",
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
      style={{
        ...getDutyTimelineBlockStyle(block),
        height: getTimelineBlockHeight({ laneCount }),
        top: getTimelineLaneTop({ lane: block.lane, laneCount }),
      }}
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
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-[8px] border border-gray-200 bg-white"
      data-testid="duty-list-table"
      role="table"
    >
      <div className="flex h-[56px] shrink-0 items-center gap-3 px-4">
        <h2 className="text-h-20 tracking-normal text-gray-900">근무 목록</h2>
        <span className="rounded-[4px] bg-gray-100 px-1.5 py-0.5 text-detail-16-regular tracking-normal text-gray-600">
          {rows.length}건
        </span>
      </div>

      <div
        className="grid h-9 shrink-0 grid-cols-[1.45fr_1fr_1.1fr_1.25fr_0.8fr_0.75fr] items-center border-b border-gray-300 px-4 text-h-18-regular tracking-normal text-gray-500"
        role="row"
      >
        <div role="columnheader">근무</div>
        <div role="columnheader">근무지</div>
        <div role="columnheader">요일·시간</div>
        <div role="columnheader">운영 기간</div>
        <div role="columnheader">배정</div>
        <div role="columnheader">상태</div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto"
        data-testid="duty-list-rowgroup"
        role="rowgroup"
      >
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
      data-selected={selected ? "true" : undefined}
      className={cn(
        "grid min-h-16 w-full grid-cols-[1.45fr_1fr_1.1fr_1.25fr_0.8fr_0.75fr] items-center border-b border-gray-100 px-4 text-left text-h-18-regular tracking-normal text-gray-900 transition-colors duration-150 ease-out last:border-b-0 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200",
        selected &&
          "bg-green-50 ring-2 ring-inset ring-green-400 hover:bg-green-50",
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

  const assignedWorkers = selectedDuty.assignedWorkers ?? [];
  const assignedWorkerCount = Math.max(
    selectedDuty.appliedWorkerCount,
    assignedWorkers.length,
  );
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
          assignedWorkersTitle: `할당된 조교 (${assignedWorkerCount}명)`,
          assignedWorkers,
          editBasicButtonLabel: selectedDutyDetail.editBasicButtonLabel,
          editTimeButtonLabel: selectedDutyDetail.editTimeButtonLabel,
        };

  return (
    <aside
      className="flex h-full flex-col rounded-[8px] border border-gray-200 bg-white p-4"
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
          className="h-9 rounded-full px-4 text-label-18 font-medium tracking-normal"
        >
          {detail.editBasicButtonLabel}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onEditTime}
          className="h-9 rounded-full px-4 text-label-18 font-medium tracking-normal"
        >
          {detail.editTimeButtonLabel}
        </Button>
      </div>
    </aside>
  );
}

function AssignedWorkerRow({ worker }: { worker: DutyAssignedWorker }) {
  const className =
    "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-h-18-semibold tracking-normal";
  const content = (
    <>
      <span className="min-w-0 truncate text-gray-900">{worker.name}</span>
      <span className="shrink-0 text-h-18-regular tracking-normal text-gray-500">
        {worker.weekday} {worker.time}
      </span>
    </>
  );

  if (worker.workerId) {
    return (
      <Link
        href={`/workers/${encodeURIComponent(worker.workerId)}/schedule`}
        className={cn(
          className,
          "rounded-[4px] transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200",
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={className}>
      {content}
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

function CreateDutyDialog({
  locations,
  onClose,
  onCreateDuty,
  saving,
  tagOptions,
}: {
  locations: readonly DutyLocationOption[];
  onClose: () => void;
  onCreateDuty: (input: CreateDutyInput) => Promise<void>;
  saving: boolean;
  tagOptions: readonly TagSearchPickerOption[];
}) {
  const fixture = dutyCreateDialog;
  const [form, setForm] = useState<DutyFormState>(initialDutyForm);
  const [tagInputValue, setTagInputValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const errors = getDutyFormErrors(form, locations);
  const selectedTagValues = useMemo(
    () => parseDutyTagValues(form.tagText),
    [form.tagText],
  );

  const setDutyFormValue = (field: DutyFormField, value: string) => {
    setForm((current) => {
      const nextForm = {
        ...current,
        [field]: value,
      };

      if (value !== current[field] && shouldResetOperationEndDate(field)) {
        nextForm.operationEndDate = "";
      }

      return nextForm;
    });
  };

  const handleFieldChange =
    (field: DutyFormField) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setDutyFormValue(field, event.target.value);
    };

  const handleLocationChange = (locationId: string) => {
    setDutyFormValue("locationId", locationId);
  };

  const handleWeekdayChange = (weekday: DutyWeekday) => {
    setDutyFormValue("weekday", weekday);
  };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);

    const submitForm = commitPendingDutyTagInput(form, tagInputValue);
    const submitErrors = getDutyFormErrors(submitForm, locations);

    if (submitForm.tagText !== form.tagText) {
      setForm(submitForm);
      setTagInputValue("");
    }

    if (hasDutyFormErrors(submitErrors)) {
      return;
    }

    void onCreateDuty(toCreateDutyInput(submitForm, locations));
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) {
          onClose();
        }
      }}
    >
      <DialogContent
        aria-labelledby="duty-list-create-dialog-title"
        data-testid="duty-list-create-dialog"
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-48px)] w-[calc(100vw-32px)] max-w-[620px] grid-cols-none flex-col gap-0 overflow-hidden rounded-[8px] bg-white p-8 text-gray-900 shadow-[0px_16px_44px_rgba(17,24,39,0.18)] ring-0"
      >
        <form
          className="flex min-h-0 flex-1 flex-col"
          noValidate
          onSubmit={handleSave}
        >
          <DialogHeader className="gap-0">
            <DialogTitle
              id="duty-list-create-dialog-title"
              className="text-h-20 tracking-normal text-gray-900"
            >
              {fixture.title}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="flex flex-col gap-4">
              <CreateDutyTextField
                error={submitted ? errors.name : undefined}
                field={fixture.nameField}
                name="name"
                onChange={handleFieldChange("name")}
                value={form.name}
                disabled={saving}
              />
              <CreateDutyTagField
                disabled={saving}
                field={fixture.tagSearchField}
                inputValue={tagInputValue}
                onInputValueChange={setTagInputValue}
                onValueChange={(value) =>
                  setDutyFormValue("tagText", formatDutyTagValues(value))
                }
                options={tagOptions}
                value={selectedTagValues}
              />
              <CreateDutyLocationField
                error={submitted ? errors.locationId : undefined}
                locations={locations}
                onChange={handleLocationChange}
                saving={saving}
                value={form.locationId}
              />
              <WeekdayPicker
                error={submitted ? errors.weekday : undefined}
                onSelect={handleWeekdayChange}
                selectedWeekday={form.weekday}
                weekdays={fixture.weekdays}
              />
              <CreateTimeFields
                errors={submitted ? errors : undefined}
                form={form}
                onChange={handleFieldChange}
                saving={saving}
              />
              <CreateOperationPeriodFields
                errors={submitted ? errors : undefined}
                form={form}
                onChange={handleFieldChange}
                saving={saving}
              />
            </div>
          </div>

          <CreateDutyDialogActions
            cancelLabel={fixture.cancelLabel}
            saveLabel={saving ? "저장 중" : "근무 저장"}
            onClose={onClose}
            saveDisabled={saving}
            saveType="submit"
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditBasicDialog({
  locations,
  onClose,
  onUpdateDuty,
  saving,
  selectedDuty,
}: {
  locations: readonly DutyLocationOption[];
  onClose: () => void;
  onUpdateDuty: (input: UpdateDutyInput) => Promise<void>;
  saving: boolean;
  selectedDuty?: DutyListRow;
}) {
  const fixture = dutyEditBasicDialog;
  const effectiveLocations = getLocationsForDuty(locations, selectedDuty);
  const [form, setForm] = useState<DutyFormState>(() =>
    createDutyFormFromRow(selectedDuty, effectiveLocations),
  );
  const [submitted, setSubmitted] = useState(false);
  const errors = getDutyFormErrors(form, effectiveLocations);

  if (!selectedDuty) {
    return null;
  }

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);

    if (hasDutyFormErrors(errors)) {
      return;
    }

    void onUpdateDuty({
      ...toCreateDutyInput(form, effectiveLocations),
      applyToSchedules: true,
      id: selectedDuty.id,
    });
  };

  return (
    <DialogShell
      labelledBy="duty-list-edit-basic-dialog-title"
      testId="duty-list-edit-basic-dialog"
      className="max-w-[620px] p-8"
      onClose={onClose}
    >
      <form noValidate onSubmit={handleSave}>
        <DialogTitle
          id="duty-list-edit-basic-dialog-title"
          className="text-h-20 tracking-normal text-gray-900"
        >
          {fixture.title}
        </DialogTitle>

        <div className="mt-8 flex flex-col gap-6">
          <CreateDutyTextField
            disabled={saving}
            error={submitted ? errors.name : undefined}
            field={fixture.nameField}
            name="name"
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            value={form.name}
          />
          <CreateDutyTextField
            disabled={saving}
            field={dutyCreateDialog.tagSearchField}
            name="tagText"
            onChange={(event) =>
              setForm((current) => ({ ...current, tagText: event.target.value }))
            }
            value={form.tagText}
          />
          <WeekdayPicker
            error={submitted ? errors.weekday : undefined}
            weekdays={fixture.weekdays}
            selectedWeekday={form.weekday}
            onSelect={(weekday) =>
              setForm((current) => ({
                ...current,
                operationEndDate:
                  current.weekday === weekday ? current.operationEndDate : "",
                weekday,
              }))
            }
          />
          <p className="-mt-5 text-h-16-medium tracking-normal text-gray-600">
            {fixture.timeChangeHint}
          </p>
        </div>

        <DialogActions
          cancelLabel={fixture.cancelLabel}
          saveLabel={saving ? "저장 중" : fixture.saveLabel}
          saveDisabled={saving}
          saveType="submit"
          onClose={onClose}
        />
      </form>
    </DialogShell>
  );
}

function EditTimeDialog({
  locations,
  onClose,
  onUpdateDuty,
  saving,
  selectedDuty,
}: {
  locations: readonly DutyLocationOption[];
  onClose: () => void;
  onUpdateDuty: (input: UpdateDutyInput) => Promise<void>;
  saving: boolean;
  selectedDuty?: DutyListRow;
}) {
  const fixture = dutyEditTimeDialog;
  const effectiveLocations = getLocationsForDuty(locations, selectedDuty);
  const [form, setForm] = useState<DutyFormState>(() =>
    createDutyFormFromRow(selectedDuty, effectiveLocations),
  );
  const [applyToSchedules, setApplyToSchedules] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const errors = getDutyFormErrors(form, effectiveLocations);

  if (!selectedDuty) {
    return null;
  }

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);

    if (hasDutyFormErrors(errors)) {
      return;
    }

    void onUpdateDuty({
      ...toCreateDutyInput(form, effectiveLocations),
      applyToSchedules,
      id: selectedDuty.id,
    });
  };

  return (
    <DialogShell
      labelledBy="duty-list-edit-time-dialog-title"
      testId="duty-list-edit-time-dialog"
      className="max-w-[620px] p-8"
      onClose={onClose}
    >
      <form noValidate onSubmit={handleSave}>
        <DialogTitle
          id="duty-list-edit-time-dialog-title"
          className="text-h-20 tracking-normal text-gray-900"
        >
          {fixture.title}
        </DialogTitle>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <TimeField
            disabled={saving}
            error={submitted ? errors.startTime : undefined}
            label="시작 시간"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                operationEndDate: "",
                startTime: event.target.value,
              }))
            }
            value={form.startTime}
          />
          <TimeField
            disabled={saving}
            error={submitted ? errors.endTime : undefined}
            label="종료 시간"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                operationEndDate: "",
                endTime: event.target.value,
              }))
            }
            value={form.endTime}
          />
        </div>

        <EditTimeWorkerList
          applyToSchedules={applyToSchedules}
          fixture={fixture}
          onToggleApply={() => setApplyToSchedules((current) => !current)}
        />

        <DialogActions
          cancelLabel={fixture.cancelLabel}
          saveLabel={saving ? "저장 중" : fixture.saveLabel}
          saveDisabled={saving}
          saveType="submit"
          onClose={onClose}
        />
      </form>
    </DialogShell>
  );
}

function DialogShell({
  children,
  className,
  labelledBy,
  onClose,
  testId,
}: {
  children: ReactNode;
  className?: string;
  labelledBy: string;
  onClose: () => void;
  testId: string;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-labelledby={labelledBy}
        data-testid={testId}
        className={cn(
          "flex max-h-[calc(100dvh-48px)] w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[8px] bg-white text-gray-900 shadow-[0px_16px_44px_rgba(17,24,39,0.18)] ring-0",
          className,
        )}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

function CreateDutyTextField({
  disabled,
  error,
  field,
  name,
  onChange,
  value,
}: {
  disabled: boolean;
  error?: string;
  field: DutyDialogField;
  name: DutyFormField;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  value: string;
}) {
  const inputId = `duty-create-${name}`;
  const errorId = `${inputId}-error`;

  return (
    <label className="block">
      <span className="text-h-18-semibold tracking-normal text-gray-900">
        {field.label}
        {field.required ? <span className="text-red-500"> *</span> : null}
      </span>
      <Input
        id={inputId}
        size="lg"
        value={value}
        placeholder={field.placeholder}
        disabled={disabled}
        onChange={onChange}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className="mt-3 rounded-[8px] border-gray-200 bg-gray-50 tracking-normal text-gray-900 placeholder:text-gray-400"
      />
      {error ? (
        <p id={errorId} className="mt-2 text-label-12-medium text-red-500">
          {error}
        </p>
      ) : null}
    </label>
  );
}

function CreateDutyTagField({
  disabled,
  field,
  inputValue,
  onInputValueChange,
  onValueChange,
  options,
  value,
}: {
  disabled: boolean;
  field: DutyDialogField;
  inputValue: string;
  onInputValueChange: (value: string) => void;
  onValueChange: (value: readonly string[]) => void;
  options: readonly TagSearchPickerOption[];
  value: readonly string[];
}) {
  const inputId = "duty-create-tagText";

  return (
    <div>
      <label
        htmlFor={inputId}
        className="text-h-18-semibold tracking-normal text-gray-900"
      >
        {field.label}
      </label>
      <TagSearchPicker
        allowCreate
        closeOnSelect
        className="mt-3"
        createLabel={(query) => (
          <>
            새 태그 <span className="font-semibold text-gray-900">{query}</span>
            <span> 선택</span>
          </>
        )}
        data-testid="duty-create-tag-picker"
        disabled={disabled}
        emptyMessage="일치하는 근무 태그가 없습니다."
        inputAriaLabel={field.label}
        inputId={inputId}
        inputValue={inputValue}
        listboxClassName="z-[70]"
        onCreateOption={(label) => createDutyTagPickerOption(label)}
        onInputValueChange={onInputValueChange}
        onValueChange={(nextValue) => onValueChange(nextValue)}
        options={options}
        placeholder={field.placeholder}
        triggerClassName="min-h-11 rounded-[8px] border-gray-200 bg-gray-50 px-4"
        value={value}
      />
    </div>
  );
}

function CreateDutyLocationField({
  error,
  locations,
  onChange,
  saving,
  value,
}: {
  error?: string;
  locations: readonly DutyLocationOption[];
  onChange: (locationId: string) => void;
  saving: boolean;
  value: string;
}) {
  const inputId = "duty-create-locationId";
  const errorId = `${inputId}-error`;
  const locationOptions: SelectOption[] = locations.map((location) => ({
    label: location.label,
    value: location.id,
  }));

  return (
    <div>
      <span className="text-h-18-semibold tracking-normal text-gray-900">
        근무지 <span className="text-red-500">*</span>
      </span>
      <OptionSelect
        value={value || undefined}
        size="lg"
        disabled={saving || locations.length === 0}
        onValueChange={onChange}
        options={locationOptions}
        placeholder={
          locations.length > 0
            ? "근무지를 선택해 주세요"
            : "등록된 근무지가 없습니다"
        }
        triggerAriaDescribedBy={error ? errorId : undefined}
        triggerAriaInvalid={Boolean(error)}
        triggerAriaLabel="근무지"
        triggerClassName="mt-3 w-full rounded-[8px] border-gray-200 bg-gray-50 tracking-normal text-gray-900"
        contentClassName="z-[70]"
        itemClassName="text-h-16-medium tracking-normal"
      />
      {error ? (
        <p id={errorId} className="mt-2 text-label-12-medium text-red-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function WeekdayPicker({
  error,
  onSelect,
  selectedWeekday,
  weekdays,
}: {
  error?: string;
  onSelect?: (weekday: DutyWeekday) => void;
  selectedWeekday?: DutyWeekday | "";
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
            aria-pressed={selectedWeekday ? selectedWeekday === weekday.value : weekday.selected}
            onClick={() => onSelect?.(weekday.value)}
            className={cn(
              "flex h-11 w-16 items-center justify-center rounded-[8px] border text-h-18-semibold tracking-normal transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200",
              (selectedWeekday ? selectedWeekday === weekday.value : weekday.selected)
                ? "border-green-400 bg-green-400 text-white"
                : "border-gray-200 bg-white text-gray-900",
            )}
          >
            {weekday.label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="mt-2 text-label-12-medium text-red-500">{error}</p>
      ) : null}
    </div>
  );
}

function CreateTimeFields({
  errors,
  form,
  onChange,
  saving,
}: {
  errors?: Partial<Record<DutyFormField, string>>;
  form: DutyFormState;
  onChange: (
    field: DutyFormField,
  ) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  saving: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <TimeField
        error={errors?.startTime}
        label="시작 시간"
        onChange={onChange("startTime")}
        value={form.startTime}
        disabled={saving}
      />
      <TimeField
        error={errors?.endTime}
        label="종료 시간"
        onChange={onChange("endTime")}
        value={form.endTime}
        disabled={saving}
      />
    </div>
  );
}

function CreateOperationPeriodFields({
  errors,
  form,
  onChange,
  saving,
}: {
  errors?: Partial<Record<DutyFormField, string>>;
  form: DutyFormState;
  onChange: (
    field: DutyFormField,
  ) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  saving: boolean;
}) {
  const operationCountText = getDutyOperationCountText(
    form.operationStartDate,
    form.operationEndDate,
  );
  const helperText =
    operationCountText ??
    (form.operationStartDate
      ? "운영 종료일은 시작일과 같은 요일만 저장할 수 있습니다."
      : "비워두면 상시 근무로 등록됩니다.");

  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <DateField
          error={errors?.operationStartDate}
          label="운영 시작일"
          onChange={onChange("operationStartDate")}
          value={form.operationStartDate}
          disabled={saving}
        />
        <DateField
          error={errors?.operationEndDate}
          label="운영 종료일"
          onChange={onChange("operationEndDate")}
          value={form.operationEndDate}
          disabled={saving || !form.operationStartDate}
          min={form.operationStartDate || undefined}
        />
      </div>
      <p className="mt-2 text-label-12-medium tracking-normal text-gray-500">
        {helperText}
      </p>
    </div>
  );
}

function TimeField({
  disabled,
  error,
  label,
  onChange,
  value,
}: {
  disabled?: boolean;
  error?: string;
  label: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  value: string;
}) {
  const inputId = `duty-create-${label.replace(/\s+/g, "-")}`;

  return (
    <label className="block">
      <span className="text-h-18-semibold tracking-normal text-gray-900">
        {label}
      </span>
      <Input
        id={inputId}
        type="time"
        value={value}
        disabled={disabled}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        className="mt-3 h-11 rounded-[8px] border-gray-200 bg-gray-50 text-h-18-regular tracking-normal text-gray-900"
      />
      {error ? (
        <p className="mt-2 text-label-12-medium text-red-500">{error}</p>
      ) : null}
    </label>
  );
}

function DateField({
  disabled,
  error,
  label,
  min,
  onChange,
  value,
}: {
  disabled: boolean;
  error?: string;
  label: string;
  min?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-h-18-semibold tracking-normal text-gray-900">
        {label}
      </span>
      <Input
        type="date"
        value={value}
        disabled={disabled}
        min={min}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        className="mt-3 h-11 rounded-[8px] border-gray-200 bg-gray-50 text-h-18-regular tracking-normal text-gray-900"
      />
      {error ? (
        <p className="mt-2 text-label-12-medium text-red-500">{error}</p>
      ) : null}
    </label>
  );
}

function EditTimeWorkerList({
  applyToSchedules,
  fixture,
  onToggleApply,
}: {
  applyToSchedules: boolean;
  fixture: DutyEditTimeDialogFixture;
  onToggleApply: () => void;
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
          onClick={onToggleApply}
          className="h-[33px] rounded-[4px] px-3 tracking-normal"
        >
          {applyToSchedules ? fixture.applyScheduleLabel : "근무 정의만 수정"}
        </Button>
      </div>

      <div className="mt-3 overflow-hidden rounded-[8px] border border-gray-100">
        {fixture.assignedWorkers.map((worker) => (
          <div
            key={worker.id}
            className="flex h-[51px] items-center justify-between gap-4 border-b border-gray-100 px-4 last:border-b-0"
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className="min-w-0 truncate text-h-18-semibold tracking-normal text-gray-900">
                {worker.name}
              </span>
              <span className="shrink-0 text-h-18-regular tracking-normal text-gray-500">
                {worker.weekday} {worker.time}
              </span>
            </div>
            <span
              aria-hidden="true"
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-[2px] text-white",
                applyToSchedules ? "bg-green-400" : "bg-gray-300",
              )}
            >
              <Check className="size-4" strokeWidth={2.6} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateDutyDialogActions({
  cancelLabel,
  saveDisabled = false,
  saveLabel,
  saveType = "button",
  onClose,
}: {
  cancelLabel: string;
  saveDisabled?: boolean;
  saveLabel: string;
  saveType?: "button" | "submit";
  onClose: () => void;
}) {
  return (
    <DialogFooter className="mx-0 mb-0 mt-6 flex-row justify-end gap-2.5 rounded-none border-t border-gray-100 bg-transparent p-0 pt-4 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        className="h-10 rounded-[8px] px-4 text-h-16-semibold tracking-normal"
      >
        {cancelLabel}
      </Button>
      <Button
        type={saveType}
        disabled={saveDisabled}
        className="h-10 rounded-[8px] px-4 text-h-16-semibold tracking-normal"
      >
        {saveLabel}
      </Button>
    </DialogFooter>
  );
}

function DialogActions({
  cancelLabel,
  saveDisabled = false,
  saveLabel,
  saveType = "button",
  onClose,
}: {
  cancelLabel: string;
  saveDisabled?: boolean;
  saveLabel: string;
  saveType?: "button" | "submit";
  onClose: () => void;
}) {
  return (
    <div className="mt-6 flex shrink-0 justify-end gap-2.5 border-t border-gray-100 pt-4">
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        className="h-10 rounded-[8px] px-4 text-h-16-semibold tracking-normal"
      >
        {cancelLabel}
      </Button>
      <Button
        type={saveType}
        disabled={saveDisabled}
        className="h-10 rounded-[8px] px-4 text-h-16-semibold tracking-normal"
      >
        {saveLabel}
      </Button>
    </div>
  );
}

function getLocationsForDuty(
  locations: readonly DutyLocationOption[],
  duty?: DutyListRow,
): readonly DutyLocationOption[] {
  if (!duty) {
    return locations;
  }

  if (locations.some((location) => location.id === duty.locationId)) {
    return locations;
  }

  const fallback = {
    id: duty.locationId || `location-${duty.location}`,
    label: duty.location,
  };

  return [fallback, ...locations];
}

function createDutyFormFromRow(
  duty: DutyListRow | undefined,
  locations: readonly DutyLocationOption[],
): DutyFormState {
  if (!duty) {
    return initialDutyForm;
  }

  const [startTime = "", endTime = ""] = duty.time.split("~");
  const locationId =
    duty.locationId ??
    locations.find((location) => location.label === duty.location)?.id ??
    locations[0]?.id ??
    "";

  return {
    endTime: duty.timeRows[0]?.endTime ?? endTime,
    locationId,
    name: duty.name,
    operationEndDate: duty.operationEndDate ?? "",
    operationStartDate: duty.operationStartDate ?? "",
    startTime: duty.timeRows[0]?.startTime ?? startTime,
    tagText: duty.tags.map((tag) => tag.label).join(", "),
    weekday:
      duty.weekdayValue ??
      duty.timeRows[0]?.weekday ??
      parseDutyWeekday(duty.weekday),
  };
}

function parseDutyWeekday(value: string): DutyWeekday | "" {
  const first = value.trim()[0];

  return first === "월" ||
    first === "화" ||
    first === "수" ||
    first === "목" ||
    first === "금" ||
    first === "토" ||
    first === "일"
    ? first
    : "";
}

function createDutyTagPickerOptions(
  duties: readonly DutyListRow[],
): readonly TagSearchPickerOption[] {
  const optionMap = new Map<string, TagSearchPickerOption>();

  duties.forEach((duty) => {
    duty.tags.forEach((tag) => {
      const option = createDutyTagPickerOption(tag.label);

      if (!optionMap.has(option.value)) {
        optionMap.set(option.value, option);
      }
    });
  });

  return Array.from(optionMap.values()).sort((left, right) =>
    left.label.localeCompare(right.label, "ko-KR"),
  );
}

function commitPendingDutyTagInput(
  form: DutyFormState,
  inputValue: string,
): DutyFormState {
  const tags = mergeDutyTagValues([
    ...parseDutyTagValues(form.tagText),
    inputValue,
  ]);

  return {
    ...form,
    tagText: formatDutyTagValues(tags),
  };
}

function parseDutyTagValues(value: string): readonly string[] {
  return mergeDutyTagValues(value.split(","));
}

function formatDutyTagValues(values: readonly string[]) {
  return mergeDutyTagValues(values).join(", ");
}

function mergeDutyTagValues(values: readonly string[]): readonly string[] {
  const tagMap = new Map<string, string>();

  values.forEach((value) => {
    const label = normalizeDutyTagLabel(value);

    if (label) {
      tagMap.set(label.toLocaleLowerCase("ko-KR"), label);
    }
  });

  return Array.from(tagMap.values()).slice(0, 4);
}

function createDutyTagPickerOption(label: string): TagSearchPickerOption {
  const normalizedLabel = normalizeDutyTagLabel(label);

  return {
    label: normalizedLabel,
    value: normalizedLabel,
  };
}

function normalizeDutyTagLabel(value: string) {
  return value.trim().replace(/\s+/g, " ");
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
