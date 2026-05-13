"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Badge } from "@/shared/ui/badge";
import { IconChevronDown } from "@/shared/ui/icons";
import { cn } from "@/shared/lib/utils";
import {
  createRecordsDataSource,
  shouldUseRecordsFixtureDataSource,
  type RecordsDataSource,
} from "../api/records-data-source";
import {
  anomalyHistoryColumns,
  anomalyHistoryFixtureViewModel,
  correctionColumns,
  correctionHistoryFixtureViewModel,
  type AnomalyHistoryDetail,
  type AnomalyHistoryRow,
  type AnomalyHistoryViewModel,
  type CorrectionDetail,
  type CorrectionHistoryViewModel,
  type CorrectionRow,
  type RecordsFilterOption,
  type RecordsMetricCard,
  type RecordsTableColumn,
  type RecordsTone,
} from "../model/records-fixtures";

type BadgeToneConfig = {
  variant: "green" | "orange" | "red" | "blue" | "grey";
  style?: CSSProperties;
};

const toneStyles = {
  green: { color: "var(--color-green-400)" },
  orange: { color: "var(--color-orange-400)" },
  pink: { color: "var(--color-red-500)" },
  blue: { color: "var(--color-blue-500)" },
  grey: { color: "var(--color-gray-600)" },
} satisfies Record<RecordsTone, CSSProperties>;

const badgeToneConfig = {
  green: { variant: "green", style: toneStyles.green },
  orange: { variant: "orange", style: toneStyles.orange },
  pink: { variant: "red", style: toneStyles.pink },
  blue: { variant: "blue", style: toneStyles.blue },
  grey: { variant: "grey", style: toneStyles.grey },
} satisfies Record<RecordsTone, BadgeToneConfig>;

export function RecordAnomalyHistoryScreen({
  dataSource: dataSourceProp,
}: {
  dataSource?: RecordsDataSource;
} = {}) {
  const fixtureMode = shouldUseRecordsFixtureDataSource();
  const fallbackDataSource = useMemo(() => createRecordsDataSource(), []);
  const dataSource = dataSourceProp ?? fallbackDataSource;
  const [viewModel, setViewModel] = useState<AnomalyHistoryViewModel>(
    fixtureMode ? anomalyHistoryFixtureViewModel : createEmptyAnomalyHistory(),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!fixtureMode);
  const [errorMessage, setErrorMessage] = useState("");
  const selectedDetail = selectedId ? viewModel.details[selectedId] : undefined;

  useEffect(() => {
    let active = true;

    void dataSource
      .getAnomalyHistory()
      .then((nextViewModel) => {
        if (!active) {
          return;
        }

        setViewModel(nextViewModel);
        setSelectedId(null);
        setLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setViewModel(createEmptyAnomalyHistory());
        setSelectedId(null);
        setErrorMessage("이상감지처리 이력을 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource]);

  return (
    <HistoryScreenShell
      screenTestId="record-anomaly-history-screen"
      errorMessage={errorMessage}
      filters={viewModel.filters}
      loading={loading}
      loadingMessage="이상감지처리 이력을 불러오는 중입니다."
      metrics={viewModel.metrics}
      left={
        <AnomalyHistoryTable
          rows={viewModel.rows}
          selectedId={selectedId}
          onToggleSelected={(rowId) =>
            setSelectedId((current) => (current === rowId ? null : rowId))
          }
        />
      }
      right={
        selectedDetail ? (
          <AnomalyHistoryDetailPanel detail={selectedDetail} />
        ) : (
          <EmptyDetailPanel lines={viewModel.emptyDetailText} />
        )
      }
    />
  );
}

export function RecordCorrectionsScreen({
  dataSource: dataSourceProp,
}: {
  dataSource?: RecordsDataSource;
} = {}) {
  const fixtureMode = shouldUseRecordsFixtureDataSource();
  const fallbackDataSource = useMemo(() => createRecordsDataSource(), []);
  const dataSource = dataSourceProp ?? fallbackDataSource;
  const [viewModel, setViewModel] = useState<CorrectionHistoryViewModel>(
    fixtureMode ? correctionHistoryFixtureViewModel : createEmptyCorrections(),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!fixtureMode);
  const [errorMessage, setErrorMessage] = useState("");
  const selectedDetail = selectedId ? viewModel.details[selectedId] : undefined;

  useEffect(() => {
    let active = true;

    void dataSource
      .getCorrections()
      .then((nextViewModel) => {
        if (!active) {
          return;
        }

        setViewModel(nextViewModel);
        setSelectedId(null);
        setLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setViewModel(createEmptyCorrections());
        setSelectedId(null);
        setErrorMessage("이의신청 이력을 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource]);

  return (
    <HistoryScreenShell
      screenTestId="record-corrections-screen"
      errorMessage={errorMessage}
      filters={viewModel.filters}
      loading={loading}
      loadingMessage="이의신청 이력을 불러오는 중입니다."
      metrics={viewModel.metrics}
      left={
        <CorrectionTable
          rows={viewModel.rows}
          selectedId={selectedId}
          onToggleSelected={(rowId) =>
            setSelectedId((current) => (current === rowId ? null : rowId))
          }
        />
      }
      right={
        selectedDetail ? (
          <CorrectionDetailPanel detail={selectedDetail} />
        ) : (
          <EmptyDetailPanel lines={viewModel.emptyDetailText} />
        )
      }
    />
  );
}

function HistoryScreenShell({
  errorMessage,
  screenTestId,
  filters,
  loading,
  loadingMessage,
  metrics,
  left,
  right,
}: {
  errorMessage: string;
  screenTestId: string;
  filters: Record<string, readonly RecordsFilterOption[]>;
  loading: boolean;
  loadingMessage: string;
  metrics: readonly RecordsMetricCard[];
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <section
      aria-label="근무 기록 이력"
      className="mx-auto flex w-full max-w-[1480px] flex-col gap-4"
      data-testid={screenTestId}
    >
      <FilterBar filters={filters} />

      {loading || errorMessage ? (
        <div
          className={cn(
            "flex min-h-9 items-center rounded-[8px] border px-4 py-2.5 text-body-14-medium tracking-normal",
            errorMessage
              ? "border-red-100 bg-red-50 text-red-500"
              : "border-green-100 bg-green-50 text-green-500",
          )}
          role={errorMessage ? "alert" : "status"}
        >
          {errorMessage || loadingMessage}
        </div>
      ) : null}

      <div className="grid min-h-[680px] grid-cols-[minmax(0,1fr)_320px] gap-4">
        <section className="min-w-0 overflow-hidden rounded-[8px] bg-white px-4 py-4">
          <MetricCards metrics={metrics} />
          <div className="mt-7">{left}</div>
        </section>
        <aside className="overflow-hidden rounded-[8px] border border-gray-300 bg-white">
          {right}
        </aside>
      </div>
    </section>
  );
}

function FilterBar({
  filters,
}: {
  filters: Record<string, readonly RecordsFilterOption[]>;
}) {
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-3">
      {Object.entries(filters).map(([id, options]) => {
        const selected = options.find((option) => option.selected) ?? options[0];

        return (
          <button
            key={id}
            type="button"
            className="flex h-10 items-center gap-2 rounded-[6px] border border-gray-200 bg-white px-2.5 text-h-18-regular tracking-normal text-gray-800 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
          >
            <span>{selected.label}</span>
            <IconChevronDown className="size-5 shrink-0 text-gray-600" />
          </button>
        );
      })}
    </div>
  );
}

function MetricCards({ metrics }: { metrics: readonly RecordsMetricCard[] }) {
  return (
    <div
      className={cn(
        "grid gap-4",
        metrics.length === 3 ? "grid-cols-3" : "grid-cols-4",
      )}
    >
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className="h-[118px] rounded-[8px] border border-gray-200 bg-white px-4 py-4"
        >
          <div className="text-h-18-semibold tracking-normal text-gray-900">
            {metric.label}
          </div>
          <div
            className="mt-5 text-h-32 tracking-normal"
            style={toneStyles[metric.tone]}
          >
            {metric.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function AnomalyHistoryTable({
  onToggleSelected,
  rows,
  selectedId,
}: {
  onToggleSelected: (rowId: string) => void;
  rows: readonly AnomalyHistoryRow[];
  selectedId: string | null;
}) {
  return (
    <HistoryTableFrame
      columns={anomalyHistoryColumns}
      empty={rows.length === 0}
      headerGrid="grid-cols-[13%_13%_13%_13%_13%_13%_13%_1fr]"
    >
      {rows.map((row, index) => (
        <AnomalyHistoryTableRow
          key={row.id}
          row={row}
          selected={selectedId === row.id}
          onToggleSelected={() => onToggleSelected(row.id)}
          testId={index === 0 ? "record-anomaly-history-first-detail" : undefined}
        />
      ))}
    </HistoryTableFrame>
  );
}

function AnomalyHistoryTableRow({
  row,
  selected,
  onToggleSelected,
  testId,
}: {
  row: AnomalyHistoryRow;
  selected: boolean;
  onToggleSelected: () => void;
  testId?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-h-11 grid-cols-[13%_13%_13%_13%_13%_13%_13%_1fr] items-center border-b border-gray-100 px-4 text-h-18-regular tracking-normal text-gray-900 last:border-b-0",
        selected && "bg-green-50",
      )}
    >
      <div>
        <StatusBadge
          label={row.status}
          tone={row.status === "처리 완료" ? "green" : "orange"}
        />
      </div>
      <TableCell>{row.referenceDate}</TableCell>
      <TableCell>{row.workerName}</TableCell>
      <TableCell>{row.dutyName}</TableCell>
      <div>
        <StatusBadge label={row.anomalyType} tone="pink" />
      </div>
      <TableCell>{row.result}</TableCell>
      <TableCell>{row.payrollResult}</TableCell>
      <div className="flex justify-end">
        <DetailToggleButton
          selected={selected}
          testId={testId}
          onClick={onToggleSelected}
          label={row.detailButtonLabel}
        />
      </div>
    </div>
  );
}

function CorrectionTable({
  onToggleSelected,
  rows,
  selectedId,
}: {
  onToggleSelected: (rowId: string) => void;
  rows: readonly CorrectionRow[];
  selectedId: string | null;
}) {
  return (
    <HistoryTableFrame
      columns={correctionColumns}
      empty={rows.length === 0}
      headerGrid="grid-cols-[13%_13%_15%_13%_24%_10%_1fr]"
    >
      {rows.map((row, index) => (
        <CorrectionTableRow
          key={row.id}
          row={row}
          selected={selectedId === row.id}
          onToggleSelected={() => onToggleSelected(row.id)}
          testId={index === 0 ? "record-corrections-first-detail" : undefined}
        />
      ))}
    </HistoryTableFrame>
  );
}

function CorrectionTableRow({
  row,
  selected,
  onToggleSelected,
  testId,
}: {
  row: CorrectionRow;
  selected: boolean;
  onToggleSelected: () => void;
  testId?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-h-11 grid-cols-[13%_13%_15%_13%_24%_10%_1fr] items-center border-b border-gray-100 px-4 text-h-18-regular tracking-normal text-gray-900 last:border-b-0",
        selected && "bg-green-50",
      )}
    >
      <TableCell>{row.submittedAt}</TableCell>
      <TableCell>{row.workerName}</TableCell>
      <TableCell>{row.recordName}</TableCell>
      <div>
        <StatusBadge
          label={row.status}
          tone={
            row.status === "승인"
              ? "green"
              : row.status === "처리 대기"
                ? "orange"
                : "pink"
          }
        />
      </div>
      <TableCell>{row.result}</TableCell>
      <div>
        <StatusBadge label={row.payrollResult} tone="green" />
      </div>
      <div className="flex justify-end">
        <DetailToggleButton
          selected={selected}
          testId={testId}
          onClick={onToggleSelected}
          label={row.detailButtonLabel}
        />
      </div>
    </div>
  );
}

function HistoryTableFrame({
  columns,
  empty,
  headerGrid,
  children,
}: {
  columns: readonly RecordsTableColumn[];
  empty: boolean;
  headerGrid: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div
        className={cn(
          "grid h-[38px] items-center border-b border-gray-300 px-4 text-h-18-regular tracking-normal text-gray-500",
          headerGrid,
        )}
      >
        {columns.map((column) => (
          <TableCell key={column.id}>{column.label}</TableCell>
        ))}
      </div>
      <div>
        {empty ? (
          <div className="flex h-40 items-center justify-center text-h-18-regular tracking-normal text-gray-400">
            표시할 이력이 없습니다.
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function DetailToggleButton({
  selected,
  testId,
  onClick,
  label,
}: {
  selected: boolean;
  testId?: string;
  onClick?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={cn(
        "flex h-9 min-w-[94px] items-center justify-center rounded-full px-4 text-h-18-regular tracking-normal transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 max-[1500px]:min-w-[86px] max-[1500px]:px-3",
        selected
          ? "bg-green-400 text-white hover:bg-green-450"
          : "border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50",
      )}
    >
      {selected ? "취소" : label}
    </button>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: RecordsTone }) {
  const config = badgeToneConfig[tone];

  return (
    <Badge variant={config.variant} size="M" style={config.style}>
      {label}
    </Badge>
  );
}

function TableCell({ children }: { children: ReactNode }) {
  return <div className="min-w-0 truncate">{children}</div>;
}

function EmptyDetailPanel({ lines }: { lines: readonly string[] }) {
  return (
    <div
      className="flex h-full min-h-[560px] items-center justify-center text-center text-h-18-regular leading-[24px] tracking-normal text-gray-400"
      data-testid="record-history-empty-detail"
    >
      <p>
        {lines.map((line, index) => (
          <span key={line}>
            {index > 0 ? <br /> : null}
            {line}
          </span>
        ))}
      </p>
    </div>
  );
}

function createEmptyAnomalyHistory(): AnomalyHistoryViewModel {
  return {
    ...anomalyHistoryFixtureViewModel,
    details: {},
    metrics: [
      { id: "submitted", label: "제출 유형", value: "0건", tone: "green" },
      { id: "pending", label: "처리 대기", value: "0건", tone: "orange" },
      { id: "edited-or-deleted", label: "수정/삭제", value: "0건", tone: "pink" },
    ],
    rows: [],
  };
}

function createEmptyCorrections(): CorrectionHistoryViewModel {
  return {
    ...correctionHistoryFixtureViewModel,
    details: {},
    metrics: [
      { id: "submitted", label: "제출 유형", value: "0건", tone: "green" },
      { id: "pending", label: "처리 대기", value: "0건", tone: "orange" },
      { id: "approved", label: "승인", value: "0건", tone: "green" },
      { id: "rejected-or-withdrawn", label: "반려/탈퇴", value: "0건", tone: "pink" },
    ],
    rows: [],
  };
}

function AnomalyHistoryDetailPanel({
  detail,
}: {
  detail: AnomalyHistoryDetail;
}) {
  return (
    <DetailPanel testId="record-anomaly-history-selected-detail">
      <DetailTitle detail={detail} />
      <DetailSection title={detail.beforeTitle}>
        <DetailLineBox lines={detail.beforeLines} />
      </DetailSection>
      <DetailSection title={detail.afterTitle}>
        <DetailLineBox lines={detail.afterLines} />
      </DetailSection>
      <DetailSection title={detail.infoTitle}>
        <DetailLineBox lines={detail.infoLines} />
      </DetailSection>
    </DetailPanel>
  );
}

function CorrectionDetailPanel({ detail }: { detail: CorrectionDetail }) {
  return (
    <DetailPanel testId="record-corrections-selected-detail">
      <DetailTitle detail={detail} />
      <div className="rounded-[8px] border border-gray-200 px-4 py-4">
        <div className="text-detail-16-semibold tracking-normal text-green-400">
          {detail.reasonTitle}
        </div>
        <p className="mt-3 text-h-18-regular leading-[22px] tracking-normal text-gray-900">
          {detail.reasonText}
        </p>
      </div>
      <DetailSection title={detail.originalTitle}>
        <DetailLineBox lines={detail.originalLines} />
      </DetailSection>
      <DetailSection title={detail.approvedTitle}>
        <DetailLineBox lines={detail.approvedLines} />
      </DetailSection>
      <div className="rounded-[8px] bg-green-50 px-4 py-4 text-body-16-regular leading-[22px] tracking-normal text-green-400">
        {detail.noteText}
      </div>
    </DetailPanel>
  );
}

function DetailPanel({
  children,
  testId,
}: {
  children: ReactNode;
  testId: string;
}) {
  return (
    <div
      className="flex h-full min-h-[560px] flex-col gap-4 px-4 py-4"
      data-testid={testId}
    >
      {children}
    </div>
  );
}

function DetailTitle({
  detail,
}: {
  detail: {
    badges: readonly { label: string; tone: RecordsTone }[];
    title: string;
    subtitle: string;
  };
}) {
  return (
    <header>
      <div className="flex flex-wrap gap-2">
        {detail.badges.map((badge) => (
          <StatusBadge key={badge.label} label={badge.label} tone={badge.tone} />
        ))}
      </div>
      <h2 className="mt-4 text-h-20 tracking-normal text-gray-900">
        {detail.title}
      </h2>
      <p className="mt-1.5 text-h-18-regular tracking-normal text-gray-400">
        {detail.subtitle}
      </p>
    </header>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 text-h-18-semibold tracking-normal text-gray-900">
        {title}
      </h3>
      {children}
    </section>
  );
}

function DetailLineBox({
  lines,
}: {
  lines: readonly {
    id: string;
    label: string;
    value: string;
    tone?: RecordsTone;
  }[];
}) {
  return (
    <div className="overflow-hidden rounded-[8px] border border-gray-200 px-4">
      {lines.map((line) => (
        <div
          key={line.id}
          className="flex min-h-11 items-center justify-between gap-4 border-b border-gray-200 text-h-18-regular tracking-normal last:border-b-0"
        >
          <div className="text-gray-500">{line.label}</div>
          <div
            className="text-right font-semibold text-gray-900"
            style={line.tone ? toneStyles[line.tone] : undefined}
          >
            {line.value}
          </div>
        </div>
      ))}
    </div>
  );
}
