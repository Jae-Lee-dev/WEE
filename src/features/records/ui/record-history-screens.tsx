"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Badge } from "@/shared/ui/badge";
import { OptionSelect } from "@/shared/ui/select";
import { useWeeErrorToast } from "@/shared/ui/wee-toast";
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
  overtimeHistoryColumns,
  overtimeHistoryFixtureViewModel,
  type AnomalyHistoryDetail,
  type AnomalyHistoryRow,
  type AnomalyHistoryViewModel,
  type CorrectionDetail,
  type CorrectionHistoryViewModel,
  type CorrectionRow,
  type OvertimeHistoryDetail,
  type OvertimeHistoryRow,
  type OvertimeHistoryViewModel,
  type RecordsFilterOption,
  type RecordsMetricCard,
  type RecordsTableColumn,
  type RecordsTone,
} from "../model/records-fixtures";

type BadgeToneConfig = {
  variant: "green" | "orange" | "red" | "blue" | "grey";
  style?: CSSProperties;
};

type HistoryFilterValues = Record<string, string>;

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
  const [filterValues, setFilterValues] = useState<HistoryFilterValues>({
    location: "all",
    payroll: "all",
    period: "all",
    status: "all",
  });
  const filteredRows = useMemo(
    () =>
      getFilteredCorrectionRows(viewModel.rows, filterValues, viewModel.filters),
    [filterValues, viewModel.filters, viewModel.rows],
  );
  const visibleSelectedId =
    selectedId && filteredRows.some((row) => row.id === selectedId)
      ? selectedId
      : null;
  const selectedDetail = visibleSelectedId
    ? viewModel.details[visibleSelectedId]
    : undefined;

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
      filterValues={filterValues}
      loading={loading}
      loadingMessage="이의신청 이력을 불러오는 중입니다."
      metrics={createCorrectionMetrics(filteredRows)}
      onFilterChange={(filterId, value) => {
        setSelectedId(null);
        setFilterValues((current) => ({
          ...current,
          [filterId]: value,
        }));
      }}
      left={
        <CorrectionTable
          rows={filteredRows}
          selectedId={visibleSelectedId}
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

export function RecordOvertimeHistoryScreen({
  dataSource: dataSourceProp,
}: {
  dataSource?: RecordsDataSource;
} = {}) {
  const fixtureMode = shouldUseRecordsFixtureDataSource();
  const fallbackDataSource = useMemo(() => createRecordsDataSource(), []);
  const dataSource = dataSourceProp ?? fallbackDataSource;
  const [viewModel, setViewModel] = useState<OvertimeHistoryViewModel>(
    fixtureMode ? overtimeHistoryFixtureViewModel : createEmptyOvertimeHistory(),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!fixtureMode);
  const [errorMessage, setErrorMessage] = useState("");
  const selectedDetail = selectedId ? viewModel.details[selectedId] : undefined;

  useEffect(() => {
    let active = true;

    void dataSource
      .getOvertimeHistory()
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

        setViewModel(createEmptyOvertimeHistory());
        setSelectedId(null);
        setErrorMessage("추가근무 이력을 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource]);

  return (
    <HistoryScreenShell
      screenTestId="record-overtime-history-screen"
      errorMessage={errorMessage}
      filters={viewModel.filters}
      loading={loading}
      loadingMessage="추가근무 이력을 불러오는 중입니다."
      metrics={viewModel.metrics}
      left={
        <OvertimeHistoryTable
          rows={viewModel.rows}
          selectedId={selectedId}
          onToggleSelected={(rowId) =>
            setSelectedId((current) => (current === rowId ? null : rowId))
          }
        />
      }
      right={
        selectedDetail ? (
          <OvertimeHistoryDetailPanel detail={selectedDetail} />
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
  filterValues,
  loading,
  loadingMessage,
  metrics,
  onFilterChange,
  left,
  right,
}: {
  errorMessage: string;
  screenTestId: string;
  filters: Record<string, readonly RecordsFilterOption[]>;
  filterValues?: HistoryFilterValues;
  loading: boolean;
  loadingMessage: string;
  metrics: readonly RecordsMetricCard[];
  onFilterChange?: (filterId: string, value: string) => void;
  left: ReactNode;
  right: ReactNode;
}) {
  useWeeErrorToast(errorMessage);

  return (
    <section
      aria-label="근무 기록 이력"
      className="mx-auto flex w-full max-w-[1480px] flex-col gap-4"
      data-testid={screenTestId}
    >
      <FilterBar
        filters={filters}
        values={filterValues}
        onChange={onFilterChange}
      />

      {loading || errorMessage ? (
        <HistoryContentState
          label={loading ? loadingMessage : "이력을 표시할 수 없습니다."}
        />
      ) : (
        <div className="grid min-h-[680px] grid-cols-[minmax(0,1fr)_320px] gap-4">
          <section className="min-w-0 overflow-hidden rounded-[8px] bg-white px-4 py-4">
            <MetricCards metrics={metrics} />
            <div className="mt-7">{left}</div>
          </section>
          <aside className="overflow-hidden rounded-[8px] border border-gray-300 bg-white">
            {right}
          </aside>
        </div>
      )}
    </section>
  );
}

function HistoryContentState({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-[680px] items-center justify-center rounded-[8px] bg-white px-4 text-center text-h-18-regular tracking-normal text-gray-500"
      role="status"
    >
      {label}
    </div>
  );
}

function FilterBar({
  filters,
  onChange,
  values,
}: {
  filters: Record<string, readonly RecordsFilterOption[]>;
  onChange?: (filterId: string, value: string) => void;
  values?: HistoryFilterValues;
}) {
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-3">
      {Object.entries(filters).map(([id, options]) => {
        const defaultSelected =
          options.find((option) => option.selected) ?? options[0];
        const value = options.some((option) => option.id === values?.[id])
          ? values?.[id]
          : defaultSelected?.id;

        return (
          <OptionSelect
            key={id}
            value={value}
            onValueChange={(nextValue) => onChange?.(id, nextValue)}
            options={options.map((option) => ({
              label: option.label,
              value: option.id,
            }))}
            triggerAriaLabel={`${defaultSelected?.label ?? "필터"} 필터`}
            triggerClassName="h-10 rounded-[6px] border-gray-200 bg-white px-2.5 text-h-18-regular tracking-normal text-gray-800 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] focus-visible:ring-green-200"
            contentClassName="z-[70]"
            itemClassName="text-h-16-medium tracking-normal"
          />
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
        <StatusBadge
          label={row.payrollResult}
          tone={getCorrectionPayrollTone(row.payrollResult)}
        />
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

function OvertimeHistoryTable({
  onToggleSelected,
  rows,
  selectedId,
}: {
  onToggleSelected: (rowId: string) => void;
  rows: readonly OvertimeHistoryRow[];
  selectedId: string | null;
}) {
  return (
    <HistoryTableFrame
      columns={overtimeHistoryColumns}
      empty={rows.length === 0}
      headerGrid="grid-cols-[13%_13%_15%_17%_11%_13%_1fr]"
    >
      {rows.map((row, index) => (
        <OvertimeHistoryTableRow
          key={row.id}
          row={row}
          selected={selectedId === row.id}
          onToggleSelected={() => onToggleSelected(row.id)}
          testId={
            index === 0 ? "record-overtime-history-first-detail" : undefined
          }
        />
      ))}
    </HistoryTableFrame>
  );
}

function OvertimeHistoryTableRow({
  row,
  selected,
  onToggleSelected,
  testId,
}: {
  row: OvertimeHistoryRow;
  selected: boolean;
  onToggleSelected: () => void;
  testId?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-h-11 grid-cols-[13%_13%_15%_17%_11%_13%_1fr] items-center border-b border-gray-100 px-4 text-h-18-regular tracking-normal text-gray-900 last:border-b-0",
        selected && "bg-green-50",
      )}
    >
      <TableCell>{row.submittedAt}</TableCell>
      <TableCell>{row.workerName}</TableCell>
      <TableCell>{row.recordName}</TableCell>
      <TableCell>{row.time}</TableCell>
      <div>
        <StatusBadge
          label={row.status}
          tone={getOvertimeStatusTone(row.status)}
        />
      </div>
      <div>
        <StatusBadge
          label={row.payrollResult}
          tone={getOvertimePayrollTone(row.payrollResult)}
        />
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

function getCorrectionPayrollTone(label: string): RecordsTone {
  if (label === "즉시" || label === "반영") {
    return "green";
  }

  if (label === "보류") {
    return "orange";
  }

  return "grey";
}

function getOvertimeStatusTone(
  status: OvertimeHistoryRow["status"],
): RecordsTone {
  if (status === "승인") {
    return "green";
  }

  if (status === "신청됨") {
    return "orange";
  }

  if (status === "철회") {
    return "grey";
  }

  return "pink";
}

function getOvertimePayrollTone(label: string): RecordsTone {
  if (label === "확정") {
    return "green";
  }

  if (label === "보류" || label === "미정") {
    return "orange";
  }

  return "grey";
}

function TableCell({ children }: { children: ReactNode }) {
  return <div className="min-w-0 truncate">{children}</div>;
}

function getFilteredCorrectionRows(
  rows: readonly CorrectionRow[],
  filters: HistoryFilterValues,
  optionsByFilter: Record<string, readonly RecordsFilterOption[]>,
) {
  return rows.filter((row) => {
    return (
      matchesCorrectionWorker(row, filters.location, optionsByFilter.location) &&
      matchesCorrectionStatus(row, filters.status) &&
      matchesCorrectionPayroll(row, filters.payroll) &&
      matchesCorrectionPeriod(row, filters.period)
    );
  });
}

function matchesCorrectionWorker(
  row: CorrectionRow,
  filterId = "all",
  options: readonly RecordsFilterOption[] = [],
) {
  if (filterId === "all") {
    return true;
  }

  const option = options.find((candidate) => candidate.id === filterId);

  return option?.label === row.workerName;
}

function matchesCorrectionStatus(row: CorrectionRow, filterId = "all") {
  if (filterId === "all") {
    return true;
  }

  if (filterId === "approved") {
    return row.status === "승인";
  }

  if (filterId === "pending") {
    return row.status === "처리 대기";
  }

  if (filterId === "rejected") {
    return row.status === "반려" || row.status === "철회";
  }

  return true;
}

function matchesCorrectionPayroll(row: CorrectionRow, filterId = "all") {
  if (filterId === "all") {
    return true;
  }

  if (filterId === "immediate") {
    return row.payrollResult === "즉시" || row.payrollResult === "반영";
  }

  if (filterId === "hold") {
    return row.payrollResult === "보류";
  }

  return true;
}

function matchesCorrectionPeriod(row: CorrectionRow, filterId = "all") {
  if (filterId === "all") {
    return true;
  }

  const submittedAtMs = getCorrectionSubmittedAtMs(row);

  if (submittedAtMs == null) {
    return true;
  }

  const dayCount = filterId === "7d" ? 7 : filterId === "30d" ? 30 : null;

  if (!dayCount) {
    return true;
  }

  return Date.now() - submittedAtMs <= dayCount * 24 * 60 * 60 * 1000;
}

function getCorrectionSubmittedAtMs(row: CorrectionRow) {
  if (typeof row.submittedAtMs === "number") {
    return row.submittedAtMs;
  }

  const match = row.submittedAt.match(/^(\d{2})\.(\d{2})/);

  if (!match) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const submittedAt = new Date(
    currentYear,
    Number(match[1]) - 1,
    Number(match[2]),
  );

  return Number.isNaN(submittedAt.getTime()) ? null : submittedAt.getTime();
}

function createCorrectionMetrics(
  rows: readonly CorrectionRow[],
): readonly RecordsMetricCard[] {
  const pendingCount = rows.filter((row) => row.status === "처리 대기").length;
  const approvedCount = rows.filter((row) => row.status === "승인").length;
  const rejectedOrWithdrawnCount = rows.filter(
    (row) => row.status === "반려" || row.status === "철회",
  ).length;

  return [
    {
      id: "submitted",
      label: "제출 유형",
      value: `${rows.length}건`,
      tone: "green",
    },
    {
      id: "pending",
      label: "처리 대기",
      value: `${pendingCount}건`,
      tone: "orange",
    },
    {
      id: "approved",
      label: "승인",
      value: `${approvedCount}건`,
      tone: "green",
    },
    {
      id: "rejected-or-withdrawn",
      label: "반려/철회",
      value: `${rejectedOrWithdrawnCount}건`,
      tone: "pink",
    },
  ];
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
      { id: "rejected-or-withdrawn", label: "반려/철회", value: "0건", tone: "pink" },
    ],
    rows: [],
  };
}

function createEmptyOvertimeHistory(): OvertimeHistoryViewModel {
  return {
    ...overtimeHistoryFixtureViewModel,
    details: {},
    metrics: [
      { id: "submitted", label: "총 신청", value: "0건", tone: "green" },
      { id: "pending", label: "승인 대기", value: "0건", tone: "orange" },
      { id: "approved", label: "승인", value: "0건", tone: "green" },
      {
        id: "rejected-or-withdrawn",
        label: "반려/철회",
        value: "0건",
        tone: "pink",
      },
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

function OvertimeHistoryDetailPanel({
  detail,
}: {
  detail: OvertimeHistoryDetail;
}) {
  return (
    <DetailPanel testId="record-overtime-history-selected-detail">
      <DetailTitle detail={detail} />
      <div className="rounded-[8px] border border-gray-200 px-4 py-4">
        <div className="text-detail-16-semibold tracking-normal text-green-400">
          {detail.reasonTitle}
        </div>
        <p className="mt-3 text-h-18-regular leading-[22px] tracking-normal text-gray-900">
          {detail.reasonText}
        </p>
      </div>
      <DetailSection title={detail.requestTitle}>
        <DetailLineBox lines={detail.requestLines} />
      </DetailSection>
      <DetailSection title={detail.attendanceTitle}>
        <DetailLineBox lines={detail.attendanceLines} />
      </DetailSection>
      <DetailSection title={detail.resultTitle}>
        <DetailLineBox lines={detail.resultLines} />
      </DetailSection>
      <div className="rounded-[8px] bg-green-50 px-4 py-4 text-body-16-regular leading-[22px] tracking-normal text-green-400">
        {detail.noteText}
      </div>
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
      className="flex h-full min-h-[560px] flex-col gap-4 overflow-y-auto px-4 py-4"
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
