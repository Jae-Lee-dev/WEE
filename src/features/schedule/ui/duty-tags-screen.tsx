"use client";

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
import { useWeeErrorToast } from "@/shared/ui/wee-toast";
import { cn } from "@/shared/lib/utils";
import {
  createDutyTagsDataSource,
  type DutyTagSaveInput,
  type DutyTagStatus,
  type DutyTagsDataSource,
} from "../api/duty-tags-data-source";
import {
  dutyTagEditDialog,
  type DutyTagDialogDuty,
  type DutyTagRow,
  type DutyTone,
} from "../model/duty-fixtures";

type BadgeToneConfig = {
  variant: "green" | "orange" | "red" | "blue" | "grey";
  style?: CSSProperties;
};

type DutyTagPanelMode = "view" | "edit";

const dutyTagToneConfig: Record<DutyTone, BadgeToneConfig> = {
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

const dutyTagToneOptions = [
  { label: "초록", value: "green" },
  { label: "파랑", value: "blue" },
  { label: "주황", value: "orange" },
  { label: "빨강", value: "red" },
  { label: "회색", value: "grey" },
] as const satisfies readonly SelectOption[];

const dutyTagStatusOptions = [
  { label: "활성", value: "active" },
  { label: "비활성", value: "inactive" },
] as const satisfies readonly SelectOption[];

const dutyTagFormControlClassName =
  "mt-3 !h-[var(--admin-control-height)] !min-h-[var(--admin-control-height)] w-full !rounded-[8px] border-gray-200 bg-white !px-4 !py-0 text-h-18-regular text-gray-900 disabled:bg-gray-50 disabled:text-gray-700";

export function DutyTagsScreen({
  dataSource: dataSourceProp,
}: {
  dataSource?: DutyTagsDataSource;
} = {}) {
  const fallbackDataSource = useMemo(() => createDutyTagsDataSource(), []);
  const dataSource = dataSourceProp ?? fallbackDataSource;
  const initialRows = dataSource.initialRows ?? [];
  const [tags, setTags] = useState<readonly DutyTagRow[]>(initialRows);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(
    initialRows[0]?.id ?? null,
  );
  const [panelMode, setPanelMode] = useState<DutyTagPanelMode>("view");
  const [loading, setLoading] = useState(!dataSource.initialRows);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  useWeeErrorToast(errorMessage, { title: "요청 실패" });
  const selectedTag =
    tags.find((row) => row.id === selectedTagId) ?? tags[0] ?? null;

  useEffect(() => {
    let active = true;

    void dataSource
      .listDutyTags()
      .then((nextTags) => {
        if (!active) {
          return;
        }

        setTags(nextTags);
        setSelectedTagId((currentId) => {
          if (currentId && nextTags.some((tag) => tag.id === currentId)) {
            return currentId;
          }

          return nextTags[0]?.id ?? null;
        });
        setPanelMode("view");
        setErrorMessage("");
        setLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setErrorMessage("근무 태그를 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource]);

  const handleSelectTag = (tag: DutyTagRow) => {
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

    setSelectedTagId(tags[0]?.id ?? null);
    setPanelMode("view");
  };

  const handleSaveTag = async (
    input: DutyTagSaveInput,
    currentTag?: DutyTagRow,
  ) => {
    setSaving(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      if (currentTag) {
        const tag = await dataSource.updateDutyTag(currentTag, input);

        setTags((currentTags) =>
          currentTags.map((row) => (row.id === tag.id ? tag : row)),
        );
        setSelectedTagId(tag.id);
        setPanelMode("view");
        setStatusMessage(`${tag.label} 근무 태그를 수정했습니다.`);
      } else {
        const tag = await dataSource.createDutyTag(input);

        setTags((currentTags) => [tag, ...currentTags]);
        setSelectedTagId(tag.id);
        setPanelMode("view");
        setCreateDialogOpen(false);
        setStatusMessage(`${tag.label} 근무 태그를 추가했습니다.`);
      }
    } catch {
      setErrorMessage("근무 태그를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTag = async (tag: DutyTagRow) => {
    setDeleting(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      await dataSource.deleteDutyTag(tag);

      const nextTags = tags.filter((row) => row.id !== tag.id);

      setTags(nextTags);
      setSelectedTagId(nextTags[0]?.id ?? null);
      setPanelMode("view");
      setStatusMessage(`${tag.label} 근무 태그를 삭제했습니다.`);
    } catch {
      setErrorMessage("근무 태그를 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section
      aria-label="근무 태그 목록"
      className="flex h-[calc(100vh-144px)] min-h-140 w-full flex-col gap-4"
      data-testid="duty-tags-screen"
    >
      {statusMessage ? (
        <div
          className="min-h-9 rounded-[8px] border border-green-100 bg-green-50 px-4 py-2.5 text-body-14-medium tracking-normal text-green-500"
          role="status"
        >
          {statusMessage}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(430px,1fr)_minmax(380px,520px)] gap-4">
        <DutyTagListPanel
          loading={loading}
          tags={tags}
          selectedTagId={selectedTagId}
          onCreate={handleStartCreate}
          onSelect={handleSelectTag}
        />
        <DutyTagDetailPanel
          key={selectedTag?.id ?? "empty"}
          dataSource={dataSource}
          deleting={deleting}
          firstSelected={tags[0]?.id === selectedTag?.id}
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
        <DutyTagCreateDialog
          dataSource={dataSource}
          saving={saving}
          onCancel={() => setCreateDialogOpen(false)}
          onSave={(input) => handleSaveTag(input)}
        />
      ) : null}
    </section>
  );
}

function DutyTagListPanel({
  loading,
  tags,
  selectedTagId,
  onCreate,
  onSelect,
}: {
  loading: boolean;
  tags: readonly DutyTagRow[];
  selectedTagId: string | null;
  onCreate: () => void;
  onSelect: (tag: DutyTagRow) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-[8px] bg-white">
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="text-h-20 text-gray-900">근무 태그 목록</h2>
          <Badge variant="grey" size="M">
            {tags.length}개
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

      <div className="grid h-9 shrink-0 grid-cols-[minmax(0,1fr)_148px_88px] items-center border-b border-gray-300 px-4 text-h-18-regular text-gray-500">
        <div>태그</div>
        <div>근무 수</div>
        <div data-testid="duty-tags-list-status-header">상태</div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <DutyTagListState label="근무 태그를 불러오는 중입니다." />
        ) : tags.length > 0 ? (
          tags.map((tag, index) => {
            const selected = tag.id === selectedTagId;

            return (
              <DutyTagListRow
                key={tag.id}
                first={index === 0}
                selected={selected}
                tag={tag}
                onSelect={() => onSelect(tag)}
              />
            );
          })
        ) : (
          <DutyTagListState label="표시할 근무 태그가 없습니다." />
        )}
      </div>
    </div>
  );
}

function DutyTagListRow({
  first,
  selected,
  tag,
  onSelect,
}: {
  first: boolean;
  selected: boolean;
  tag: DutyTagRow;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${tag.label} 근무 태그 조회`}
      data-testid={first ? "duty-tags-row-first" : undefined}
      onClick={onSelect}
      className={cn(
        "grid min-h-14 w-full grid-cols-[minmax(0,1fr)_148px_88px] items-center border-b border-gray-100 px-4 text-left text-h-18-regular tracking-normal text-gray-900 transition-colors duration-150 ease-out last:border-b-0 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200",
        selected &&
          "bg-green-50 ring-2 ring-inset ring-green-400 hover:bg-green-50",
      )}
    >
      <div className="min-w-0">
        <DutyTagBadge tag={tag} />
      </div>
      <div className="min-w-0 truncate text-gray-700">{tag.countText}</div>
      <div
        className="flex justify-start"
        data-testid={first ? "duty-tags-row-first-status" : undefined}
      >
        {tag.statusText ? <DutyTagStatusBadge tag={tag} /> : null}
      </div>
    </button>
  );
}

function DutyTagListState({
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

function DutyTagCreateDialog({
  dataSource,
  saving,
  onCancel,
  onSave,
}: {
  dataSource: DutyTagsDataSource;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: DutyTagSaveInput) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [tone, setTone] = useState<DutyTone>("green");
  const [status, setStatus] = useState<DutyTagStatus>("active");
  const [duties, setDuties] = useState<readonly DutyTagDialogDuty[]>([]);
  const [selectedDutyIds, setSelectedDutyIds] = useState<readonly string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [assignmentLoading, setAssignmentLoading] = useState(true);
  const [assignmentError, setAssignmentError] = useState("");
  useWeeErrorToast(assignmentError);
  const normalizedSearchText = debouncedSearchText
    .trim()
    .toLocaleLowerCase("ko-KR");
  const visibleDuties = filterDuties(duties, normalizedSearchText);
  const canSave =
    label.trim().length > 0 && !saving && !assignmentLoading && !assignmentError;

  useEffect(() => {
    let active = true;

    void dataSource
      .listDutyTagAssignments(null)
      .then((nextDuties) => {
        if (!active) {
          return;
        }

        setDuties(nextDuties);
        setSelectedDutyIds(
          nextDuties.filter((duty) => duty.checked).map((duty) => duty.id),
        );
        setAssignmentError("");
        setAssignmentLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setDuties([]);
        setSelectedDutyIds([]);
        setAssignmentError("근무 배정 정보를 불러오지 못했습니다.");
        setAssignmentLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource]);

  const toggleDuty = (duty: DutyTagDialogDuty) => {
    if (duty.disabled || saving) {
      return;
    }

    setSelectedDutyIds((currentIds) =>
      currentIds.includes(duty.id)
        ? currentIds.filter((dutyId) => dutyId !== duty.id)
        : [...currentIds, duty.id],
    );
  };

  const handleSave = () => {
    if (!canSave) {
      return;
    }

    void onSave({
      assignedDutyIds: selectedDutyIds,
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
        data-testid="duty-tags-create-dialog"
      >
        <DialogHeader className="shrink-0 gap-1 px-6 pt-6">
          <DialogTitle className="text-h-20 text-gray-900">
            근무 태그 추가
          </DialogTitle>
          <DialogDescription className="text-h-16-medium tracking-normal text-gray-500">
            태그 정보와 적용 근무를 저장합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-5 pt-5">
          <DutyTagFormFields
            disabled={saving}
            label={label}
            status={status}
            tone={tone}
            onLabelChange={setLabel}
            onStatusChange={setStatus}
            onToneChange={setTone}
          />

          <DutyTagAssignmentSearch
            assignmentError={assignmentError}
            assignmentLoading={assignmentLoading}
            countText={`${selectedDutyIds.length}건`}
            disabled={saving}
            searchText={searchText}
            title="적용할 근무"
            onDebouncedSearchTextChange={setDebouncedSearchText}
            onSearchTextChange={setSearchText}
          />

          <div className="mt-4 max-h-70 overflow-y-auto rounded-[8px] border border-gray-100">
            <DutyTagAssignmentList
              assignmentError={assignmentError}
              assignmentLoading={assignmentLoading}
              duties={visibleDuties}
              editable={true}
              saving={saving}
              selectedDutyIds={selectedDutyIds}
              onToggle={toggleDuty}
            />
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

function DutyTagDetailPanel({
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
  dataSource: DutyTagsDataSource;
  deleting: boolean;
  firstSelected: boolean;
  loading: boolean;
  mode: DutyTagPanelMode;
  saving: boolean;
  tag: DutyTagRow | null;
  onCancel: () => void;
  onDelete: (tag: DutyTagRow) => Promise<void>;
  onSave: (input: DutyTagSaveInput, currentTag?: DutyTagRow) => Promise<void>;
  onStartEdit: () => void;
}) {
  const editable = mode !== "view";
  const shouldLoadAssignments = !loading && Boolean(tag);
  const [label, setLabel] = useState(tag?.label ?? "");
  const [tone, setTone] = useState<DutyTone>(tag?.tone ?? "green");
  const [status, setStatus] = useState<DutyTagStatus>(
    getDutyTagStatusValue(tag),
  );
  const [duties, setDuties] = useState<readonly DutyTagDialogDuty[]>([]);
  const [selectedDutyIds, setSelectedDutyIds] = useState<readonly string[]>([]);
  const [committedDutyIds, setCommittedDutyIds] = useState<readonly string[]>(
    [],
  );
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [assignmentLoading, setAssignmentLoading] = useState(
    shouldLoadAssignments,
  );
  const [assignmentError, setAssignmentError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  useWeeErrorToast(assignmentError);
  const normalizedSearchText = debouncedSearchText
    .trim()
    .toLocaleLowerCase("ko-KR");
  const selectedDuties = duties.filter((duty) =>
    selectedDutyIds.includes(duty.id),
  );
  const visibleDuties = filterDuties(
    editable ? duties : selectedDuties,
    normalizedSearchText,
  );
  const fallbackCountText = getDutyTagAppliedCountText(tag);
  const currentCountText =
    assignmentError || (assignmentLoading && selectedDutyIds.length === 0)
      ? fallbackCountText
      : `${selectedDutyIds.length}건`;
  const title = mode === "edit" ? "근무 태그 수정" : "근무 태그 상세";
  const canSave =
    label.trim().length > 0 && !saving && !assignmentLoading && !assignmentError;

  useEffect(() => {
    let active = true;

    if (!shouldLoadAssignments) {
      return () => {
        active = false;
      };
    }

    void dataSource
      .listDutyTagAssignments(tag)
      .then((nextDuties) => {
        if (!active) {
          return;
        }

        const assignedDutyIds = nextDuties
          .filter((duty) => duty.checked)
          .map((duty) => duty.id);

        setDuties(nextDuties);
        setSelectedDutyIds(assignedDutyIds);
        setCommittedDutyIds(assignedDutyIds);
        setAssignmentError("");
        setAssignmentLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setDuties([]);
        setSelectedDutyIds([]);
        setCommittedDutyIds([]);
        setAssignmentError("근무 배정 정보를 불러오지 못했습니다.");
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
          태그를 선택하면 상세와 사용 중인 근무가 표시됩니다.
        </p>
      </aside>
    );
  }

  const toggleDuty = (duty: DutyTagDialogDuty) => {
    if (!editable || duty.disabled || saving) {
      return;
    }

    setSelectedDutyIds((currentIds) =>
      currentIds.includes(duty.id)
        ? currentIds.filter((dutyId) => dutyId !== duty.id)
        : [...currentIds, duty.id],
    );
  };

  const resetDraftToTag = () => {
    setLabel(tag.label);
    setTone(tag.tone);
    setStatus(getDutyTagStatusValue(tag));
    setSelectedDutyIds(committedDutyIds);
    setConfirmingDelete(false);
  };

  const handleSave = () => {
    if (!canSave || !tag) {
      return;
    }

    void onSave(
      {
        assignedDutyIds: selectedDutyIds,
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
        data-duty-tags-panel-mode={mode}
        data-testid="duty-tags-detail-panel"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-4">
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-h-20 text-gray-900">{title}</h2>
              <p className="mt-1 text-h-16-medium tracking-normal text-gray-500">
                {editable
                  ? "태그 정보와 적용 근무를 저장합니다."
                  : "태그 정보와 사용 중인 근무를 확인합니다."}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <DutyTagFormFields
              disabled={!editable || saving}
              label={label}
              status={status}
              tone={tone}
              onLabelChange={setLabel}
              onStatusChange={setStatus}
              onToneChange={setTone}
            />
          </div>

          <DutyTagAssignmentSearch
            assignmentError={assignmentError}
            assignmentLoading={assignmentLoading}
            countText={currentCountText}
            disabled={saving}
            searchText={searchText}
            title="현재 사용 중인 근무"
            onDebouncedSearchTextChange={setDebouncedSearchText}
            onSearchTextChange={setSearchText}
          />

          <div
            className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-[8px] border border-gray-100"
            data-testid="duty-tags-assignment-list"
          >
            <DutyTagAssignmentList
              assignmentError={assignmentError}
              assignmentLoading={assignmentLoading}
              duties={visibleDuties}
              editable={editable}
              saving={saving}
              selectedDutyIds={selectedDutyIds}
              onToggle={toggleDuty}
            />
          </div>
        </div>

        <div
          className="mt-auto flex h-16 shrink-0 items-center justify-end gap-3 px-4 pb-4 pt-4"
          data-testid="duty-tags-detail-actions"
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
                  firstSelected ? "duty-tags-edit-trigger-first" : undefined
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
        <DutyTagDeleteDialog
          deleting={deleting}
          onClose={() => {
            if (!deleting) {
              setConfirmingDelete(false);
            }
          }}
          onConfirm={onDelete}
          tag={tag}
        />
      ) : null}
    </>
  );
}

function DutyTagFormFields({
  disabled,
  label,
  status,
  tone,
  onLabelChange,
  onStatusChange,
  onToneChange,
}: {
  disabled: boolean;
  label: string;
  status: DutyTagStatus;
  tone: DutyTone;
  onLabelChange: (label: string) => void;
  onStatusChange: (status: DutyTagStatus) => void;
  onToneChange: (tone: DutyTone) => void;
}) {
  return (
    <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_124px_124px] gap-3">
      <label className="block">
        <span className="text-h-18-semibold text-gray-900">태그명</span>
        <Input
          aria-label="태그명"
          disabled={disabled}
          value={label}
          onChange={(event) => onLabelChange(event.target.value)}
          className={dutyTagFormControlClassName}
        />
      </label>
      <label className="block">
        <span className="text-h-18-semibold text-gray-900">색상</span>
        <OptionSelect
          value={tone}
          disabled={disabled}
          onValueChange={(value) => onToneChange(value as DutyTone)}
          options={[...dutyTagToneOptions]}
          triggerAriaLabel="색상"
          triggerClassName={dutyTagFormControlClassName}
          contentClassName="z-[70]"
          itemClassName="text-h-16-medium tracking-normal"
        />
      </label>
      <label className="block">
        <span className="text-h-18-semibold text-gray-900">상태</span>
        <OptionSelect
          value={status}
          disabled={disabled}
          onValueChange={(value) => onStatusChange(value as DutyTagStatus)}
          options={[...dutyTagStatusOptions]}
          triggerAriaLabel="상태"
          triggerClassName={dutyTagFormControlClassName}
          contentClassName="z-[70]"
          itemClassName="text-h-16-medium tracking-normal"
        />
      </label>
    </div>
  );
}

function DutyTagAssignmentSearch({
  assignmentError,
  assignmentLoading,
  countText,
  disabled,
  searchText,
  title,
  onDebouncedSearchTextChange,
  onSearchTextChange,
}: {
  assignmentError: string;
  assignmentLoading: boolean;
  countText: string;
  disabled: boolean;
  searchText: string;
  title: string;
  onDebouncedSearchTextChange: (value: string) => void;
  onSearchTextChange: (value: string) => void;
}) {
  return (
    <div className="mt-6 shrink-0">
      <div className="flex items-center gap-2">
        <h3 className="text-h-18-semibold text-gray-900">{title}</h3>
        {!assignmentError ? (
          <Badge variant="grey" size="M" className="min-w-10 tabular-nums">
            {assignmentLoading ? "-" : countText}
          </Badge>
        ) : null}
      </div>
      <SearchField
        aria-label="근무명 또는 근무지 검색"
        className="mt-3 h-11 rounded-[8px] border-gray-200 px-4 py-0 [&_input]:text-gray-900 [&_input]:disabled:text-gray-500 [&_svg]:text-green-400"
        debounceMs={300}
        disabled={disabled}
        onChange={(event) => onSearchTextChange(event.target.value)}
        onDebouncedValueChange={onDebouncedSearchTextChange}
        placeholder={dutyTagEditDialog.searchPlaceholder}
        value={searchText}
      />
    </div>
  );
}

function DutyTagAssignmentList({
  assignmentError,
  assignmentLoading,
  duties,
  editable,
  saving,
  selectedDutyIds,
  onToggle,
}: {
  assignmentError: string;
  assignmentLoading: boolean;
  duties: readonly DutyTagDialogDuty[];
  editable: boolean;
  saving: boolean;
  selectedDutyIds: readonly string[];
  onToggle: (duty: DutyTagDialogDuty) => void;
}) {
  if (assignmentLoading) {
    return <DutyTagAssignmentState label="근무 목록을 불러오는 중입니다." />;
  }

  if (assignmentError) {
    return <DutyTagAssignmentState label={assignmentError} role="alert" />;
  }

  if (duties.length === 0) {
    return (
      <DutyTagAssignmentState
        label={editable ? "표시할 근무가 없습니다." : "사용 중인 근무가 없습니다."}
      />
    );
  }

  return (
    <>
      {duties.map((duty) => {
        const checked = selectedDutyIds.includes(duty.id);

        return (
          <DutyTagAssignmentRow
            key={duty.id}
            checked={checked}
            duty={duty}
            editable={editable}
            saving={saving}
            onToggle={() => onToggle(duty)}
          />
        );
      })}
    </>
  );
}

function DutyTagAssignmentRow({
  checked,
  duty,
  editable,
  saving,
  onToggle,
}: {
  checked: boolean;
  duty: DutyTagDialogDuty;
  editable: boolean;
  saving: boolean;
  onToggle: () => void;
}) {
  const content = (
    <>
      <span className="min-w-0 truncate text-h-18-semibold text-gray-900">
        {duty.name}
      </span>
      <span className="min-w-0 truncate text-h-18-regular text-gray-600">
        {duty.location}
      </span>
      <span className="min-w-0 truncate border-l border-gray-100 pl-3 text-h-18-regular text-gray-600">
        {duty.weekdays}
      </span>
      {editable ? (
        <span
          aria-hidden="true"
          className={cn(
            "flex size-5 items-center justify-center justify-self-end rounded-xs",
            duty.disabled
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
      <div className="grid h-11 w-full grid-cols-[72px_88px_1fr] items-center border-b border-gray-100 px-4 last:border-b-0">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={checked}
      disabled={duty.disabled || saving}
      onClick={onToggle}
      className="grid h-11 w-full grid-cols-[72px_88px_1fr_20px] items-center border-b border-gray-100 px-4 text-left last:border-b-0 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200 disabled:cursor-not-allowed disabled:bg-gray-50"
    >
      {content}
    </button>
  );
}

function DutyTagAssignmentState({
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

function DutyTagDeleteDialog({
  deleting,
  onClose,
  onConfirm,
  tag,
}: {
  deleting: boolean;
  onClose: () => void;
  onConfirm: (tag: DutyTagRow) => Promise<void>;
  tag: DutyTagRow;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        data-testid="duty-tags-delete-confirm"
        className="w-[calc(100vw-32px)] max-w-[480px] rounded-[8px] bg-white px-6 py-6 text-gray-900 shadow-[0px_16px_44px_rgba(17,24,39,0.18)] ring-0 sm:max-w-[480px]"
      >
        <DialogTitle className="text-h-20 text-gray-900">
          근무 태그 삭제
        </DialogTitle>
        <DialogDescription className="mt-3 text-body-14-regular tracking-normal text-gray-500">
          {tag.label} 태그를 삭제하고 사용 중인 근무에서 이 태그를 제거합니다.
        </DialogDescription>
        <DialogFooter className="mx-0 mb-0 mt-8 flex-row justify-end gap-3 rounded-none border-0 bg-transparent p-0">
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

function DutyTagBadge({ tag }: { tag: DutyTagRow }) {
  const tone = dutyTagToneConfig[tag.tone];

  return (
    <Badge variant={tone.variant} size="L" style={tone.style}>
      {tag.label}
    </Badge>
  );
}

function DutyTagStatusBadge({ tag }: { tag: DutyTagRow }) {
  const tone = dutyTagToneConfig[tag.statusTone ?? "grey"];

  return (
    <Badge variant={tone.variant} size="M" style={tone.style}>
      {tag.statusText}
    </Badge>
  );
}

function getDutyTagStatusValue(tag: DutyTagRow | null): DutyTagStatus {
  return tag?.statusText === "비활성" ? "inactive" : "active";
}

function getDutyTagAppliedCountText(tag: DutyTagRow | null) {
  const count = tag?.countText.match(/\d+/)?.[0];

  return `${count ?? 0}건`;
}

function filterDuties(
  duties: readonly DutyTagDialogDuty[],
  normalizedSearchText: string,
) {
  return duties.filter((duty) => {
    if (!normalizedSearchText) {
      return true;
    }

    return [duty.name, duty.location, duty.weekdays].some((value) =>
      value.toLocaleLowerCase("ko-KR").includes(normalizedSearchText),
    );
  });
}
