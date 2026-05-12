"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconCheck, IconSearch } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  createDutyTagsDataSource,
  type DutyTagsDataSource,
} from "./duty-tags-data-source";
import {
  dutyTagEditDialog,
  type DutyTagRow,
  type DutyTone,
} from "./duty-fixtures";

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
  const [errorMessage, setErrorMessage] = useState("");
  const [editingTag, setEditingTag] = useState<DutyTagRow | null>(null);

  useEffect(() => {
    let active = true;

    void dataSource
      .listDutyTags()
      .then((nextTags) => {
        if (!active) {
          return;
        }

        setTags(nextTags);
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

  return (
    <section className="h-[calc(100vh-144px)] min-h-[520px] rounded-[8px] bg-white p-4">
      <div className="flex h-9 items-center justify-between">
        <h2 className="text-h-20 text-gray-900">근무 태그 관리</h2>
        <Button
          type="button"
          variant="secondary"
          className="h-9 rounded-full px-4"
        >
          태그 추가
        </Button>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {loading ? (
          <DutyTagState label="근무 태그를 불러오는 중입니다." />
        ) : errorMessage ? (
          <DutyTagState label={errorMessage} role="alert" />
        ) : tags.length > 0 ? (
          tags.map((tag, index) => (
            <DutyTagCard
              key={tag.id}
              tag={tag}
              first={index === 0}
              onEdit={() => setEditingTag(tag)}
            />
          ))
        ) : (
          <DutyTagState label="표시할 근무 태그가 없습니다." />
        )}
      </div>

      {editingTag ? (
        <DutyTagEditDialog
          tag={editingTag}
          onClose={() => setEditingTag(null)}
        />
      ) : null}
    </section>
  );
}

function DutyTagCard({
  tag,
  first,
  onEdit,
}: {
  tag: DutyTagRow;
  first: boolean;
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
  onClose,
  tag,
}: {
  onClose: () => void;
  tag: DutyTagRow;
}) {
  const currentCountText = tag.countText.replace(/^사용 근무\s*/, "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="duty-tags-dialog-title"
        data-testid="duty-tags-edit-dialog"
        className="flex max-h-[calc(100dvh-48px)] w-[calc(100vw-32px)] max-w-[620px] flex-col rounded-[8px] bg-white p-8 shadow-[0px_16px_44px_rgba(17,24,39,0.18)]"
      >
        <h2 id="duty-tags-dialog-title" className="text-h-20 text-gray-900">
          {dutyTagEditDialog.title}
        </h2>

        <label className="mt-8 block">
          <span className="text-h-18-semibold text-gray-900">태그명</span>
          <input
            readOnly
            value={tag.label}
            className="mt-3 h-11 w-full rounded-[8px] border border-gray-200 bg-gray-50 px-4 text-h-18-regular text-gray-500 outline-none"
          />
        </label>

        <div className="mt-8">
          <div className="flex items-center gap-2">
            <h3 className="text-h-18-semibold text-gray-900">
              현재 사용 중인 근무
            </h3>
            <Badge variant="grey" size="M">
              {currentCountText}
            </Badge>
          </div>
          <label className="mt-3 flex h-11 items-center gap-3 rounded-[8px] border border-gray-200 bg-white px-4">
            <span className="sr-only">근무명 또는 근무지 검색</span>
            <input
              readOnly
              value=""
              placeholder={dutyTagEditDialog.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-h-18-regular text-gray-900 outline-none placeholder:text-gray-400"
            />
            <IconSearch className="size-6 shrink-0 text-green-400" />
          </label>
        </div>

        <div className="mt-6 min-h-0 overflow-y-auto rounded-[8px] border border-gray-100 py-1.5">
          {dutyTagEditDialog.duties.map((duty) => (
            <div
              key={duty.id}
              className="grid h-11 grid-cols-[72px_88px_1fr_20px] items-center border-b border-gray-100 px-4 last:border-b-0"
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
                    : "bg-green-400 text-white",
                )}
              >
                {duty.checked ? <IconCheck className="size-4" /> : null}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-auto flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="h-11 rounded-[8px] px-6"
          >
            {dutyTagEditDialog.cancelLabel}
          </Button>
          <Button type="button" className="h-11 rounded-[8px] px-7">
            {dutyTagEditDialog.saveLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
