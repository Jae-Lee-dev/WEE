"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { IconCheck, IconChevronDown, IconChevronUp } from "@/shared/ui/icons";
import { FilterTabs } from "@/shared/ui/filter-tabs";
import { Pagination } from "@/shared/ui/pagination";
import { SearchField } from "@/shared/ui/search-field";
import { useWeeErrorToast } from "@/shared/ui/wee-toast";
import { cn } from "@/shared/lib/utils";
import {
  createWorkerListDataSource,
  emptyWorkerListData,
  type WorkerListDataSource,
} from "../api/workers-list-data-source";
import {
  type WorkerListData,
  type WorkerListRow,
  type WorkerListStatus,
  type WorkerTag,
  type WorkerTagTone,
} from "../model/workers-fixtures";

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
const defaultWorkersPageSize = 20;
const initialWorkerListUpdatedAt = "2026.05.13 10:30";

export function WorkersListScreen({
  dataSource: dataSourceProp,
}: {
  dataSource?: WorkerListDataSource;
} = {}) {
  const fallbackDataSource = useMemo(() => createWorkerListDataSource(), []);
  const dataSource = dataSourceProp ?? fallbackDataSource;
  const [listData, setListData] = useState<WorkerListData>(
    dataSource.initialData ?? emptyWorkerListData,
  );
  const [status, setStatus] = useState<WorkerListStatus>("active");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagLabel, setSelectedTagLabel] = useState<string | null>(null);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultWorkersPageSize);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(initialWorkerListUpdatedAt);
  const [loading, setLoading] = useState(!dataSource.initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  useWeeErrorToast(errorMessage);
  const rows = filterWorkerRows(listData.rowsByStatus[status], {
    searchQuery,
    selectedTagLabel,
  });
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedRows = rows.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize,
  );

  useEffect(() => {
    let active = true;

    void dataSource
      .listWorkers()
      .then((nextListData) => {
        if (!active) {
          return;
        }

        setListData(nextListData);
        setErrorMessage("");
        setLoading(false);

        if (!dataSource.initialData) {
          setLastUpdatedAt(formatWorkerListUpdatedAt(new Date()));
        }
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setErrorMessage("조교 목록을 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource]);

  async function handleRefresh() {
    setRefreshing(true);
    setErrorMessage("");

    try {
      const nextListData = await dataSource.listWorkers();

      setListData(nextListData);
      setCurrentPage(1);
      setLastUpdatedAt(formatWorkerListUpdatedAt(new Date()));
    } catch {
      setErrorMessage("조교 목록을 불러오지 못했습니다.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }

  function handleStatusChange(next: WorkerListStatus) {
    setStatus(next);
    setCurrentPage(1);
    setTagMenuOpen(false);
  }

  return (
    <section
      aria-label="조교 목록"
      className="flex h-[calc(100dvh-156px)] min-h-[520px] w-full flex-col gap-3"
      data-worker-list-state={status}
    >
      <div
        className="flex min-h-[43px] w-full shrink-0 items-center justify-between gap-4"
        data-testid="workers-filter-toolbar"
      >
        <div className="flex items-center gap-4">
          <TagFilterTrigger
            open={tagMenuOpen}
            selectedTagLabel={selectedTagLabel}
            tagOptions={listData.tagOptions}
            onClick={() => setTagMenuOpen((open) => !open)}
            onSelect={(nextTagLabel) => {
              setSelectedTagLabel(nextTagLabel);
              setCurrentPage(1);
              setTagMenuOpen(false);
            }}
          />
          <FilterTabs
            options={[...listData.statusFilters]}
            value={status}
            onChange={handleStatusChange}
          />
        </div>

        <SearchField
          aria-label="조교 이름 검색"
          className="h-[43px] w-[280px] shrink-0 border-0 px-4 py-0 [&_input]:text-gray-900 [&_svg]:text-green-400"
          debounceMs={300}
          onChange={(event) => {
            setSearchInput(event.target.value);
            setCurrentPage(1);
          }}
          onDebouncedValueChange={setSearchQuery}
          placeholder="이름 검색"
          value={searchInput}
        />
      </div>

      <WorkerListTable
        loading={loading}
        rows={pagedRows}
        currentPage={safeCurrentPage}
        lastUpdatedAt={lastUpdatedAt}
        pageSize={pageSize}
        refreshing={refreshing}
        totalItems={rows.length}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onRefresh={handleRefresh}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setCurrentPage(1);
        }}
        tagOptions={listData.tagOptions}
      />
    </section>
  );
}

function TagFilterTrigger({
  open,
  onClick,
  onSelect,
  selectedTagLabel,
  tagOptions,
}: {
  open: boolean;
  onClick: () => void;
  onSelect: (tagLabel: string | null) => void;
  selectedTagLabel: string | null;
  tagOptions: readonly WorkerTag[];
}) {
  const Icon = open ? IconChevronUp : IconChevronDown;
  const label = selectedTagLabel ?? "전체 근무자";

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
        <span className="min-w-0 truncate">{label}</span>
        <Icon className="size-5 shrink-0 text-gray-600" />
      </button>

      {open ? (
        <TagFilterMenu
          selectedTagLabel={selectedTagLabel}
          tagOptions={tagOptions}
          onSelect={onSelect}
        />
      ) : null}
    </div>
  );
}

function TagFilterMenu({
  onSelect,
  selectedTagLabel,
  tagOptions,
}: {
  onSelect: (tagLabel: string | null) => void;
  selectedTagLabel: string | null;
  tagOptions: readonly WorkerTag[];
}) {
  return (
    <div
      role="listbox"
      aria-label="근무자 태그 필터"
      data-testid="workers-tag-filter-menu"
      className="absolute left-0 top-[44px] z-30 w-[126px] overflow-hidden rounded-[4px] border border-gray-200 bg-white px-3 shadow-[0px_8px_20px_rgba(17,24,39,0.12)]"
    >
      <TagFilterOption
        selected={selectedTagLabel === null}
        label="전체"
        onSelect={() => onSelect(null)}
      />
      {tagOptions.map((tag, index) => (
        <TagFilterOption
          key={`${tag.label}-${index}`}
          selected={selectedTagLabel === tag.label}
          label={tag.label}
          onSelect={() => onSelect(tag.label)}
        />
      ))}
    </div>
  );
}

function TagFilterOption({
  label,
  onSelect,
  selected = false,
}: {
  label: string;
  onSelect: () => void;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className="flex h-11 w-full items-center justify-between gap-2 border-b border-gray-100 text-left text-h-18-regular text-gray-800 last:border-b-0 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200"
    >
      <span className="min-w-0 truncate">{label}</span>
      {selected ? <IconCheck className="size-5 shrink-0 text-green-400" /> : null}
    </button>
  );
}

function formatWorkerListUpdatedAt(date: Date) {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());
  const hours = padDatePart(date.getHours());
  const minutes = padDatePart(date.getMinutes());

  return `${year}.${month}.${day} ${hours}:${minutes}`;
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function filterWorkerRows(
  rows: readonly WorkerListRow[],
  {
    searchQuery,
    selectedTagLabel,
  }: {
    searchQuery: string;
    selectedTagLabel: string | null;
  },
) {
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase("ko-KR");

  return rows.filter((row) => {
    const matchesSearch =
      !normalizedQuery ||
      row.name.toLocaleLowerCase("ko-KR").includes(normalizedQuery);
    const matchesTag =
      selectedTagLabel === null || row.tag.label === selectedTagLabel;

    return matchesSearch && matchesTag;
  });
}

function WorkerListTable({
  currentPage,
  lastUpdatedAt,
  loading,
  onPageChange,
  onPageSizeChange,
  onRefresh,
  pageSize,
  refreshing,
  rows,
  tagOptions,
  totalItems,
  totalPages,
}: {
  currentPage: number;
  lastUpdatedAt: string;
  loading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRefresh: () => void | Promise<void>;
  pageSize: number;
  refreshing: boolean;
  rows: readonly WorkerListRow[];
  tagOptions: readonly WorkerTag[];
  totalItems: number;
  totalPages: number;
}) {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[8px] bg-white"
      data-testid="workers-list-frame"
    >
      <div
        className="flex h-[56px] shrink-0 items-center justify-between gap-4 px-4"
      >
        <h2 className="text-h-20 text-gray-900">조교 목록</h2>
        <div className="flex items-center gap-2 text-body-14-regular text-gray-500">
          <span>마지막 업데이트: {lastUpdatedAt}</span>
          <button
            type="button"
            aria-label="조교 목록 새로고침"
            title="새로고침"
            disabled={refreshing}
            onClick={onRefresh}
            className="flex size-8 items-center justify-center rounded-[8px] text-gray-600 transition-colors duration-150 ease-out hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
          >
            <RefreshCw className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid h-9 shrink-0 grid-cols-[15%_19%_24%_24%_1fr] items-center border-b border-gray-300 px-4 text-h-18-regular text-gray-500">
        <div>이름</div>
        <div>근무자 태그</div>
        <div>급여</div>
        <div>등록일</div>
        <div>소속 상태</div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto"
        data-testid="workers-table-scroll"
      >
        {loading ? (
          <WorkerListTableState label="조교 목록을 불러오는 중입니다." />
        ) : rows.length > 0 ? (
          rows.map((row) => <WorkerListRowItem key={row.id} row={row} />)
        ) : (
          <WorkerListTableState
            label={
              tagOptions.length > 0
                ? "조건에 맞는 조교가 없습니다."
                : "표시할 조교가 없습니다."
            }
          />
        )}
      </div>

      <Pagination
        className="shrink-0"
        currentPage={currentPage}
        itemLabel="명"
        pageSize={pageSize}
        totalItems={totalItems}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}

function WorkerListTableState({
  label,
  role = "status",
}: {
  label: string;
  role?: "alert" | "status";
}) {
  return (
    <div
      className="flex h-full min-h-[240px] items-center justify-center px-4 text-center text-h-18-regular text-gray-500"
      role={role}
    >
      {label}
    </div>
  );
}

function WorkerListRowItem({ row }: { row: WorkerListRow }) {
  const className = cn(
    "grid min-h-[42px] grid-cols-[15%_19%_24%_24%_1fr] items-center border-b border-gray-100 px-4 text-h-18-regular text-gray-900 last:border-b-0",
    row.detailHref &&
      "transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200",
  );
  const content = (
    <>
      <div>{row.name}</div>
      <div>
        <WorkerTagBadge tag={row.tag} />
      </div>
      <div>{row.pay}</div>
      <div>{row.registeredAt}</div>
      <div className="flex items-center gap-2">
        <WorkerStatusBadge status={row.status} />
        {row.statusDate ? (
          <span className="shrink-0 text-label-14-regular text-gray-500">
            {row.statusDate}부터
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
