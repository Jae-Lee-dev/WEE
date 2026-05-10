"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { IconChevronDown } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  anomalyHistoryColumns,
  anomalyHistoryFilters,
  anomalyHistoryMetrics,
  anomalyHistoryRows,
  correctionColumns,
  correctionFilters,
  correctionMetrics,
  correctionRows,
  selectedAnomalyHistoryDetail,
  selectedCorrectionDetail,
  type AnomalyHistoryDetail,
  type AnomalyHistoryRow,
  type CorrectionDetail,
  type CorrectionRow,
  type RecordsFilterOption,
  type RecordsMetricCard,
  type RecordsTableColumn,
  type RecordsTone,
} from "./records-fixtures";

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

export function RecordAnomalyHistoryScreen() {
  const [selected, setSelected] = useState(false);

  return (
    <HistoryScreenShell
      screenTestId="record-anomaly-history-screen"
      filters={anomalyHistoryFilters}
      metrics={anomalyHistoryMetrics}
      left={
        <AnomalyHistoryTable
          selected={selected}
          onToggleSelected={() => setSelected((current) => !current)}
        />
      }
      right={
        selected ? (
          <AnomalyHistoryDetailPanel detail={selectedAnomalyHistoryDetail} />
        ) : (
          <EmptyDetailPanel />
        )
      }
    />
  );
}

export function RecordCorrectionsScreen() {
  const [selected, setSelected] = useState(false);

  return (
    <HistoryScreenShell
      screenTestId="record-corrections-screen"
      filters={correctionFilters}
      metrics={correctionMetrics}
      left={
        <CorrectionTable
          selected={selected}
          onToggleSelected={() => setSelected((current) => !current)}
        />
      }
      right={
        selected ? (
          <CorrectionDetailPanel detail={selectedCorrectionDetail} />
        ) : (
          <EmptyDetailPanel />
        )
      }
    />
  );
}

function HistoryScreenShell({
  screenTestId,
  filters,
  metrics,
  left,
  right,
}: {
  screenTestId: string;
  filters: Record<string, readonly RecordsFilterOption[]>;
  metrics: readonly RecordsMetricCard[];
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <section
      aria-label="근무 기록 이력"
      className="mx-auto flex w-full max-w-[1580px] flex-col gap-5"
      data-testid={screenTestId}
    >
      <FilterBar filters={filters} />

      <div className="grid min-h-[816px] grid-cols-[minmax(0,1fr)_360px] gap-5">
        <section className="min-w-0 overflow-hidden rounded-[8px] bg-white px-5 py-5">
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
    <div className="flex min-h-[41px] flex-wrap items-center gap-3">
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
          className="h-[118px] rounded-[8px] border border-gray-200 bg-white px-5 py-4"
        >
          <div className="text-h-18-semibold tracking-normal text-gray-900">
            {metric.label}
          </div>
          <div
            className="mt-5 text-[36px] font-semibold leading-[42px] tracking-normal"
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
  selected,
  onToggleSelected,
}: {
  selected: boolean;
  onToggleSelected: () => void;
}) {
  return (
    <HistoryTableFrame
      columns={anomalyHistoryColumns}
      headerGrid="grid-cols-[13%_13%_13%_13%_13%_13%_13%_1fr]"
    >
      {anomalyHistoryRows.map((row, index) => (
        <AnomalyHistoryTableRow
          key={row.id}
          row={row}
          selected={selected && index === 0}
          onToggleSelected={index === 0 ? onToggleSelected : undefined}
        />
      ))}
    </HistoryTableFrame>
  );
}

function AnomalyHistoryTableRow({
  row,
  selected,
  onToggleSelected,
}: {
  row: AnomalyHistoryRow;
  selected: boolean;
  onToggleSelected?: () => void;
}) {
  return (
    <div
      className={cn(
        "grid min-h-[61px] grid-cols-[13%_13%_13%_13%_13%_13%_13%_1fr] items-center border-b border-gray-100 px-5 text-h-18-regular tracking-normal text-gray-900 last:border-b-0",
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
          testId={
            onToggleSelected ? "record-anomaly-history-first-detail" : undefined
          }
          onClick={onToggleSelected}
          label={row.detailButtonLabel}
        />
      </div>
    </div>
  );
}

function CorrectionTable({
  selected,
  onToggleSelected,
}: {
  selected: boolean;
  onToggleSelected: () => void;
}) {
  return (
    <HistoryTableFrame
      columns={correctionColumns}
      headerGrid="grid-cols-[13%_13%_15%_13%_24%_10%_1fr]"
    >
      {correctionRows.map((row, index) => (
        <CorrectionTableRow
          key={row.id}
          row={row}
          selected={selected && index === 0}
          onToggleSelected={index === 0 ? onToggleSelected : undefined}
        />
      ))}
    </HistoryTableFrame>
  );
}

function CorrectionTableRow({
  row,
  selected,
  onToggleSelected,
}: {
  row: CorrectionRow;
  selected: boolean;
  onToggleSelected?: () => void;
}) {
  return (
    <div
      className={cn(
        "grid min-h-[61px] grid-cols-[13%_13%_15%_13%_24%_10%_1fr] items-center border-b border-gray-100 px-5 text-h-18-regular tracking-normal text-gray-900 last:border-b-0",
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
          testId={onToggleSelected ? "record-corrections-first-detail" : undefined}
          onClick={onToggleSelected}
          label={row.detailButtonLabel}
        />
      </div>
    </div>
  );
}

function HistoryTableFrame({
  columns,
  headerGrid,
  children,
}: {
  columns: readonly RecordsTableColumn[];
  headerGrid: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div
        className={cn(
          "grid h-[38px] items-center border-b border-gray-300 px-5 text-h-18-regular tracking-normal text-gray-500",
          headerGrid,
        )}
      >
        {columns.map((column) => (
          <TableCell key={column.id}>{column.label}</TableCell>
        ))}
      </div>
      <div>{children}</div>
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
        "flex h-[42px] min-w-[94px] items-center justify-center rounded-full px-4 text-h-18-regular tracking-normal transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 max-[1500px]:min-w-[86px] max-[1500px]:px-3",
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

function EmptyDetailPanel() {
  return (
    <div
      className="flex h-full min-h-[814px] items-center justify-center text-center text-h-18-regular leading-[28px] tracking-normal text-gray-400"
      data-testid="record-history-empty-detail"
    >
      <p>
        왼쪽 리스트에서
        <br />
        이상감지처리 이력을 선택하세요.
      </p>
    </div>
  );
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
        <p className="mt-3 text-h-18-regular leading-[26px] tracking-normal text-gray-900">
          {detail.reasonText}
        </p>
      </div>
      <DetailSection title={detail.originalTitle}>
        <DetailLineBox lines={detail.originalLines} />
      </DetailSection>
      <DetailSection title={detail.approvedTitle}>
        <DetailLineBox lines={detail.approvedLines} />
      </DetailSection>
      <div className="rounded-[8px] bg-green-50 px-4 py-4 text-body-16-regular leading-[26px] tracking-normal text-green-400">
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
      className="flex h-full min-h-[814px] flex-col gap-4 px-5 py-5"
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
          className="flex min-h-[52px] items-center justify-between gap-4 border-b border-gray-200 text-h-18-regular tracking-normal last:border-b-0"
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
