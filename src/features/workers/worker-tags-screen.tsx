"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconCheck, IconSearch } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  createWorkerTagsDataSource,
  emptyWorkerTagRows,
  type WorkerTagsDataSource,
} from "./worker-tags-data-source";
import {
  workerTagEditDialog,
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
  const [editingTag, setEditingTag] = useState<WorkerTagRow | null>(null);
  const [loading, setLoading] = useState(!dataSource.initialRows);
  const [errorMessage, setErrorMessage] = useState("");

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

  return (
    <section className="min-h-[560px] rounded-[8px] bg-white p-4">
      <div className="flex h-9 items-center justify-between">
        <h2 className="text-h-20 text-gray-900">근무자 태그 관리</h2>
        <Button type="button" variant="secondary" className="h-9 rounded-full px-4">
          태그 추가
        </Button>
      </div>

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
            />
          ))
        ) : (
          <WorkerTagListState label="표시할 근무자 태그가 없습니다." />
        )}
      </div>

      {editingTag ? (
        <WorkerTagEditDialog
          tag={editingTag}
          onClose={() => setEditingTag(null)}
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
  onEdit,
}: {
  tag: WorkerTagRow;
  first: boolean;
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
  onClose,
  tag,
}: {
  onClose: () => void;
  tag: WorkerTagRow;
}) {
  const currentCountText = tag.countText.replace(/^적용 조교\s*/, "");

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
          근무자 태그 수정
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
            <h3 className="text-h-18-semibold text-gray-900">현재 받고 있는 조교</h3>
            <Badge variant="grey" size="M">
              {currentCountText}
            </Badge>
          </div>
          <label className="mt-3 flex h-11 items-center gap-3 rounded-[8px] border border-gray-200 bg-white px-4">
            <span className="sr-only">조교 이름 검색</span>
            <input
              readOnly
              value=""
              placeholder={workerTagEditDialog.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-h-18-regular text-gray-900 outline-none placeholder:text-gray-400"
            />
            <IconSearch className="size-6 shrink-0 text-green-400" />
          </label>
        </div>

        <div className="mt-6 min-h-0 overflow-y-auto rounded-[8px] border border-gray-100">
          {workerTagEditDialog.workers.map((worker) => (
            <div
              key={worker.id}
              className="flex h-11 items-center justify-between border-b border-gray-100 px-4 last:border-b-0"
            >
              <span className="text-h-18-semibold text-gray-900">
                {worker.name}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-5 items-center justify-center rounded-[2px]",
                  worker.disabled ? "bg-gray-200 text-white" : "bg-green-400 text-white",
                )}
              >
                {worker.checked ? <IconCheck className="size-4" /> : null}
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
            취소
          </Button>
          <Button
            type="button"
            className="h-11 rounded-[8px] px-7"
          >
            저장
          </Button>
        </div>
      </section>
    </div>
  );
}
