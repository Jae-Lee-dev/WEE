"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import {
  IconChevronDown,
  IconChevronLeft,
  IconNotice,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  createPayrollDataSource,
  type PayrollDataSource,
} from "./payroll-data-source";
import {
  payrollStatementFixture,
  type PayrollStatementBodyLine,
  type PayrollStatementBodySection,
  type PayrollStatementDetail,
  type PayrollStatementFixture,
  type PayrollStatementMetric,
  type PayrollStatementRow,
  type PayrollTone,
  type PayrollWorkerSummary,
} from "./payroll-fixtures";

type BadgeToneConfig = {
  variant: "green" | "orange" | "red" | "grey" | "outline";
  style?: CSSProperties;
};

const toneTextStyles = {
  default: { color: "var(--color-gray-900)" },
  green: { color: "var(--color-green-400)" },
  orange: { color: "var(--color-orange-400)" },
  pink: { color: "var(--color-red-500)" },
  grey: { color: "var(--color-gray-600)" },
} satisfies Record<PayrollTone, CSSProperties>;

const badgeToneConfig: Record<PayrollTone, BadgeToneConfig> = {
  default: { variant: "outline" },
  green: { variant: "green", style: toneTextStyles.green },
  orange: { variant: "orange", style: toneTextStyles.orange },
  pink: { variant: "red", style: toneTextStyles.pink },
  grey: { variant: "grey", style: toneTextStyles.grey },
};

const amountToneClassName = {
  default: "text-gray-900",
  positive: "text-green-400",
  negative: "text-red-500",
  muted: "text-gray-500",
};

type PayrollStatementsScreenProps = {
  dataSource?: PayrollDataSource;
  initialFocusId?: string;
  initialMonthKey?: string;
  initialWorkerId?: string;
};

export function PayrollStatementsScreen({
  dataSource: dataSourceProp,
  initialFocusId,
  initialMonthKey,
  initialWorkerId,
}: PayrollStatementsScreenProps = {}) {
  const fallbackDataSource = useMemo(() => createPayrollDataSource(), []);
  const dataSource = dataSourceProp ?? fallbackDataSource;
  const fixtureMode = dataSource.mode === "fixture";
  const initialViewModel = fixtureMode
    ? payrollStatementFixture
    : createEmptyPayrollStatementViewModel();
  const initialDetailTarget = resolveStatementDetailTarget(initialViewModel, {
    focusId: initialFocusId,
    monthKey: initialMonthKey,
    workerId: initialWorkerId,
  });
  const [viewModel, setViewModel] =
    useState<PayrollStatementFixture>(initialViewModel);
  const [detailOpen, setDetailOpen] = useState(
    fixtureMode && initialDetailTarget.matched,
  );
  const [selectedRowId, setSelectedRowId] = useState(initialDetailTarget.rowId);
  const [loading, setLoading] = useState(!fixtureMode);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (fixtureMode) {
      return;
    }

    let active = true;

    void dataSource
      .loadStatements({
        focusId: initialFocusId,
        monthKey: initialMonthKey,
        workerId: initialWorkerId,
      })
      .then((nextViewModel) => {
        if (!active) {
          return;
        }

        const nextDetailTarget = resolveStatementDetailTarget(nextViewModel, {
          focusId: initialFocusId,
          monthKey: initialMonthKey,
          workerId: initialWorkerId,
        });

        setViewModel(nextViewModel);
        setSelectedRowId(nextDetailTarget.rowId);
        if (nextDetailTarget.matched) {
          setDetailOpen(true);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setErrorMessage("급여 명세 목록을 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource, fixtureMode, initialFocusId, initialMonthKey, initialWorkerId]);

  if (detailOpen) {
    const detail =
      viewModel.detailsByRowId?.[selectedRowId] ?? viewModel.selectedDetail;

    return (
      <PayrollStatementDetailState
        detail={detail}
        onBack={() => setDetailOpen(false)}
      />
    );
  }

  return (
    <section
      aria-label="급여 명세"
      className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 tracking-normal"
      data-testid="payroll-statements-screen"
    >
      {errorMessage ? (
        <div
          className="min-h-9 rounded-[8px] border border-red-100 bg-red-50 px-4 py-2.5 text-body-14-medium tracking-normal text-red-500"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}
      <MonthSelect viewModel={viewModel} />
      <StatementSummaryCards metrics={viewModel.summaryCards} />
      <StatementTable
        loading={loading}
        onOpenDetail={(rowId) => {
          setSelectedRowId(rowId);
          setDetailOpen(true);
        }}
        rows={viewModel.rows}
        viewModel={viewModel}
      />
    </section>
  );
}

function resolveStatementDetailTarget(
  viewModel: PayrollStatementFixture,
  target: {
    focusId?: string;
    monthKey?: string;
    workerId?: string;
  },
) {
  const hasSpecificTarget = Boolean(target.focusId || target.workerId);
  const matchedRow = hasSpecificTarget
    ? viewModel.rows.find((row) => {
        const focusMatches = !target.focusId || row.id === target.focusId;
        const workerMatches =
          !target.workerId || row.workerId === target.workerId;
        const monthMatches = !target.monthKey || row.monthKey === target.monthKey;

        return focusMatches && workerMatches && monthMatches;
      })
    : undefined;

  return {
    matched: Boolean(matchedRow),
    rowId: matchedRow?.id ?? viewModel.selectedRowId ?? viewModel.rows[0]?.id ?? "",
  };
}

function MonthSelect({
  viewModel,
}: {
  viewModel: PayrollStatementFixture;
}) {
  return (
    <button
      type="button"
      className="flex h-9 w-fit items-center gap-2 rounded-[6px] border border-gray-200 bg-white px-2.5 text-h-18-regular text-gray-800 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
      data-testid="payroll-statements-month-select"
    >
      <span>{viewModel.selectedMonthLabel}</span>
      <IconChevronDown className="size-5 shrink-0 text-gray-600" />
    </button>
  );
}

function StatementSummaryCards({
  metrics,
}: {
  metrics: readonly PayrollStatementMetric[];
}) {
  return (
    <section
      aria-label="급여 명세 요약"
      className="grid grid-cols-3 gap-4"
      data-testid="payroll-statements-summary"
    >
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className="h-[123px] rounded-[8px] border border-gray-200 bg-white px-4 py-4"
        >
          <div className="text-h-18-semibold text-gray-900">
            {metric.label}
          </div>
          <div
            className="mt-5 flex items-baseline gap-1"
            style={toneTextStyles[metric.tone]}
          >
            <span className="text-h-32 tracking-normal">
              {metric.value}
            </span>
            <span className="text-h-20">{metric.unit}</span>
          </div>
        </div>
      ))}
    </section>
  );
}

function StatementTable({
  loading,
  rows,
  onOpenDetail,
  viewModel,
}: {
  loading: boolean;
  rows: readonly PayrollStatementRow[];
  onOpenDetail: (rowId: string) => void;
  viewModel: PayrollStatementFixture;
}) {
  return (
    <section
      aria-label="급여 명세 표"
      className="h-[calc(100vh-340px)] min-h-[320px] overflow-hidden rounded-[8px] bg-white"
      data-testid="payroll-statements-table"
    >
      <div className="flex h-[56px] items-center gap-3 px-4">
        <h2 className="text-h-20 text-gray-900">
          {viewModel.listTitle}
        </h2>
        <Badge variant="grey" size="M">
          {viewModel.listCountText}
        </Badge>
      </div>

      <div
        className="grid h-9 grid-cols-[22.5%_22.5%_22.5%_22.5%_1fr] items-center border-b border-gray-300 px-4 text-h-18-regular text-gray-500"
        role="row"
      >
        {viewModel.columns.map((column) => (
          <div
            key={column.id}
            className={column.id === "actions" ? "sr-only" : undefined}
            role="columnheader"
          >
            {column.label}
          </div>
        ))}
      </div>

      {loading ? (
        <StatementTableState>급여 명세 목록을 불러오는 중입니다.</StatementTableState>
      ) : rows.length > 0 ? (
        <div role="rowgroup">
          {rows.map((row) => (
            <StatementTableRow
              key={row.id}
              row={row}
              first={row.id === viewModel.selectedRowId}
              onOpenDetail={() => onOpenDetail(row.id)}
            />
          ))}
        </div>
      ) : (
        <StatementTableState>표시할 급여 명세가 없습니다.</StatementTableState>
      )}
    </section>
  );
}

function StatementTableRow({
  row,
  first,
  onOpenDetail,
}: {
  row: PayrollStatementRow;
  first: boolean;
  onOpenDetail: () => void;
}) {
  return (
    <div
      className="grid h-11 grid-cols-[22.5%_22.5%_22.5%_22.5%_1fr] items-center border-b border-gray-100 px-4 text-h-18-regular text-gray-900 last:border-b-0"
      data-testid={`payroll-statements-row-${row.id}`}
      role="row"
    >
      <div className="min-w-0 truncate" role="cell">
        {row.workerName}
      </div>
      <div role="cell">
        <PayrollStatusBadge label={row.status} tone={row.statusTone} />
      </div>
      <div role="cell">{row.confirmedAmount}</div>
      <div role="cell">{row.confirmedDate}</div>
      <div className="flex justify-end" role="cell">
        <button
          type="button"
          data-testid={first ? "payroll-statements-first-detail" : undefined}
          onClick={onOpenDetail}
          className={cn(
            "flex h-9 items-center justify-center rounded-full border border-gray-200 bg-white px-4 text-h-16-medium text-gray-800 transition-colors duration-150 ease-out",
            "hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200",
          )}
        >
          {row.detailButtonLabel}
        </button>
      </div>
    </div>
  );
}

function PayrollStatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: PayrollTone;
}) {
  const config = badgeToneConfig[tone];

  return (
    <Badge
      variant={config.variant}
      size="M"
      style={config.style}
    >
      {label}
    </Badge>
  );
}

function PayrollStatementDetailState({
  detail,
  onBack,
}: {
  detail: PayrollStatementDetail;
  onBack: () => void;
}) {
  return (
    <section
      aria-label="급여 명세 상세"
      className="fixed bottom-0 left-[var(--admin-sidebar-width)] right-0 top-0 z-40 flex min-w-[808px] flex-col bg-gray-100"
      data-testid="payroll-statements-detail"
    >
      <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="급여 명세 목록으로 돌아가기"
            onClick={onBack}
            className="flex size-8 items-center justify-center rounded-[8px] text-gray-800 transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
          >
            <IconChevronLeft className="size-6" />
          </button>
          <h1 className="text-h-20 tracking-normal text-gray-900">
            {detail.headerTitle}
          </h1>
        </div>
        <button
          type="button"
          aria-label="알림"
          className="flex size-10 items-center justify-center rounded-full text-gray-700 transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
        >
          <IconNotice
            className="size-6 [--notice-dot:var(--color-green-400)]"
            hasNotice
          />
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden px-4 py-7">
        <WorkerSummaryCard worker={detail.worker} />
        {detail.bodySections.length > 0 ? (
          <StatementBodySections sections={detail.bodySections} />
        ) : (
          <div
            aria-hidden="true"
            className="min-h-[calc(100vh-236px)]"
            data-testid="payroll-statements-detail-empty"
          />
        )}
      </main>
    </section>
  );
}

function StatementTableState({ children }: { children: string }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center px-4 text-center text-h-18-regular text-gray-500">
      {children}
    </div>
  );
}

function WorkerSummaryCard({
  worker,
}: {
  worker: PayrollWorkerSummary;
}) {
  return (
    <section
      aria-label="조교 요약"
      className="flex min-h-[68px] items-center rounded-[8px] border border-gray-300 bg-white px-4 py-4"
      data-testid="payroll-statements-worker-summary"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h2 className="text-h-20 text-gray-900">{worker.name}</h2>
          <Badge variant="grey" size="M">
            {worker.tagLabel}
          </Badge>
          <Badge variant="green" size="M" style={toneTextStyles.green}>
            {worker.statusLabel}
          </Badge>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-h-18-regular text-gray-800">
          <span>{worker.hourlyPayLabel}</span>
          <span aria-hidden="true" className="h-5 w-px bg-gray-200" />
          <span>{worker.registeredDateLabel}</span>
          <span aria-hidden="true" className="h-5 w-px bg-gray-200" />
          <span>{worker.monthlyWorkLabel}</span>
        </div>
      </div>
    </section>
  );
}

function StatementBodySections({
  sections,
}: {
  sections: readonly PayrollStatementBodySection[];
}) {
  return (
    <div
      className="mt-4 grid grid-cols-2 gap-4"
      data-testid="payroll-statements-detail-body"
    >
      {sections.map((section) => (
        <section
          key={section.id}
          className="rounded-[8px] border border-gray-200 bg-white px-4 py-4"
        >
          <h2 className="text-h-18-semibold text-gray-900">{section.title}</h2>
          <dl className="mt-4 divide-y divide-gray-100">
            {section.lines.map((line) => (
              <StatementBodyLine key={line.id} line={line} />
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function StatementBodyLine({ line }: { line: PayrollStatementBodyLine }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-4 py-2 text-h-16-regular">
      <dt className="text-gray-600">{line.label}</dt>
      <dd
        className={cn(
          "text-right text-h-16-medium",
          amountToneClassName[line.tone ?? "default"],
        )}
      >
        {line.value}
      </dd>
    </div>
  );
}

function createEmptyPayrollStatementViewModel(): PayrollStatementFixture {
  return {
    ...payrollStatementFixture,
    detailsByRowId: {},
    listCountText: "0명",
    rows: [],
    selectedRowId: "",
    summaryCards: payrollStatementFixture.summaryCards.map((metric) => ({
      ...metric,
      value: "0",
    })),
  };
}
