"use client";

// TODO(refactor): When WKR-06 gets more tag-management changes, split the tag
// list panel, create dialog, detail/edit panel, and assignment rows into
// feature-local UI files, leaving this screen as the data/mutation coordinator.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { OptionSelect, type SelectOption } from "@/shared/ui/select";
import { IconCheck } from "@/shared/ui/icons";
import { SearchField } from "@/shared/ui/search-field";
import { cn } from "@/shared/lib/utils";
import {
  createWorkerTagsDataSource,
  emptyWorkerTagRows,
  type WorkerTagSaveInput,
  type WorkerTagStatus,
  type WorkerTagsDataSource,
} from "../api/worker-tags-data-source";
import {
  workerTagEditDialog,
  type WorkerTagDialogWorker,
  type WorkerTagRow,
  type WorkerTagTone,
} from "../model/worker-tags-fixtures";

type BadgeToneConfig = {
  variant: "green" | "red" | "grey" | "blue" | "orange";
  style?: CSSProperties;
};

type WorkerTagPanelMode = "view" | "edit";

const tagToneConfig: Record<WorkerTagTone, BadgeToneConfig> = {
  green: {
    variant: "green",
    style: { color: "var(--color-green-400)" },
  },
  red: {
    variant: "red",
    style: { color: "var(--color-red-500)" },
  },
  grey: {
    variant: "grey",
  },
  blue: {
    variant: "blue",
  },
  orange: {
    variant: "orange",
  },
};

const workerTagToneOptions = [
  { label: "초록", value: "green" },
  { label: "파랑", value: "blue" },
  { label: "주황", value: "orange" },
  { label: "빨강", value: "red" },
  { label: "회색", value: "grey" },
] as const satisfies readonly SelectOption[];

const workerTagStatusOptions = [
  { label: "활성", value: "active" },
  { label: "비활성", value: "inactive" },
] as const satisfies readonly SelectOption[];

const workerTagFormControlClassName =
  "mt-3 !h-[var(--admin-control-height)] !min-h-[var(--admin-control-height)] w-full !rounded-[8px] border-gray-200 bg-white !px-4 !py-0 text-h-18-regular text-gray-900 disabled:bg-gray-50 disabled:text-gray-700";

export function WorkerTagsScreen({
  dataSource: dataSourceProp,
}: {
  dataSource?: WorkerTagsDataSource;
} = {}) {
  const fallbackDataSource = useMemo(() => createWorkerTagsDataSource(), []);
  const dataSource = dataSourceProp ?? fallbackDataSource;
  const initialRows = dataSource.initialRows ?? emptyWorkerTagRows;
  const [rows, setRows] = useState<readonly WorkerTagRow[]>(initialRows);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(
    initialRows[0]?.id ?? null,
  );
  const [panelMode, setPanelMode] = useState<WorkerTagPanelMode>("view");
  const [loading, setLoading] = useState(!dataSource.initialRows);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const selectedTag =
    rows.find((row) => row.id === selectedTagId) ?? rows[0] ?? null;

  useEffect(() => {
    let active = true;

    void dataSource
      .listWorkerTags()
      .then((nextRows) => {
        if (!active) {
          return;
        }

        setRows(nextRows);
        setSelectedTagId((currentId) => {
          if (currentId && nextRows.some((row) => row.id === currentId)) {
            return currentId;
          }

          return nextRows[0]?.id ?? null;
        });
        setPanelMode("view");
        setErrorMessage("");
        setLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setErrorMessage("근무자 태그를 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource]);

  const handleSelectTag = (tag: WorkerTagRow) => {
    if (saving || deleting) {
      return;
    }

    setSelectedTagId(tag.id);
    setPanelMode("view");
    setStatusMessage("");
    setErrorMessage("");
  };

  const handleStartCreate = () => {
    if (saving || deleting) {
      return;
    }

    setCreateDialogOpen(true);
    setStatusMessage("");
    setErrorMessage("");
  };

  const handleStartEdit = () => {
    if (!selectedTag || saving || deleting) {
      return;
    }

    setSelectedTagId(selectedTag.id);
    setPanelMode("edit");
    setStatusMessage("");
    setErrorMessage("");
  };

  const handleCancelPanel = () => {
    if (saving || deleting) {
      return;
    }

    setStatusMessage("");
    setErrorMessage("");

    if (selectedTag) {
      setSelectedTagId(selectedTag.id);
      setPanelMode("view");
      return;
    }

    setSelectedTagId(rows[0]?.id ?? null);
    setPanelMode("view");
  };

  const handleSaveTag = async (
    input: WorkerTagSaveInput,
    currentTag?: WorkerTagRow,
  ) => {
    setSaving(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      if (currentTag) {
        const tag = await dataSource.updateWorkerTag(currentTag, input);

        setRows((currentRows) =>
          currentRows.map((row) => (row.id === tag.id ? tag : row)),
        );
        setSelectedTagId(tag.id);
        setPanelMode("view");
        setStatusMessage(`${tag.label} 근무자 태그를 수정했습니다.`);
      } else {
        const tag = await dataSource.createWorkerTag(input);

        setRows((currentRows) => [tag, ...currentRows]);
        setSelectedTagId(tag.id);
        setPanelMode("view");
        setCreateDialogOpen(false);
        setStatusMessage(`${tag.label} 근무자 태그를 추가했습니다.`);
      }
    } catch {
      setErrorMessage("근무자 태그를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTag = async (tag: WorkerTagRow) => {
    setDeleting(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      await dataSource.deleteWorkerTag(tag);

      const nextRows = rows.filter((row) => row.id !== tag.id);

      setRows(nextRows);
      setSelectedTagId(nextRows[0]?.id ?? null);
      setPanelMode("view");
      setStatusMessage(`${tag.label} 근무자 태그를 삭제했습니다.`);
    } catch {
      setErrorMessage("근무자 태그를 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section
      aria-label="근무자 태그 관리"
      className="flex h-[calc(100vh-144px)] min-h-140 w-full flex-col gap-4"
      data-testid="worker-tags-screen"
    >
      {statusMessage || errorMessage ? (
        <div
          className={cn(
            "min-h-9 rounded-[8px] border px-4 py-2.5 text-body-14-medium tracking-normal",
            statusMessage
              ? "border-green-100 bg-green-50 text-green-500"
              : "border-red-100 bg-red-50 text-red-500",
          )}
          role={statusMessage ? "status" : "alert"}
        >
          {statusMessage || errorMessage}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(430px,1fr)_minmax(380px,520px)] gap-4">
        <WorkerTagListPanel
          loading={loading}
          rows={rows}
          selectedTagId={selectedTagId}
          onCreate={handleStartCreate}
          onSelect={handleSelectTag}
        />
        <WorkerTagDetailPanel
          key={selectedTag?.id ?? "empty"}
          dataSource={dataSource}
          deleting={deleting}
          firstSelected={rows[0]?.id === selectedTag?.id}
          loading={loading}
          mode={panelMode}
          saving={saving}
          tag={selectedTag}
          onCancel={handleCancelPanel}
          onDelete={handleDeleteTag}
          onSave={handleSaveTag}
          onStartEdit={handleStartEdit}
        />
      </div>

      {createDialogOpen ? (
        <WorkerTagCreateDialog
          dataSource={dataSource}
          saving={saving}
          onCancel={() => setCreateDialogOpen(false)}
          onSave={(input) => handleSaveTag(input)}
        />
      ) : null}
    </section>
  );
}

function WorkerTagListPanel({
  loading,
  rows,
  selectedTagId,
  onCreate,
  onSelect,
}: {
  loading: boolean;
  rows: readonly WorkerTagRow[];
  selectedTagId: string | null;
  onCreate: () => void;
  onSelect: (tag: WorkerTagRow) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-[8px] bg-white">
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="text-h-20 text-gray-900">근무자 태그 관리</h2>
          <Badge variant="grey" size="M">
            {rows.length}개
          </Badge>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={onCreate}
          className="h-9 rounded-full px-4 text-label-18 font-medium tracking-normal"
        >
          태그 추가
        </Button>
      </div>

      <div className="grid h-9 shrink-0 grid-cols-[minmax(0,1fr)_128px_88px] items-center border-b border-gray-300 px-4 text-h-18-regular text-gray-500">
        <div>태그</div>
        <div>대상 수</div>
        <div data-testid="worker-tags-list-status-header">상태</div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <WorkerTagListState label="근무자 태그를 불러오는 중입니다." />
        ) : rows.length > 0 ? (
          rows.map((tag, index) => {
            const selected = tag.id === selectedTagId;

            return (
              <WorkerTagListRow
                key={tag.id}
                first={index === 0}
                selected={selected}
                tag={tag}
                onSelect={() => onSelect(tag)}
              />
            );
          })
        ) : (
          <WorkerTagListState label="표시할 근무자 태그가 없습니다." />
        )}
      </div>
    </div>
  );
}

function WorkerTagListRow({
  first,
  selected,
  tag,
  onSelect,
}: {
  first: boolean;
  selected: boolean;
  tag: WorkerTagRow;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${tag.label} 근무자 태그 조회`}
      data-testid={first ? "worker-tags-row-first" : undefined}
      onClick={onSelect}
      className={cn(
        "grid min-h-14 w-full grid-cols-[minmax(0,1fr)_128px_88px] items-center border-b border-gray-100 px-4 text-left text-h-18-regular tracking-normal text-gray-900 transition-colors duration-150 ease-out last:border-b-0 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200",
        selected &&
          "bg-green-50 ring-2 ring-inset ring-green-400 hover:bg-green-50",
      )}
    >
      <div className="min-w-0">
        <WorkerTagBadge tag={tag} />
      </div>
      <div className="min-w-0 truncate text-gray-700">{tag.countText}</div>
      <div
        className="flex justify-start"
        data-testid={first ? "worker-tags-row-first-status" : undefined}
      >
        {tag.statusText ? (
          <WorkerTagStatusBadge label={tag.statusText} />
        ) : null}
      </div>
    </button>
  );
}

function WorkerTagListState({
  label,
  role = "status",
}: {
  label: string;
  role?: "alert" | "status";
}) {
  return (
    <div
      className="flex min-h-55 items-center justify-center px-4 text-center text-h-18-regular text-gray-500"
      role={role}
    >
      {label}
    </div>
  );
}

function WorkerTagCreateDialog({
  dataSource,
  saving,
  onCancel,
  onSave,
}: {
  dataSource: WorkerTagsDataSource;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: WorkerTagSaveInput) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [tone, setTone] = useState<WorkerTagTone>("green");
  const [status, setStatus] = useState<WorkerTagStatus>("active");
  const [workers, setWorkers] = useState<readonly WorkerTagDialogWorker[]>([]);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<readonly string[]>(
    [],
  );
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [assignmentLoading, setAssignmentLoading] = useState(true);
  const [assignmentError, setAssignmentError] = useState("");
  const normalizedSearchText = debouncedSearchText
    .trim()
    .toLocaleLowerCase("ko-KR");
  const visibleWorkers = workers.filter((worker) =>
    normalizedSearchText
      ? worker.name.toLocaleLowerCase("ko-KR").includes(normalizedSearchText)
      : true,
  );
  const canSave = label.trim().length > 0 && !saving && !assignmentLoading;

  useEffect(() => {
    let active = true;

    void dataSource
      .listWorkerTagAssignments(null)
      .then((nextWorkers) => {
        if (!active) {
          return;
        }

        setWorkers(nextWorkers);
        setSelectedWorkerIds(
          nextWorkers
            .filter((worker) => worker.checked)
            .map((worker) => worker.id),
        );
        setAssignmentLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setWorkers([]);
        setSelectedWorkerIds([]);
        setAssignmentError("조교 배정 정보를 불러오지 못했습니다.");
        setAssignmentLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource]);

  const toggleWorker = (worker: WorkerTagDialogWorker) => {
    if (worker.disabled || saving) {
      return;
    }

    setSelectedWorkerIds((currentIds) =>
      currentIds.includes(worker.id)
        ? currentIds.filter((workerId) => workerId !== worker.id)
        : [...currentIds, worker.id],
    );
  };

  const handleSave = () => {
    if (!canSave) {
      return;
    }

    void onSave({
      assignedWorkerIds: selectedWorkerIds,
      label: label.trim(),
      status,
      tone,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="z-80 flex max-h-[calc(100vh-48px)] w-full max-w-160 flex-col overflow-hidden rounded-[8px] bg-white p-0 text-gray-900 shadow-[0px_16px_44px_rgba(17,24,39,0.18)] ring-0"
        data-testid="worker-tags-create-dialog"
      >
        <DialogHeader className="shrink-0 gap-1 px-6 pt-6">
          <DialogTitle className="text-h-20 text-gray-900">
            근무자 태그 추가
          </DialogTitle>
          <DialogDescription className="text-h-16-medium tracking-normal text-gray-500">
            태그 정보와 적용 조교를 저장합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-5 pt-5">
          <div className="grid grid-cols-[minmax(0,1fr)_124px_124px] gap-3">
            <label className="block">
              <span className="text-h-18-semibold text-gray-900">태그명</span>
              <Input
                aria-label="태그명"
                disabled={saving}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                className={workerTagFormControlClassName}
              />
            </label>
            <label className="block">
              <span className="text-h-18-semibold text-gray-900">색상</span>
              <OptionSelect
                value={tone}
                disabled={saving}
                onValueChange={(value) => setTone(value as WorkerTagTone)}
                options={[...workerTagToneOptions]}
                triggerAriaLabel="색상"
                triggerClassName={workerTagFormControlClassName}
                contentClassName="z-[90]"
                itemClassName="text-h-16-medium tracking-normal"
              />
            </label>
            <label className="block">
              <span className="text-h-18-semibold text-gray-900">상태</span>
              <OptionSelect
                value={status}
                disabled={saving}
                onValueChange={(value) => setStatus(value as WorkerTagStatus)}
                options={[...workerTagStatusOptions]}
                triggerAriaLabel="상태"
                triggerClassName={workerTagFormControlClassName}
                contentClassName="z-[90]"
                itemClassName="text-h-16-medium tracking-normal"
              />
            </label>
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-2">
              <h3 className="text-h-18-semibold text-gray-900">적용할 조교</h3>
              {!assignmentLoading && !assignmentError ? (
                <Badge variant="grey" size="M">
                  {selectedWorkerIds.length}명
                </Badge>
              ) : null}
            </div>
            <SearchField
              aria-label="조교 이름 검색"
              className="mt-3 h-11 rounded-[8px] border-gray-200 px-4 py-0 [&_input]:text-gray-900 [&_input]:disabled:text-gray-500 [&_svg]:text-green-400"
              debounceMs={300}
              disabled={saving}
              onChange={(event) => setSearchText(event.target.value)}
              onDebouncedValueChange={setDebouncedSearchText}
              placeholder={workerTagEditDialog.searchPlaceholder}
              value={searchText}
            />
          </div>

          <div className="mt-4 max-h-70 overflow-y-auto rounded-[8px] border border-gray-100">
            {assignmentLoading ? (
              <WorkerTagAssignmentState label="조교 목록을 불러오는 중입니다." />
            ) : assignmentError ? (
              <WorkerTagAssignmentState label={assignmentError} role="alert" />
            ) : visibleWorkers.length > 0 ? (
              visibleWorkers.map((worker) => {
                const checked = selectedWorkerIds.includes(worker.id);

                return (
                  <WorkerTagAssignmentRow
                    key={worker.id}
                    checked={checked}
                    editable={true}
                    saving={saving}
                    worker={worker}
                    onToggle={() => toggleWorker(worker)}
                  />
                );
              })
            ) : (
              <WorkerTagAssignmentState label="표시할 조교가 없습니다." />
            )}
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 flex h-16 shrink-0 flex-row items-center justify-end gap-3 rounded-none border-0 bg-transparent px-6 pb-4 pt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={onCancel}
            className="h-11 rounded-[8px] px-6 text-h-16-semibold"
          >
            취소
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            onClick={handleSave}
            className="h-11 rounded-[8px] px-7 text-h-16-semibold"
          >
            {saving ? "저장 중" : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WorkerTagDetailPanel({
  dataSource,
  deleting,
  firstSelected,
  loading,
  mode,
  saving,
  tag,
  onCancel,
  onDelete,
  onSave,
  onStartEdit,
}: {
  dataSource: WorkerTagsDataSource;
  deleting: boolean;
  firstSelected: boolean;
  loading: boolean;
  mode: WorkerTagPanelMode;
  saving: boolean;
  tag: WorkerTagRow | null;
  onCancel: () => void;
  onDelete: (tag: WorkerTagRow) => Promise<void>;
  onSave: (
    input: WorkerTagSaveInput,
    currentTag?: WorkerTagRow,
  ) => Promise<void>;
  onStartEdit: () => void;
}) {
  const editable = mode !== "view";
  const shouldLoadAssignments = !loading && Boolean(tag);
  const [label, setLabel] = useState(tag?.label ?? "");
  const [tone, setTone] = useState<WorkerTagTone>(tag?.tone ?? "green");
  const [status, setStatus] = useState<WorkerTagStatus>(
    getWorkerTagStatusValue(tag),
  );
  const [workers, setWorkers] = useState<readonly WorkerTagDialogWorker[]>([]);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<readonly string[]>(
    [],
  );
  const [committedWorkerIds, setCommittedWorkerIds] = useState<
    readonly string[]
  >([]);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [assignmentLoading, setAssignmentLoading] = useState(
    shouldLoadAssignments,
  );
  const [assignmentError, setAssignmentError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const normalizedSearchText = debouncedSearchText
    .trim()
    .toLocaleLowerCase("ko-KR");
  const selectedWorkers = workers.filter((worker) =>
    selectedWorkerIds.includes(worker.id),
  );
  const visibleWorkers = (editable ? workers : selectedWorkers).filter(
    (worker) =>
      normalizedSearchText
        ? worker.name.toLocaleLowerCase("ko-KR").includes(normalizedSearchText)
        : true,
  );
  const fallbackCountText = getWorkerTagAppliedCountText(tag);
  const currentCountText =
    assignmentError || (assignmentLoading && selectedWorkerIds.length === 0)
      ? fallbackCountText
      : `${selectedWorkerIds.length}명`;
  const title = mode === "edit" ? "근무자 태그 수정" : "근무자 태그 상세";
  const canSave = label.trim().length > 0 && !saving && !assignmentLoading;

  useEffect(() => {
    let active = true;

    if (!shouldLoadAssignments) {
      return () => {
        active = false;
      };
    }

    void dataSource
      .listWorkerTagAssignments(tag)
      .then((nextWorkers) => {
        if (!active) {
          return;
        }

        const assignedWorkerIds = nextWorkers
          .filter((worker) => worker.checked)
          .map((worker) => worker.id);

        setWorkers(nextWorkers);
        setSelectedWorkerIds(assignedWorkerIds);
        setCommittedWorkerIds(assignedWorkerIds);
        setAssignmentLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setWorkers([]);
        setSelectedWorkerIds([]);
        setCommittedWorkerIds([]);
        setAssignmentError("조교 배정 정보를 불러오지 못했습니다.");
        setAssignmentLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource, shouldLoadAssignments, tag]);

  if (loading) {
    return (
      <aside className="flex min-w-0 items-center justify-center rounded-[8px] bg-white px-6 text-center">
        <p className="text-h-18-regular text-gray-400">
          태그 정보를 불러오는 중입니다.
        </p>
      </aside>
    );
  }

  if (!tag) {
    return (
      <aside className="flex min-w-0 items-center justify-center rounded-[8px] bg-white px-6 text-center">
        <p className="text-h-18-regular text-gray-400">
          태그를 선택하면 상세와 적용 조교가 표시됩니다.
        </p>
      </aside>
    );
  }

  const toggleWorker = (worker: WorkerTagDialogWorker) => {
    if (!editable || worker.disabled || saving) {
      return;
    }

    setSelectedWorkerIds((currentIds) =>
      currentIds.includes(worker.id)
        ? currentIds.filter((workerId) => workerId !== worker.id)
        : [...currentIds, worker.id],
    );
  };

  const resetDraftToTag = () => {
    setLabel(tag.label);
    setTone(tag.tone);
    setStatus(getWorkerTagStatusValue(tag));
    setSelectedWorkerIds(committedWorkerIds);
    setConfirmingDelete(false);
  };

  const handleSave = () => {
    if (!canSave || !tag) {
      return;
    }

    void onSave(
      {
        assignedWorkerIds: selectedWorkerIds,
        label: label.trim(),
        status,
        tone,
      },
      tag,
    );
  };

  return (
    <>
      <aside
        className="flex min-w-0 flex-col overflow-hidden rounded-[8px] bg-white"
        data-testid="worker-tags-detail-panel"
        data-worker-tags-panel-mode={mode}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-4">
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-h-20 text-gray-900">{title}</h2>
              <p className="mt-1 text-h-16-medium tracking-normal text-gray-500">
                {editable
                  ? "태그 정보와 적용 대상을 저장합니다."
                  : "태그 정보와 적용 대상을 확인합니다."}
              </p>
            </div>
          </div>

          <div className="mt-5 grid shrink-0 grid-cols-[minmax(0,1fr)_124px_124px] gap-3">
            <label className="block">
              <span className="text-h-18-semibold text-gray-900">태그명</span>
              <Input
                aria-label="태그명"
                disabled={!editable || saving}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                className={workerTagFormControlClassName}
              />
            </label>
            <label className="block">
              <span className="text-h-18-semibold text-gray-900">색상</span>
              <OptionSelect
                value={tone}
                disabled={!editable || saving}
                onValueChange={(value) => setTone(value as WorkerTagTone)}
                options={[...workerTagToneOptions]}
                triggerAriaLabel="색상"
                triggerClassName={workerTagFormControlClassName}
                contentClassName="z-[70]"
                itemClassName="text-h-16-medium tracking-normal"
              />
            </label>
            <label className="block">
              <span className="text-h-18-semibold text-gray-900">상태</span>
              <OptionSelect
                value={status}
                disabled={!editable || saving}
                onValueChange={(value) => setStatus(value as WorkerTagStatus)}
                options={[...workerTagStatusOptions]}
                triggerAriaLabel="상태"
                triggerClassName={workerTagFormControlClassName}
                contentClassName="z-[70]"
                itemClassName="text-h-16-medium tracking-normal"
              />
            </label>
          </div>

          <div className="mt-6 shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-h-18-semibold text-gray-900">
                {"적용 대상"}
              </h3>
              <Badge variant="grey" size="M" className="min-w-10 tabular-nums">
                {currentCountText}
              </Badge>
            </div>
            <SearchField
              aria-label="조교 이름 검색"
              className="mt-3 h-11 rounded-[8px] border-gray-200 px-4 py-0 [&_input]:text-gray-900 [&_input]:disabled:text-gray-500 [&_svg]:text-green-400"
              debounceMs={300}
              disabled={saving}
              onChange={(event) => setSearchText(event.target.value)}
              onDebouncedValueChange={setDebouncedSearchText}
              placeholder={workerTagEditDialog.searchPlaceholder}
              value={searchText}
            />
          </div>

          <div
            className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-[8px] border border-gray-100"
            data-testid="worker-tags-assignment-list"
          >
            {assignmentLoading ? (
              <WorkerTagAssignmentState label="조교 목록을 불러오는 중입니다." />
            ) : assignmentError ? (
              <WorkerTagAssignmentState label={assignmentError} role="alert" />
            ) : visibleWorkers.length > 0 ? (
              visibleWorkers.map((worker) => {
                const checked = selectedWorkerIds.includes(worker.id);

                return (
                  <WorkerTagAssignmentRow
                    key={worker.id}
                    checked={checked}
                    editable={editable}
                    saving={saving}
                    worker={worker}
                    onToggle={() => toggleWorker(worker)}
                  />
                );
              })
            ) : (
              <WorkerTagAssignmentState
                label={
                  editable ? "표시할 조교가 없습니다." : "적용 대상이 없습니다."
                }
              />
            )}
          </div>
        </div>

        <div
          className="mt-auto flex h-16 shrink-0 items-center justify-end gap-3 px-4 pb-4 pt-4"
          data-testid="worker-tags-detail-actions"
        >
          {mode === "view" && tag ? (
            <>
              <Button
                type="button"
                variant="danger"
                disabled={deleting || saving}
                onClick={() => setConfirmingDelete(true)}
                className="h-11 rounded-[8px] px-6 text-h-16-semibold"
              >
                삭제
              </Button>
              <Button
                type="button"
                variant="secondary"
                data-testid={
                  firstSelected ? "worker-tags-edit-trigger-first" : undefined
                }
                disabled={deleting || saving}
                onClick={() => {
                  setConfirmingDelete(false);
                  onStartEdit();
                }}
                className="h-11 rounded-[8px] px-6 text-h-16-semibold"
              >
                수정
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => {
                  resetDraftToTag();
                  onCancel();
                }}
                className="h-11 rounded-[8px] px-6 text-h-16-semibold"
              >
                취소
              </Button>
              <Button
                type="button"
                disabled={!canSave}
                onClick={handleSave}
                className="h-11 rounded-[8px] px-7 text-h-16-semibold"
              >
                {saving ? "저장 중" : "저장"}
              </Button>
            </>
          )}
        </div>
      </aside>

      {confirmingDelete && tag ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !deleting) {
              setConfirmingDelete(false);
            }
          }}
        >
          <DialogContent
            showCloseButton={false}
            data-testid="worker-tags-delete-confirm"
            className="w-[calc(100vw-32px)] max-w-[480px] rounded-[8px] bg-white px-6 py-6 text-gray-900 shadow-[0px_16px_44px_rgba(17,24,39,0.18)] ring-0 sm:max-w-[480px]"
          >
            <DialogTitle className="text-h-20 text-gray-900">
              근무자 태그 삭제
            </DialogTitle>
            <DialogDescription className="mt-3 text-body-14-regular tracking-normal text-gray-500">
              {tag.label} 태그를 삭제하고 적용 대상에서 이 태그를 제거합니다.
            </DialogDescription>
            <DialogFooter className="mx-0 mb-0 mt-8 flex-row justify-end gap-3 rounded-none border-0 bg-transparent p-0">
              <Button
                type="button"
                variant="secondary"
                disabled={deleting}
                onClick={() => setConfirmingDelete(false)}
                className="h-11 rounded-[8px] px-6 text-h-16-semibold"
              >
                취소
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={deleting}
                onClick={() => {
                  void onDelete(tag);
                }}
                className="h-11 rounded-[8px] px-6 text-h-16-semibold"
              >
                {deleting ? "삭제 중" : "삭제"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

function WorkerTagAssignmentRow({
  checked,
  editable,
  saving,
  worker,
  onToggle,
}: {
  checked: boolean;
  editable: boolean;
  saving: boolean;
  worker: WorkerTagDialogWorker;
  onToggle: () => void;
}) {
  const content = (
    <>
      <span
        className={cn(
          "min-w-0 truncate text-h-18-semibold text-gray-900",
          worker.disabled && "text-gray-500",
        )}
      >
        {worker.name}
      </span>
      {editable ? (
        <span
          aria-hidden="true"
          className={cn(
            "flex size-5 items-center justify-center rounded-xs",
            worker.disabled
              ? "bg-gray-200 text-white"
              : checked
                ? "bg-green-400 text-white"
                : "border border-gray-200 bg-white text-white",
          )}
        >
          {checked ? <IconCheck className="size-4" /> : null}
        </span>
      ) : null}
    </>
  );

  if (!editable) {
    return (
      <div className="flex h-11 w-full items-center justify-between border-b border-gray-100 px-4 last:border-b-0">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={checked}
      disabled={worker.disabled || saving}
      onClick={onToggle}
      className="flex h-11 w-full items-center justify-between border-b border-gray-100 px-4 text-left last:border-b-0 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200 disabled:cursor-not-allowed disabled:bg-gray-50"
    >
      {content}
    </button>
  );
}

function WorkerTagAssignmentState({
  label,
  role = "status",
}: {
  label: string;
  role?: "alert" | "status";
}) {
  return (
    <div
      className="flex h-24 items-center justify-center px-4 text-center text-h-18-regular text-gray-500"
      role={role}
    >
      {label}
    </div>
  );
}

function WorkerTagStatusBadge({ label }: { label: string }) {
  const active = label === "활성";

  return (
    <Badge
      variant={active ? "green" : "grey"}
      size="M"
      style={active ? { color: "var(--color-green-400)" } : undefined}
    >
      {label}
    </Badge>
  );
}

function WorkerTagBadge({ tag }: { tag: WorkerTagRow }) {
  const tone = tagToneConfig[tag.tone];

  return (
    <Badge variant={tone.variant} size="L" style={tone.style}>
      {tag.label}
    </Badge>
  );
}

function getWorkerTagStatusValue(tag: WorkerTagRow | null): WorkerTagStatus {
  return tag?.statusText === "비활성" ? "inactive" : "active";
}

function getWorkerTagAppliedCountText(tag: WorkerTagRow | null) {
  const count = tag?.countText.match(/\d+/)?.[0];

  return `${count ?? 0}명`;
}
