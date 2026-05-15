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

export function DutyTagsScreen({
  dataSource: dataSourceProp,
}: {
  dataSource?: DutyTagsDataSource;
} = {}) {
  const fallbackDataSource = useMemo(() => createDutyTagsDataSource(), []);
  const dataSource = dataSourceProp ?? fallbackDataSource;
  const [tags, setTags] = useState<readonly DutyTagRow[]>(
    dataSource.initialRows ?? [],
  );
  const [loading, setLoading] = useState(!dataSource.initialRows);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  useWeeErrorToast(errorMessage, { title: "요청 실패" });
  const [editingTag, setEditingTag] = useState<DutyTagRow | "create" | null>(
    null,
  );
  const [deleteCandidate, setDeleteCandidate] = useState<DutyTagRow | null>(null);

  useEffect(() => {
    let active = true;

    void dataSource
      .listDutyTags()
      .then((nextTags) => {
        if (!active) {
          return;
        }

        setTags(nextTags);
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
        setStatusMessage(`${tag.label} 근무 태그를 수정했습니다.`);
      } else {
        const tag = await dataSource.createDutyTag(input);

        setTags((currentTags) => [tag, ...currentTags]);
        setStatusMessage(`${tag.label} 근무 태그를 추가했습니다.`);
      }

      setEditingTag(null);
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
      setTags((currentTags) => currentTags.filter((row) => row.id !== tag.id));
      setStatusMessage(`${tag.label} 근무 태그를 삭제했습니다.`);
      setDeleteCandidate(null);
    } catch {
      setErrorMessage("근무 태그를 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="h-[calc(100vh-144px)] min-h-[520px] rounded-[8px] bg-white p-4">
      <div className="flex h-9 items-center justify-between">
        <h2 className="text-h-20 text-gray-900">근무 태그 관리</h2>
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

      {statusMessage ? (
        <div
          className="mt-4 min-h-9 rounded-[8px] border border-green-100 bg-green-50 px-4 py-2.5 text-body-14-medium tracking-normal text-green-500"
          role="status"
        >
          {statusMessage}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-4">
        {loading ? (
          <DutyTagState label="근무 태그를 불러오는 중입니다." />
        ) : tags.length > 0 ? (
          tags.map((tag, index) => (
            <DutyTagCard
              key={tag.id}
              tag={tag}
              first={index === 0}
              onEdit={() => setEditingTag(tag)}
              onDelete={() => setDeleteCandidate(tag)}
            />
          ))
        ) : (
          <DutyTagState label="표시할 근무 태그가 없습니다." />
        )}
      </div>

      {editingTag ? (
        <DutyTagEditDialog
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
        <DutyTagDeleteDialog
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

function DutyTagCard({
  tag,
  first,
  onDelete,
  onEdit,
}: {
  tag: DutyTagRow;
  first: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="flex h-[68px] items-center justify-between rounded-[8px] border border-gray-100 px-4">
      <div className="flex items-center gap-3">
        <DutyTagBadge tag={tag} />
        <span className="text-h-18-semibold text-gray-900">{tag.countText}</span>
      </div>
      <div className="flex items-center gap-3">
        {tag.statusText ? <DutyTagStatusBadge tag={tag} /> : null}
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
          data-testid={first ? "duty-tags-edit-trigger-first" : undefined}
          onClick={onEdit}
          className="h-11 rounded-[8px] px-6"
        >
          수정
        </Button>
      </div>
    </div>
  );
}

function DutyTagState({
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

function DutyTagEditDialog({
  dataSource,
  onClose,
  onSave,
  saving,
  tag,
}: {
  dataSource: DutyTagsDataSource;
  onClose: () => void;
  onSave: (input: DutyTagSaveInput, currentTag?: DutyTagRow) => Promise<void>;
  saving: boolean;
  tag: DutyTagRow | null;
}) {
  const [label, setLabel] = useState(tag?.label ?? "");
  const [tone, setTone] = useState<DutyTone>(tag?.tone ?? "green");
  const [status, setStatus] = useState<DutyTagStatus>(
    tag?.statusText === "비활성" ? "inactive" : "active",
  );
  const [duties, setDuties] = useState<readonly DutyTagDialogDuty[]>([]);
  const [selectedDutyIds, setSelectedDutyIds] = useState<readonly string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [assignmentLoading, setAssignmentLoading] = useState(true);
  const normalizedSearchText = debouncedSearchText
    .trim()
    .toLocaleLowerCase("ko-KR");
  const visibleDuties = duties.filter((duty) => {
    if (!normalizedSearchText) {
      return true;
    }

    return [duty.name, duty.location, duty.weekdays].some((value) =>
      value.toLocaleLowerCase("ko-KR").includes(normalizedSearchText),
    );
  });
  const currentCountText = `${selectedDutyIds.length}건`;
  const title = tag ? dutyTagEditDialog.title : "근무 태그 추가";
  const canSave = label.trim().length > 0 && !saving && !assignmentLoading;

  useEffect(() => {
    let active = true;

    void dataSource
      .listDutyTagAssignments(tag)
      .then((nextDuties) => {
        if (!active) {
          return;
        }

        setDuties(nextDuties);
        setSelectedDutyIds(
          nextDuties.filter((duty) => duty.checked).map((duty) => duty.id),
        );
        setAssignmentLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setDuties([]);
        setSelectedDutyIds([]);
        setAssignmentLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource, tag]);

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

    void onSave(
      {
        assignedDutyIds: selectedDutyIds,
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
        data-testid="duty-tags-edit-dialog"
        className="flex max-h-[calc(100dvh-48px)] w-[calc(100vw-32px)] max-w-[620px] flex-col rounded-[8px] bg-white p-8 text-gray-900 shadow-[0px_16px_44px_rgba(17,24,39,0.18)] ring-0"
      >
        <DialogTitle className="text-h-20 text-gray-900">
          {title}
        </DialogTitle>

        <div className="mt-8 grid grid-cols-[1fr_140px_140px] gap-3">
          <label className="block">
            <span className="text-h-18-semibold text-gray-900">태그명</span>
            <Input
              aria-label="태그명"
              size="lg"
              disabled={saving}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              className="mt-3 w-full rounded-[8px] border-gray-200 bg-white text-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </label>
          <label className="block">
            <span className="text-h-18-semibold text-gray-900">색상</span>
            <OptionSelect
              value={tone}
              size="lg"
              disabled={saving}
              onValueChange={(value) => setTone(value as DutyTone)}
              options={[...dutyTagToneOptions]}
              triggerAriaLabel="색상"
              triggerClassName="mt-3 w-full rounded-[8px] border-gray-200 bg-white"
              contentClassName="z-[70]"
              itemClassName="text-h-16-medium tracking-normal"
            />
          </label>
          <label className="block">
            <span className="text-h-18-semibold text-gray-900">상태</span>
            <OptionSelect
              value={status}
              size="lg"
              disabled={saving}
              onValueChange={(value) => setStatus(value as DutyTagStatus)}
              options={[...dutyTagStatusOptions]}
              triggerAriaLabel="상태"
              triggerClassName="mt-3 w-full rounded-[8px] border-gray-200 bg-white"
              contentClassName="z-[70]"
              itemClassName="text-h-16-medium tracking-normal"
            />
          </label>
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-2">
            <h3 className="text-h-18-semibold text-gray-900">
              현재 사용 중인 근무
            </h3>
            <Badge variant="grey" size="M">
              {currentCountText}
            </Badge>
          </div>
          <SearchField
            aria-label="근무명 또는 근무지 검색"
            className="mt-3 h-11 rounded-[8px] border-gray-200 px-4 py-0 [&_input]:text-gray-900 [&_input]:disabled:text-gray-500 [&_svg]:text-green-400"
            debounceMs={300}
            disabled={saving}
            onChange={(event) => setSearchText(event.target.value)}
            onDebouncedValueChange={setDebouncedSearchText}
            placeholder={dutyTagEditDialog.searchPlaceholder}
            value={searchText}
          />
        </div>

        <div className="mt-6 min-h-0 overflow-y-auto rounded-[8px] border border-gray-100 py-1.5">
          {assignmentLoading ? (
            <div className="flex h-24 items-center justify-center text-h-18-regular text-gray-500">
              근무 목록을 불러오는 중입니다.
            </div>
          ) : visibleDuties.length > 0 ? (
            visibleDuties.map((duty) => {
              const checked = selectedDutyIds.includes(duty.id);

              return (
                <button
                  key={duty.id}
                  type="button"
                  disabled={duty.disabled || saving}
                  onClick={() => toggleDuty(duty)}
                  className="grid h-11 w-full grid-cols-[72px_88px_1fr_20px] items-center border-b border-gray-100 px-4 text-left last:border-b-0 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200 disabled:cursor-not-allowed disabled:bg-gray-50"
                >
                  <span className="min-w-0 truncate text-h-18-semibold text-gray-900">
                    {duty.name}
                  </span>
                  <span className="min-w-0 truncate text-h-18-regular text-gray-600">
                    {duty.location}
                  </span>
                  <span className="min-w-0 truncate border-l border-gray-100 pl-3 text-h-18-regular text-gray-600">
                    {duty.weekdays}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-5 items-center justify-center justify-self-end rounded-[2px]",
                      duty.disabled
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
              표시할 근무가 없습니다.
            </div>
          )}
        </div>

        <DialogFooter className="-mx-0 -mb-0 mt-auto flex-row justify-end gap-3 rounded-none border-0 bg-transparent p-0">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={onClose}
            className="h-11 rounded-[8px] px-6"
          >
            {dutyTagEditDialog.cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            onClick={handleSave}
            className="h-11 rounded-[8px] px-7"
          >
            {saving ? "저장 중" : dutyTagEditDialog.saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
        className="w-[calc(100vw-32px)] max-w-[420px] rounded-[8px] bg-white p-6 text-gray-900 shadow-[0px_16px_44px_rgba(17,24,39,0.18)] ring-0"
      >
        <DialogTitle className="text-h-20 text-gray-900">
          근무 태그 삭제
        </DialogTitle>
        <p className="mt-4 text-h-18-regular leading-[1.5] text-gray-700">
          {tag.label} 태그를 삭제하고 사용 중인 근무에서 이 태그를 제거합니다.
        </p>
        <DialogFooter className="-mx-0 -mb-0 mt-6 flex-row justify-end gap-3 rounded-none border-0 bg-transparent p-0">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
