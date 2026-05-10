"use client";

import { useState, type CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import {
  IconChevronDown,
  IconChevronLeft,
  IconNotice,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  payrollStatementFixture,
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

const avatarCheckerStyle = {
  backgroundColor: "var(--color-white)",
  backgroundImage:
    "linear-gradient(45deg, var(--color-gray-100) 25%, transparent 25%), linear-gradient(-45deg, var(--color-gray-100) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--color-gray-100) 75%), linear-gradient(-45deg, transparent 75%, var(--color-gray-100) 75%)",
  backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0",
  backgroundSize: "12px 12px",
} satisfies CSSProperties;

export function PayrollStatementsScreen() {
  const [detailOpen, setDetailOpen] = useState(false);

  if (detailOpen) {
    return (
      <PayrollStatementDetailState
        onBack={() => setDetailOpen(false)}
      />
    );
  }

  return (
    <section
      aria-label="급여 명세"
      className="mx-auto flex w-full max-w-[1580px] flex-col gap-5 tracking-normal"
      data-testid="payroll-statements-screen"
    >
      <MonthSelect />
      <StatementSummaryCards metrics={payrollStatementFixture.summaryCards} />
      <StatementTable onOpenDetail={() => setDetailOpen(true)} />
    </section>
  );
}

function MonthSelect() {
  return (
    <button
      type="button"
      className="flex h-[41px] w-fit items-center gap-2 rounded-[6px] border border-gray-200 bg-white px-2.5 text-h-18-regular text-gray-800 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
      data-testid="payroll-statements-month-select"
    >
      <span>{payrollStatementFixture.selectedMonthLabel}</span>
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
          className="h-[123px] rounded-[8px] border border-gray-200 bg-white px-5 py-4"
        >
          <div className="text-h-18-semibold text-gray-900">
            {metric.label}
          </div>
          <div
            className="mt-5 flex items-baseline gap-1"
            style={toneTextStyles[metric.tone]}
          >
            <span className="text-[36px] font-semibold leading-[42px]">
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
  onOpenDetail,
}: {
  onOpenDetail: () => void;
}) {
  return (
    <section
      aria-label="급여 명세 표"
      className="h-[calc(100vh-415px)] min-h-[340px] overflow-hidden rounded-[8px] bg-white"
      data-testid="payroll-statements-table"
    >
      <div className="flex h-[70px] items-center gap-3 px-5">
        <h2 className="text-h-20 text-gray-900">
          {payrollStatementFixture.listTitle}
        </h2>
        <Badge variant="grey" size="M">
          {payrollStatementFixture.listCountText}
        </Badge>
      </div>

      <div
        className="grid h-[42px] grid-cols-[22.5%_22.5%_22.5%_22.5%_1fr] items-center border-b border-gray-300 px-5 text-h-18-regular text-gray-500"
        role="row"
      >
        {payrollStatementFixture.columns.map((column) => (
          <div
            key={column.id}
            className={column.id === "actions" ? "sr-only" : undefined}
            role="columnheader"
          >
            {column.label}
          </div>
        ))}
      </div>

      <div role="rowgroup">
        {payrollStatementFixture.rows.map((row, index) => (
          <StatementTableRow
            key={row.id}
            row={row}
            first={index === 0}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
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
      className="grid h-[61px] grid-cols-[22.5%_22.5%_22.5%_22.5%_1fr] items-center border-b border-gray-100 px-5 text-h-18-regular text-gray-900 last:border-b-0"
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
            "flex h-[42px] items-center justify-center rounded-full border border-gray-200 bg-white px-4 text-h-16-medium text-gray-800 transition-colors duration-150 ease-out",
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
  onBack,
}: {
  onBack: () => void;
}) {
  const detail = payrollStatementFixture.selectedDetail;

  return (
    <section
      aria-label="급여 명세 상세"
      className="fixed bottom-0 left-[300px] right-0 top-0 z-40 flex min-w-[880px] flex-col bg-gray-100"
      data-testid="payroll-statements-detail"
    >
      <header className="flex h-[92px] shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5">
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

      <main className="min-h-0 flex-1 overflow-hidden px-5 py-7">
        <WorkerSummaryCard worker={detail.worker} />
        <div
          aria-hidden="true"
          className="min-h-[calc(100vh-236px)]"
          data-testid="payroll-statements-detail-empty"
        />
      </main>
    </section>
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
      className="flex h-[116px] items-center rounded-[8px] border border-gray-300 bg-white px-5"
      data-testid="payroll-statements-worker-summary"
    >
      <div
        aria-hidden="true"
        className="size-[76px] shrink-0 overflow-hidden rounded-full border border-gray-100"
        style={avatarCheckerStyle}
      />

      <div className="ml-5 min-w-0">
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
