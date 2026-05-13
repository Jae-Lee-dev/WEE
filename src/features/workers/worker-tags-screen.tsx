"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OptionSelect, type SelectOption } from "@/components/ui/select";
import { IconCheck, IconSearch } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  createWorkerTagsDataSource,
  emptyWorkerTagRows,
  type WorkerTagSaveInput,
  type WorkerTagStatus,
  type WorkerTagsDataSource,
} from "./worker-tags-data-source";
import {
  workerTagEditDialog,
  type WorkerTagDialogWorker,
  type WorkerTagRow,
  type WorkerTagTone,
} from "./worker-tags-fixtures";

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

export function WorkerTagsScreen({
  dataSource: dataSourceProp,
}: {
  dataSource?: WorkerTagsDataSource;
} = {}) {
  const fallbackDataSource = useMemo(() => createWorkerTagsDataSource(), []);
  const dataSource = dataSourceProp ?? fallbackDataSource;
  const [rows, setRows] = useState<readonly WorkerTagRow[]>(
    dataSource.initialRows ?? emptyWorkerTagRows,
  );
  const [editingTag, setEditingTag] = useState<WorkerTagRow | "create" | null>(
    null,
  );
  const [deleteCandidate, setDeleteCandidate] = useState<WorkerTagRow | null>(
    null,
  );
  const [loading, setLoading] = useState(!dataSource.initialRows);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

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
      setStatusMessage(`${tag.label} 근무자 태그를 삭제했습니다.`);
      setDeleteCandidate(null);
    } catch {
      setErrorMessage("근무자 태그를 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="min-h-[560px] rounded-[8px] bg-white p-4">
      <div className="flex h-9 items-center justify-between">
        <h2 className="text-h-20 text-gray-900">근무자 태그 관리</h2>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setStatusMessage("");
            setEditingTag("create");
          }}
          className="h-9 rounded-full px-4"
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
          <WorkerTagListState label="근무자 태그를 불러오는 중입니다." />
        ) : errorMessage ? (
          <WorkerTagListState label={errorMessage} role="alert" />
        ) : rows.length > 0 ? (
          rows.map((tag, index) => (
            <WorkerTagCard
              key={tag.id}
              tag={tag}
              first={index === 0}
              onEdit={() => setEditingTag(tag)}
              onDelete={() => setDeleteCandidate(tag)}
            />
          ))
        ) : (
          <WorkerTagListState label="표시할 근무자 태그가 없습니다." />
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

function WorkerTagListState({
  label,
  role = "status",
}: {
  label: string;
  role?: "alert" | "status";
}) {
  return (
    <div
      className="flex min-h-[220px] items-center justify-center rounded-[8px] border border-gray-100 px-4 text-center text-h-18-regular text-gray-500"
      role={role}
    >
      {label}
    </div>
  );
}

function WorkerTagCard({
  tag,
  first,
  onDelete,
  onEdit,
}: {
  tag: WorkerTagRow;
  first: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="flex h-[68px] items-center justify-between rounded-[8px] border border-gray-100 px-4">
      <div className="flex items-center gap-3">
        <WorkerTagBadge tag={tag} />
        <span className="text-h-18-semibold text-gray-900">{tag.countText}</span>
        {tag.statusText ? <WorkerTagStatusBadge label={tag.statusText} /> : null}
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="danger"
          onClick={onDelete}
          className="h-11 rounded-[8px] px-6"
        >
          삭제
        </Button>
        <Button
          type="button"
          variant="secondary"
          data-testid={first ? "worker-tags-edit-trigger-first" : undefined}
          onClick={onEdit}
          className="h-11 rounded-[8px] px-6"
        >
          수정
        </Button>
      </div>
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

function WorkerTagEditDialog({
  dataSource,
  onClose,
  onSave,
  saving,
  tag,
}: {
  dataSource: WorkerTagsDataSource;
  onClose: () => void;
  onSave: (input: WorkerTagSaveInput, currentTag?: WorkerTagRow) => Promise<void>;
  saving: boolean;
  tag: WorkerTagRow | null;
}) {
  const [label, setLabel] = useState(tag?.label ?? "");
  const [tone, setTone] = useState<WorkerTagTone>(tag?.tone ?? "green");
  const [status, setStatus] = useState<WorkerTagStatus>(
    tag?.statusText === "비활성" ? "inactive" : "active",
  );
  const [workers, setWorkers] = useState<readonly WorkerTagDialogWorker[]>([]);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<readonly string[]>(
    [],
  );
  const [searchText, setSearchText] = useState("");
  const [assignmentLoading, setAssignmentLoading] = useState(true);
  const normalizedSearchText = searchText.trim().toLocaleLowerCase("ko-KR");
  const visibleWorkers = workers.filter((worker) =>
    normalizedSearchText
      ? worker.name.toLocaleLowerCase("ko-KR").includes(normalizedSearchText)
      : true,
  );
  const currentCountText = `${selectedWorkerIds.length}명`;
  const title = tag ? "근무자 태그 수정" : "근무자 태그 추가";
  const canSave = label.trim().length > 0 && !saving && !assignmentLoading;

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
        setAssignmentLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setWorkers([]);
        setSelectedWorkerIds([]);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="worker-tags-dialog-title"
        data-testid="worker-tags-edit-dialog"
        className="flex max-h-[calc(100dvh-48px)] w-[calc(100vw-32px)] max-w-[620px] flex-col rounded-[8px] bg-white p-8 shadow-[0px_16px_44px_rgba(17,24,39,0.18)]"
      >
        <h2 id="worker-tags-dialog-title" className="text-h-20 text-gray-900">
          {title}
        </h2>

        <div className="mt-8 grid grid-cols-[1fr_140px_140px] gap-3">
          <label className="block">
            <span className="text-h-18-semibold text-gray-900">태그명</span>
            <input
              aria-label="태그명"
              disabled={saving}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              className="mt-3 h-11 w-full rounded-[8px] border border-gray-200 bg-white px-4 text-h-18-regular text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-green-200 disabled:bg-gray-50 disabled:text-gray-500"
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
              triggerClassName="mt-3 h-11 w-full rounded-[8px] border-gray-200 bg-white px-4 text-h-18-regular"
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
              triggerClassName="mt-3 h-11 w-full rounded-[8px] border-gray-200 bg-white px-4 text-h-18-regular"
              contentClassName="z-[70]"
              itemClassName="text-h-16-medium tracking-normal"
            />
          </label>
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-2">
            <h3 className="text-h-18-semibold text-gray-900">현재 받고 있는 조교</h3>
            <Badge variant="grey" size="M">
              {currentCountText}
            </Badge>
          </div>
          <label className="mt-3 flex h-11 items-center gap-3 rounded-[8px] border border-gray-200 bg-white px-4">
            <span className="sr-only">조교 이름 검색</span>
            <input
              value={searchText}
              disabled={saving}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={workerTagEditDialog.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-h-18-regular text-gray-900 outline-none placeholder:text-gray-400 disabled:text-gray-500"
            />
            <IconSearch className="size-6 shrink-0 text-green-400" />
          </label>
        </div>

        <div className="mt-6 min-h-0 overflow-y-auto rounded-[8px] border border-gray-100">
          {assignmentLoading ? (
            <div className="flex h-24 items-center justify-center text-h-18-regular text-gray-500">
              조교 목록을 불러오는 중입니다.
            </div>
          ) : visibleWorkers.length > 0 ? (
            visibleWorkers.map((worker) => {
              const checked = selectedWorkerIds.includes(worker.id);

              return (
                <button
                  key={worker.id}
                  type="button"
                  disabled={worker.disabled || saving}
                  onClick={() => toggleWorker(worker)}
                  className="flex h-11 w-full items-center justify-between border-b border-gray-100 px-4 text-left last:border-b-0 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200 disabled:cursor-not-allowed disabled:bg-gray-50"
                >
                  <span className="text-h-18-semibold text-gray-900">
                    {worker.name}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-5 items-center justify-center rounded-[2px]",
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
            })
          ) : (
            <div className="flex h-24 items-center justify-center text-h-18-regular text-gray-500">
              표시할 조교가 없습니다.
            </div>
          )}
        </div>

        <div className="mt-auto flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={onClose}
            className="h-11 rounded-[8px] px-6"
          >
            취소
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            onClick={handleSave}
            className="h-11 rounded-[8px] px-7"
          >
            {saving ? "저장 중" : "저장"}
          </Button>
        </div>
      </section>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="worker-tags-delete-dialog-title"
        className="w-[calc(100vw-32px)] max-w-[420px] rounded-[8px] bg-white p-6 shadow-[0px_16px_44px_rgba(17,24,39,0.18)]"
      >
        <h2 id="worker-tags-delete-dialog-title" className="text-h-20 text-gray-900">
          근무자 태그 삭제
        </h2>
        <p className="mt-4 text-h-18-regular leading-[1.5] text-gray-700">
          {tag.label} 태그를 삭제하고 적용된 조교에서 이 태그를 제거합니다.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={deleting}
            onClick={onClose}
            className="h-11 rounded-[8px] px-6"
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
            className="h-11 rounded-[8px] px-6"
          >
            {deleting ? "삭제 중" : "삭제"}
          </Button>
        </div>
      </section>
    </div>
  );
}
