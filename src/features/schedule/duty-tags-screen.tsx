"use client";

import { useState, type CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconCheck, IconSearch } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  dutyTagEditDialog,
  dutyTagRows,
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

export function DutyTagsScreen() {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <section className="h-[calc(100vh-202px)] min-h-[760px] rounded-[8px] bg-white p-5">
      <div className="flex h-[42px] items-center justify-between">
        <h2 className="text-h-20 text-gray-900">근무지 태그 관리</h2>
        <Button
          type="button"
          variant="secondary"
          className="h-[42px] rounded-full px-4"
        >
          태그 추가
        </Button>
      </div>

      <div className="mt-5 flex flex-col gap-5">
        {dutyTagRows.map((tag, index) => (
          <DutyTagCard
            key={tag.id}
            tag={tag}
            first={index === 0}
            onEdit={() => setEditOpen(true)}
          />
        ))}
      </div>

      {editOpen ? (
        <DutyTagEditDialog onClose={() => setEditOpen(false)} />
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
    <div className="flex h-[82px] items-center justify-between rounded-[8px] border border-gray-100 px-4">
      <div className="flex items-center gap-3">
        <DutyTagBadge tag={tag} />
        <span className="text-h-18-semibold text-gray-900">{tag.countText}</span>
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="danger"
          className="h-[50px] rounded-[8px] px-6"
        >
          삭제
        </Button>
        <Button
          type="button"
          variant="secondary"
          data-testid={first ? "duty-tags-edit-trigger-first" : undefined}
          onClick={first ? onEdit : undefined}
          className="h-[50px] rounded-[8px] px-6"
        >
          수정
        </Button>
      </div>
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

function DutyTagEditDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[150px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="duty-tags-dialog-title"
        data-testid="duty-tags-edit-dialog"
        className="flex h-[780px] w-[680px] flex-col rounded-[8px] bg-white px-10 py-10 shadow-[0px_16px_44px_rgba(17,24,39,0.18)]"
      >
        <h2 id="duty-tags-dialog-title" className="text-h-20 text-gray-900">
          {dutyTagEditDialog.title}
        </h2>

        <label className="mt-10 block">
          <span className="text-h-18-semibold text-gray-900">태그명</span>
          <input
            readOnly
            value={dutyTagEditDialog.selectedTag.label}
            className="mt-3 h-[49px] w-full rounded-[8px] border border-gray-200 bg-gray-50 px-4 text-h-18-regular text-gray-500 outline-none"
          />
        </label>

        <div className="mt-8">
          <div className="flex items-center gap-2">
            <h3 className="text-h-18-semibold text-gray-900">
              현재 사용 중인 근무
            </h3>
            <Badge variant="grey" size="M">
              {dutyTagEditDialog.currentCountText}
            </Badge>
          </div>
          <label className="mt-3 flex h-[49px] items-center gap-3 rounded-[8px] border border-gray-200 bg-white px-4">
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

        <div className="mt-8 overflow-hidden rounded-[8px] border border-gray-100 py-1.5">
          {dutyTagEditDialog.duties.map((duty) => (
            <div
              key={duty.id}
              className="grid h-[49px] grid-cols-[72px_88px_1fr_20px] items-center border-b border-gray-100 px-4 last:border-b-0"
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
            className="h-[50px] rounded-[8px] px-6"
          >
            {dutyTagEditDialog.cancelLabel}
          </Button>
          <Button type="button" className="h-[50px] rounded-[8px] px-7">
            {dutyTagEditDialog.saveLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
