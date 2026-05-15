"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
  const [loading, setLoading] = useState(!dataSource.initialRows);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [editingTag, setEditingTag] = useState<WorkerTagRow | "create" | null>(
    null,
  );
  const [deleteCandidate, setDeleteCandidate] = useState<WorkerTagRow | null>(
    null,
  );

  useEffect(() => {
    let active = true;

    void dataSource
      .listWorkerTags()
      .then((nextRows) => {
        if (!active) {
          return;
        }

        setRows(nextRows);
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
        setStatusMessage(`${tag.label} 근무자 태그를 수정했습니다.`);
      } else {
        const tag = await dataSource.createWorkerTag(input);

        setRows((currentRows) => [tag, ...currentRows]);
        setStatusMessage(`${tag.label} 근무자 태그를 추가했습니다.`);
      }

      setEditingTag(null);
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

      setRows((currentRows) => currentRows.filter((row) => row.id !== tag.id));
      setDeleteCandidate(null);
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
      className="h-[calc(100vh-144px)] min-h-[520px] rounded-[8px] bg-white p-4"
      data-testid="worker-tags-screen"
    >
      <div className="flex h-9 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="text-h-20 text-gray-900">근무자 태그 관리</h2>
          <Badge variant="grey" size="M">
            {rows.length}개
          </Badge>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={saving || deleting}
          onClick={() => {
            setStatusMessage("");
            setErrorMessage("");
            setEditingTag("create");
          }}
          className="h-9 rounded-full px-4 text-label-18 font-medium tracking-normal"
        >
          태그 추가
        </Button>
      </div>

      {statusMessage || errorMessage ? (
        <div
          className={cn(
            "mt-4 min-h-9 rounded-[8px] border px-4 py-2.5 text-body-14-medium tracking-normal",
            statusMessage
              ? "border-green-100 bg-green-50 text-green-500"
              : "border-red-100 bg-red-50 text-red-500",
          )}
          role={statusMessage ? "status" : "alert"}
        >
          {statusMessage || errorMessage}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-4">
        {loading ? (
          <WorkerTagState label="근무자 태그를 불러오는 중입니다." />
        ) : errorMessage ? (
          <WorkerTagState label={errorMessage} role="alert" />
        ) : rows.length > 0 ? (
          rows.map((tag, index) => (
            <WorkerTagCard
              key={tag.id}
              deleting={deleting}
              first={index === 0}
              saving={saving}
              tag={tag}
              onDelete={() => {
                setStatusMessage("");
                setErrorMessage("");
                setDeleteCandidate(tag);
              }}
              onEdit={() => {
                setStatusMessage("");
                setErrorMessage("");
                setEditingTag(tag);
              }}
            />
          ))
        ) : (
          <WorkerTagState label="표시할 근무자 태그가 없습니다." />
        )}
      </div>

      {editingTag ? (
        <WorkerTagEditDialog
          dataSource={dataSource}
          onClose={() => {
            if (!saving) {
              setEditingTag(null);
            }
          }}
          onSave={handleSaveTag}
          saving={saving}
          tag={editingTag === "create" ? null : editingTag}
        />
      ) : null}

      {deleteCandidate ? (
        <WorkerTagDeleteDialog
          deleting={deleting}
          onClose={() => {
            if (!deleting) {
              setDeleteCandidate(null);
            }
          }}
          onConfirm={handleDeleteTag}
          tag={deleteCandidate}
        />
      ) : null}
    </section>
  );
}

function WorkerTagCard({
  deleting,
  first,
  saving,
  tag,
  onDelete,
  onEdit,
}: {
  deleting: boolean;
  first: boolean;
  saving: boolean;
  tag: WorkerTagRow;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className="flex min-h-[68px] items-center justify-between gap-4 rounded-[8px] border border-gray-100 px-4"
      data-testid={first ? "worker-tags-row-first" : undefined}
    >
      <div className="flex min-w-0 items-center gap-3">
        <WorkerTagBadge tag={tag} />
        <span className="shrink-0 text-h-18-semibold text-gray-900">
          {tag.countText}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div data-testid={first ? "worker-tags-row-first-status" : undefined}>
          {tag.statusText ? (
            <WorkerTagStatusBadge label={tag.statusText} />
          ) : null}
        </div>
        <Button
          type="button"
          variant="danger"
          aria-label={`${tag.label} 근무자 태그 삭제`}
          disabled={deleting || saving}
          onClick={onDelete}
          className="h-11 rounded-[8px] px-6"
        >
          삭제
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-label={`${tag.label} 근무자 태그 수정`}
          data-testid={first ? "worker-tags-edit-trigger-first" : undefined}
          disabled={deleting || saving}
          onClick={onEdit}
          className="h-11 rounded-[8px] px-6"
        >
          수정
        </Button>
      </div>
    </div>
  );
}

function WorkerTagState({
  label,
  role = "status",
}: {
  label: string;
  role?: "alert" | "status";
}) {
  return (
    <div
      className="flex min-h-[180px] items-center justify-center rounded-[8px] border border-gray-100 px-4 text-center text-h-18-regular text-gray-500"
      role={role}
    >
      {label}
    </div>
  );
}

function WorkerTagEditDialog({
  dataSource,
  onClose,
  onSave,
  saving,
  tag,
}: {
  dataSource: WorkerTagsDataSource;
  onClose: () => void;
  onSave: (
    input: WorkerTagSaveInput,
    currentTag?: WorkerTagRow,
  ) => Promise<void>;
  saving: boolean;
  tag: WorkerTagRow | null;
}) {
  const [label, setLabel] = useState(tag?.label ?? "");
  const [tone, setTone] = useState<WorkerTagTone>(tag?.tone ?? "green");
  const [status, setStatus] = useState<WorkerTagStatus>(
    getWorkerTagStatusValue(tag),
  );
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
  const currentCountText = `${selectedWorkerIds.length}명`;
  const title = tag ? "근무자 태그 수정" : "근무자 태그 추가";
  const canSave =
    label.trim().length > 0 && !saving && !assignmentLoading && !assignmentError;

  useEffect(() => {
    let active = true;

    void dataSource
      .listWorkerTagAssignments(tag)
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
        setAssignmentError("");
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
  }, [dataSource, tag]);

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

    void onSave(
      {
        assignedWorkerIds: selectedWorkerIds,
        label: label.trim(),
        status,
        tone,
      },
      tag ?? undefined,
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        data-testid="worker-tags-edit-dialog"
        data-worker-tags-dialog-mode={tag ? "edit" : "create"}
        className="flex max-h-[calc(100dvh-48px)] w-[calc(100vw-32px)] max-w-[640px] flex-col rounded-[8px] bg-white p-8 text-gray-900 shadow-[0px_16px_44px_rgba(17,24,39,0.18)] ring-0"
      >
        <DialogTitle className="text-h-20 text-gray-900">
          {title}
        </DialogTitle>

        <div className="mt-8 grid grid-cols-[1fr_140px_140px] gap-3">
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
              contentClassName="z-[70]"
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
              contentClassName="z-[70]"
              itemClassName="text-h-16-medium tracking-normal"
            />
          </label>
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-2">
            <h3 className="text-h-18-semibold text-gray-900">적용할 조교</h3>
            <Badge variant="grey" size="M">
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
          className="mt-6 min-h-0 overflow-y-auto rounded-[8px] border border-gray-100 py-1.5"
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

        <DialogFooter className="-mx-0 -mb-0 mt-auto flex-row justify-end gap-3 rounded-none border-0 bg-transparent p-0">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={onClose}
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

function WorkerTagAssignmentRow({
  checked,
  saving,
  worker,
  onToggle,
}: {
  checked: boolean;
  saving: boolean;
  worker: WorkerTagDialogWorker;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      disabled={worker.disabled || saving}
      onClick={onToggle}
      className="flex h-11 w-full items-center justify-between border-b border-gray-100 px-4 text-left last:border-b-0 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200 disabled:cursor-not-allowed disabled:bg-gray-50"
    >
      <span
        className={cn(
          "min-w-0 truncate text-h-18-semibold text-gray-900",
          worker.disabled && "text-gray-500",
        )}
      >
        {worker.name}
      </span>
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

function WorkerTagDeleteDialog({
  deleting,
  onClose,
  onConfirm,
  tag,
}: {
  deleting: boolean;
  onClose: () => void;
  onConfirm: (tag: WorkerTagRow) => Promise<void>;
  tag: WorkerTagRow;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        data-testid="worker-tags-delete-confirm"
        className="w-[calc(100vw-32px)] max-w-[420px] rounded-[8px] bg-white p-6 text-gray-900 shadow-[0px_16px_44px_rgba(17,24,39,0.18)] ring-0"
      >
        <DialogTitle className="text-h-20 text-gray-900">
          근무자 태그 삭제
        </DialogTitle>
        <p className="mt-4 text-h-18-regular leading-[1.5] text-gray-700">
          {tag.label} 태그를 삭제하고 적용 대상에서 이 태그를 제거합니다.
        </p>
        <DialogFooter className="-mx-0 -mb-0 mt-6 flex-row justify-end gap-3 rounded-none border-0 bg-transparent p-0">
          <Button
            type="button"
            variant="secondary"
            disabled={deleting}
            onClick={onClose}
            className="h-11 rounded-[8px] px-6 text-h-16-semibold"
          >
            취소
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={deleting}
            onClick={() => {
              void onConfirm(tag);
            }}
            className="h-11 rounded-[8px] px-6 text-h-16-semibold"
          >
            {deleting ? "삭제 중" : "삭제"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
