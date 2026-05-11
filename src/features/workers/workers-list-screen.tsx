"use client";

import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconSearch,
} from "@/components/icons";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { cn } from "@/lib/utils";
import {
  workerListRowsByStatus,
  workerListStatusFilters,
  workerTagOptions,
  type WorkerListRow,
  type WorkerListStatus,
  type WorkerTag,
  type WorkerTagTone,
} from "./workers-fixtures";

type BadgeToneConfig = {
  variant: "green" | "red" | "grey";
  style?: CSSProperties;
};

const workerTagToneConfig: Record<WorkerTagTone, BadgeToneConfig> = {
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
};

const activeStatusStyle = { color: "var(--color-green-400)" };

export function WorkersListScreen() {
  const [status, setStatus] = useState<WorkerListStatus>("active");
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const rows = workerListRowsByStatus[status];

  return (
    <section
      aria-label="조교 목록"
      className="flex w-full flex-col gap-4"
      data-worker-list-state={status}
    >
      <div className="flex min-h-[38px] items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <TagFilterTrigger
            open={tagMenuOpen}
            onClick={() => setTagMenuOpen((open) => !open)}
          />
          <FilterTabs
            options={[...workerListStatusFilters]}
            value={status}
            onChange={(next) => {
              setStatus(next);
              setTagMenuOpen(false);
            }}
          />
        </div>

        <SearchShell className="w-[280px] shrink-0">
          <input
            readOnly
            type="search"
            value=""
            placeholder="이름 검색"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-gray-400"
            aria-label="조교 이름 검색"
          />
          <IconSearch className="size-6 shrink-0 text-green-400" />
        </SearchShell>
      </div>

      <WorkerListTable rows={rows} status={status} />
    </section>
  );
}

function TagFilterTrigger({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  const Icon = open ? IconChevronUp : IconChevronDown;

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        data-testid="workers-tag-filter-trigger"
        onClick={onClick}
        className="flex h-10 w-[126px] items-center justify-between rounded-[6px] border border-gray-200 bg-white px-2.5 text-h-18-regular text-gray-800 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] transition-colors duration-150 ease-out hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
      >
        <span>전체 근무자</span>
        <Icon className="size-5 shrink-0 text-gray-600" />
      </button>

      {open ? <TagFilterMenu /> : null}
    </div>
  );
}

function TagFilterMenu() {
  return (
    <div
      role="listbox"
      aria-label="근무자 태그 필터"
      data-testid="workers-tag-filter-menu"
      className="absolute left-0 top-[44px] z-30 w-[126px] overflow-hidden rounded-[4px] border border-gray-200 bg-white px-3 shadow-[0px_8px_20px_rgba(17,24,39,0.12)]"
    >
      <TagFilterOption selected label="전체" />
      {workerTagOptions.map((tag) => (
        <TagFilterOption key={tag.label} label={tag.label} />
      ))}
    </div>
  );
}

function TagFilterOption({
  label,
  selected = false,
}: {
  label: string;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className="flex h-11 w-full items-center justify-between gap-2 border-b border-gray-100 text-left text-h-18-regular text-gray-800 last:border-b-0 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200"
    >
      <span className="min-w-0 truncate">{label}</span>
      {selected ? <IconCheck className="size-5 shrink-0 text-green-400" /> : null}
    </button>
  );
}

function SearchShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex h-[43px] items-center gap-3 rounded-[6px] bg-white px-4 text-h-18-regular text-gray-900",
        className,
      )}
    >
      <span className="sr-only">조교 이름 검색</span>
      {children}
    </label>
  );
}

function WorkerListTable({
  rows,
  status,
}: {
  rows: readonly WorkerListRow[];
  status: WorkerListStatus;
}) {
  return (
    <div className="min-h-[560px] overflow-hidden rounded-[8px] bg-white">
      <div className="flex h-[56px] items-center gap-3 px-4">
        <h2 className="text-h-20 text-gray-900">조교 목록</h2>
        <span className="rounded-[4px] bg-gray-100 px-1.5 py-0.5 text-detail-16-regular text-gray-600">
          17/20명
        </span>
      </div>

      <div className="grid h-9 grid-cols-[15%_24%_19%_24%_1fr] items-center border-b border-gray-300 px-4 text-h-18-regular text-gray-500">
        <div>이름</div>
        <div>등록일</div>
        <div>근무자 태그</div>
        <div>급여</div>
        <div>소속 상태</div>
      </div>

      <div>
        {rows.map((row) => (
          <WorkerListRowItem key={row.id} row={row} status={status} />
        ))}
      </div>
    </div>
  );
}

function WorkerListRowItem({
  row,
  status,
}: {
  row: WorkerListRow;
  status: WorkerListStatus;
}) {
  const className = cn(
    "grid min-h-[42px] grid-cols-[15%_24%_19%_24%_1fr] items-center border-b border-gray-100 px-4 text-h-18-regular text-gray-900 last:border-b-0",
    status === "inactive" && "min-h-[60px]",
    row.detailHref &&
      "transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200",
  );
  const content = (
    <>
      <div>{row.name}</div>
      <div>{row.registeredAt}</div>
      <div>
        <WorkerTagBadge tag={row.tag} />
      </div>
      <div>{row.pay}</div>
      <div className="flex flex-col items-start gap-1">
        <WorkerStatusBadge status={row.status} />
        {row.statusDate ? (
          <span className="text-label-14-regular text-gray-500">
            {row.statusDate}
          </span>
        ) : null}
      </div>
    </>
  );

  if (row.detailHref) {
    return (
      <Link
        href={row.detailHref}
        aria-label={`${row.name} 조교 상세 보기`}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

function WorkerTagBadge({ tag }: { tag: WorkerTag }) {
  const tone = workerTagToneConfig[tag.tone];

  return (
    <Badge variant={tone.variant} size="M" style={tone.style}>
      {tag.label}
    </Badge>
  );
}

function WorkerStatusBadge({ status }: { status: "활성" | "비활성" }) {
  const active = status === "활성";

  return (
    <Badge
      variant={active ? "green" : "grey"}
      size="M"
      style={active ? activeStatusStyle : undefined}
    >
      {status}
    </Badge>
  );
}
