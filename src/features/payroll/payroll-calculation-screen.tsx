"use client";

import { ChevronDown, ChevronLeft, Plus, Printer } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconNotice } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  createPayrollDataSource,
  type PayrollDataSource,
} from "./payroll-data-source";
import {
  payrollCalculationFixture,
  type PayrollAdjustmentItem,
  type PayrollAmountTone,
  type PayrollCalculationDetail,
  type PayrollCalculationFixture,
  type PayrollCalculationLine,
  type PayrollCalculationRow,
  type PayrollDetailStateId,
  type PayrollOpenItemCard,
  type PayrollOpenItemLine,
  type PayrollTone,
} from "./payroll-fixtures";

type BadgeConfig = {
  variant: "green" | "orange" | "red" | "grey" | "outline";
  style?: CSSProperties;
};

const toneBadgeConfig: Record<PayrollTone, BadgeConfig> = {
  default: { variant: "outline" },
  green: {
    variant: "green",
    style: { color: "var(--color-green-400)" },
  },
  orange: { variant: "orange" },
  pink: { variant: "red" },
  grey: { variant: "grey" },
};

const amountToneClassName: Record<PayrollAmountTone, string> = {
  default: "text-gray-900",
  positive: "text-green-400",
  negative: "text-red-500",
  muted: "text-gray-500",
};

const detailMinHeight: Record<PayrollDetailStateId, string> = {
  detail: "min-h-[980px]",
  "bonus-add": "min-h-[1100px]",
  "no-open-items": "min-h-[950px]",
};

const openItemsPanelHeight: Record<PayrollDetailStateId, string> = {
  detail: "max-h-[855px]",
  "bonus-add": "max-h-[1030px]",
  "no-open-items": "max-h-[855px]",
};

type PayrollCalculationScreenProps = {
  dataSource?: PayrollDataSource;
  initialFocusId?: string;
  initialMonthKey?: string;
  initialWorkerId?: string;
};

export function PayrollCalculationScreen({
  dataSource: dataSourceProp,
  initialFocusId,
  initialMonthKey,
  initialWorkerId,
}: PayrollCalculationScreenProps = {}) {
  const fallbackDataSource = useMemo(() => createPayrollDataSource(), []);
  const dataSource = dataSourceProp ?? fallbackDataSource;
  const fixtureMode = dataSource.mode === "fixture";
  const [viewModel, setViewModel] = useState<PayrollCalculationFixture>(
    fixtureMode
      ? payrollCalculationFixture
      : createEmptyPayrollCalculationViewModel(),
  );
  const [detailState, setDetailState] = useState<PayrollDetailStateId | null>(
    null,
  );
  const [selectedRowId, setSelectedRowId] = useState(viewModel.selectedRowId);
  const [loading, setLoading] = useState(!fixtureMode);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (fixtureMode) {
      return;
    }

    let active = true;

    void dataSource
      .loadCalculation({
        focusId: initialFocusId,
        monthKey: initialMonthKey,
        workerId: initialWorkerId,
      })
      .then((nextViewModel) => {
        if (!active) {
          return;
        }

        const nextSelectedRowId = resolveSelectedRowId(nextViewModel, {
          focusId: initialFocusId,
          monthKey: initialMonthKey,
          workerId: initialWorkerId,
        });

        setViewModel(nextViewModel);
        setSelectedRowId(nextSelectedRowId);
        if (
          nextSelectedRowId &&
          (initialFocusId || initialMonthKey || initialWorkerId)
        ) {
          setDetailState("detail");
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setErrorMessage("급여 산정 목록을 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource, fixtureMode, initialFocusId, initialMonthKey, initialWorkerId]);

  if (detailState) {
    const detailSet =
      viewModel.detailByRowId?.[selectedRowId] ?? viewModel.details;

    return (
      <PayrollDetailScreen
        detail={detailSet[detailState] ?? detailSet.detail}
        onBack={() => setDetailState(null)}
        onShowBonusForm={() => setDetailState("bonus-add")}
        onShowNoOpenItems={() => setDetailState("no-open-items")}
      />
    );
  }

  return (
    <section
      aria-label="급여 산정"
      className="flex w-full flex-col gap-4"
      data-testid="payroll-calculation-screen"
      data-payroll-calculation-state="default"
    >
      {errorMessage ? (
        <div
          className="min-h-9 rounded-[8px] border border-red-100 bg-red-50 px-4 py-2.5 text-body-14-medium tracking-normal text-red-500"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}
      <PayrollListToolbar viewModel={viewModel} />
      <PayrollListTable
        loading={loading}
        onShowDetail={(rowId) => {
          setSelectedRowId(rowId);
          setDetailState("detail");
        }}
        rows={viewModel.rows}
        selectedRowId={selectedRowId}
        viewModel={viewModel}
      />
    </section>
  );
}

function resolveSelectedRowId(
  viewModel: PayrollCalculationFixture,
  target: {
    focusId?: string;
    monthKey?: string;
    workerId?: string;
  },
) {
  return (
    viewModel.rows.find((row) => {
      const focusMatches =
        !target.focusId ||
        row.id === target.focusId ||
        row.payStatementId === target.focusId;
      const workerMatches = !target.workerId || row.workerId === target.workerId;
      const monthMatches = !target.monthKey || row.monthKey === target.monthKey;

      return focusMatches && workerMatches && monthMatches;
    })?.id ??
    viewModel.selectedRowId ??
    viewModel.rows[0]?.id ??
    ""
  );
}

function PayrollListToolbar({
  viewModel,
}: {
  viewModel: PayrollCalculationFixture;
}) {
  return (
    <div
      className="flex min-h-9 items-center justify-between gap-4"
      data-testid="payroll-calculation-default"
    >
      <button
        type="button"
        className="flex h-10 w-[113px] items-center justify-between rounded-[6px] border border-gray-200 bg-white px-2.5 text-h-18-regular tracking-normal text-gray-800 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] transition-colors duration-150 ease-out hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
      >
        <span>{viewModel.selectedMonthLabel}</span>
        <ChevronDown className="size-5 shrink-0 text-gray-600" />
      </button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-10 rounded-full px-4 text-h-18-regular font-normal tracking-normal"
      >
        <Printer className="size-5 text-green-400" />
        {viewModel.exportLabel}
      </Button>
    </div>
  );
}

function PayrollListTable({
  loading,
  rows,
  selectedRowId,
  onShowDetail,
  viewModel,
}: {
  loading: boolean;
  rows: readonly PayrollCalculationRow[];
  selectedRowId: string;
  onShowDetail: (rowId: string) => void;
  viewModel: PayrollCalculationFixture;
}) {
  return (
    <section className="h-[calc(100vh-144px)] min-h-[520px] overflow-hidden rounded-[8px] bg-white">
      <div className="flex h-[56px] items-center gap-3 px-4">
        <h2 className="text-h-20 tracking-normal text-gray-900">
          {viewModel.listTitle}
        </h2>
        <span className="rounded-[4px] bg-gray-100 px-1.5 py-0.5 text-detail-16-regular tracking-normal text-gray-600">
          {viewModel.listCountText}
        </span>
      </div>

      <div className="grid h-9 grid-cols-[0.9fr_1.2fr_1.2fr_1.25fr_0.95fr_1.25fr_0.95fr_1.05fr_96px] items-center border-b border-gray-300 px-4 text-h-18-regular tracking-normal text-gray-500">
        {viewModel.columns.map((column) => (
          <div key={column.id} className="min-w-0 truncate">
            {column.label}
          </div>
        ))}
      </div>

      {loading ? (
        <PayrollTableState>급여 산정 목록을 불러오는 중입니다.</PayrollTableState>
      ) : rows.length > 0 ? (
        <div>
          {rows.map((row) => (
            <PayrollListRow
              key={row.id}
              first={row.id === selectedRowId}
              row={row}
              onShowDetail={() => onShowDetail(row.id)}
            />
          ))}
        </div>
      ) : (
        <PayrollTableState>표시할 급여 산정 항목이 없습니다.</PayrollTableState>
      )}
    </section>
  );
}

function PayrollListRow({
  first,
  row,
  onShowDetail,
}: {
  first: boolean;
  row: PayrollCalculationRow;
  onShowDetail: () => void;
}) {
  return (
    <div className="grid min-h-11 grid-cols-[0.9fr_1.2fr_1.2fr_1.25fr_0.95fr_1.25fr_0.95fr_1.05fr_96px] items-center border-b border-gray-100 px-4 text-h-18-regular tracking-normal text-gray-900 last:border-b-0">
      <div className="min-w-0 truncate">{row.workerName}</div>
      <div className="min-w-0 truncate">{row.basePay}</div>
      <div className="min-w-0 truncate">{row.overtimePay}</div>
      <div className="min-w-0 truncate">{row.bonusDeduction}</div>
      <div className="min-w-0 truncate">{row.tax}</div>
      <div className="min-w-0 truncate text-h-18-semibold tracking-normal">
        {row.finalPay}
      </div>
      <div>
        <PayrollBadge tone={row.statusTone}>{row.status}</PayrollBadge>
      </div>
      <div>
        {row.openItems === "-" ? (
          <span>{row.openItems}</span>
        ) : (
          <PayrollBadge tone={row.openItemsTone}>{row.openItems}</PayrollBadge>
        )}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          data-testid={
            first ? "payroll-calculation-first-detail" : undefined
          }
          onClick={onShowDetail}
          className="flex h-9 items-center justify-center rounded-full border border-gray-200 bg-white px-4 text-h-16-medium tracking-normal text-gray-800 transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
        >
          {row.detailButtonLabel}
        </button>
      </div>
    </div>
  );
}

function PayrollTableState({ children }: { children: string }) {
  return (
    <div className="flex min-h-[360px] items-center justify-center px-4 text-center text-h-18-regular tracking-normal text-gray-500">
      {children}
    </div>
  );
}

function PayrollDetailScreen({
  detail,
  onBack,
  onShowBonusForm,
  onShowNoOpenItems,
}: {
  detail: PayrollCalculationDetail;
  onBack: () => void;
  onShowBonusForm: () => void;
  onShowNoOpenItems: () => void;
}) {
  return (
    <section
      aria-label={detail.headerTitle}
      className={cn(
        "absolute left-[var(--admin-sidebar-width)] right-0 top-0 z-40 flex min-w-[808px] flex-col bg-gray-100",
        detailMinHeight[detail.id],
      )}
      data-testid="payroll-calculation-detail-state"
      data-payroll-calculation-state={detail.id}
    >
      <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 items-center gap-4 rounded-[8px] pr-4 text-h-20 tracking-normal text-gray-900 transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
        >
          <ChevronLeft className="size-6 text-gray-800" />
          <span>{detail.headerTitle}</span>
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-testid="payroll-calculation-show-no-open-items"
            aria-label="PAY-01 no-open-items visual state"
            onClick={onShowNoOpenItems}
            className="size-3 opacity-0 focus-visible:opacity-100"
          />
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
        </div>
      </header>

      <main
        className="flex flex-1 flex-col gap-4 px-4 py-7"
        data-testid={`payroll-calculation-state-${detail.id}`}
      >
        <WorkerSummaryCard detail={detail} />

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(540px,1fr)_minmax(520px,1fr)]">
          <PayrollCalculationCard
            detail={detail}
            onShowBonusForm={onShowBonusForm}
          />
          <OpenItemsPanel detail={detail} />
        </div>
      </main>

      <PayrollDetailFooter detail={detail} />
    </section>
  );
}

function WorkerSummaryCard({ detail }: { detail: PayrollCalculationDetail }) {
  const worker = detail.worker;

  return (
    <section className="flex min-h-[68px] shrink-0 items-center rounded-[8px] border border-gray-300 bg-white px-4 py-4">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h2 className="text-h-20 tracking-normal text-gray-900">
            {worker.name}
          </h2>
          <Badge variant="grey" size="M">
            {worker.tagLabel}
          </Badge>
          <Badge
            variant="green"
            size="M"
            style={{ color: "var(--color-green-400)" }}
          >
            {worker.statusLabel}
          </Badge>
        </div>
        <div className="mt-3 flex items-center gap-3 text-h-18-regular tracking-normal text-gray-700">
          <span>{worker.hourlyPayLabel}</span>
          <Divider />
          <span>{worker.registeredDateLabel}</span>
          <Divider />
          <span>{worker.monthlyWorkLabel}</span>
        </div>
      </div>
    </section>
  );
}

function PayrollCalculationCard({
  detail,
  onShowBonusForm,
}: {
  detail: PayrollCalculationDetail;
  onShowBonusForm: () => void;
}) {
  return (
    <section className="rounded-[8px] bg-white px-4 pb-4 pt-4">
      <h2 className="text-h-20 tracking-normal text-gray-900">
        {detail.calculationTitle}
      </h2>

      <div className="mt-7">
        {detail.calculationRows.map((row) => (
          <CalculationLine key={row.id} row={row} />
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-gray-600 pt-6 text-h-18-semibold tracking-normal text-gray-900">
        <span>{detail.expectedPayLabel}</span>
        <span className="text-h-24 tracking-normal text-green-400">
          {detail.expectedPay}
        </span>
      </div>

      <AdjustmentsBox detail={detail} onShowBonusForm={onShowBonusForm} />
    </section>
  );
}

function CalculationLine({ row }: { row: PayrollCalculationLine }) {
  return (
    <div className="flex min-h-[53px] items-center justify-between border-b border-gray-200 text-h-18-regular tracking-normal">
      <span className="text-gray-600">{row.label}</span>
      <span
        className={cn(
          "text-right text-h-18-semibold tracking-normal",
          amountToneClassName[row.tone ?? "default"],
        )}
      >
        {row.value}
      </span>
    </div>
  );
}

function AdjustmentsBox({
  detail,
  onShowBonusForm,
}: {
  detail: PayrollCalculationDetail;
  onShowBonusForm: () => void;
}) {
  return (
    <section className="mt-6 rounded-[8px] border border-gray-100 px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-h-18-semibold tracking-normal text-gray-900">
          {detail.adjustmentsTitle}
        </h3>
        <button
          type="button"
          data-testid="payroll-calculation-add-adjustment"
          onClick={onShowBonusForm}
          className="flex h-9 items-center justify-center rounded-full border border-gray-200 bg-white px-4 text-h-16-medium tracking-normal text-gray-800 transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
        >
          {detail.addButtonLabel}
        </button>
      </div>

      {detail.adjustmentForm ? <AdjustmentForm detail={detail} /> : null}

      <div
        className={cn(
          "mt-8",
          detail.adjustmentForm && "mt-10 border-t border-gray-600 pt-6",
        )}
      >
        {detail.adjustmentItems.map((item) => (
          <AdjustmentRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function AdjustmentForm({ detail }: { detail: PayrollCalculationDetail }) {
  const form = detail.adjustmentForm;

  if (!form) {
    return null;
  }

  return (
    <div className="mt-4" data-testid="payroll-calculation-bonus-add-form">
      <div className="grid grid-cols-[minmax(180px,1fr)_90px_minmax(150px,0.7fr)] gap-4 text-h-16-semibold tracking-normal text-gray-900">
        <span>{form.itemLabel}</span>
        <span>{form.operatorLabel}</span>
        <span>{form.amountLabel}</span>
      </div>
      <div className="mt-2 grid grid-cols-[minmax(180px,1fr)_90px_minmax(150px,0.7fr)] gap-4">
        <div className="flex h-11 items-center rounded-[8px] border border-gray-200 bg-gray-50 px-4 text-h-18-regular tracking-normal text-gray-400">
          {form.itemPlaceholder}
        </div>
        <div className="grid h-11 grid-cols-2 overflow-hidden rounded-[8px] border border-gray-200 bg-white p-1">
          {form.operators.map((operator) => (
            <button
              key={operator.id}
              type="button"
              className={cn(
                "flex items-center justify-center rounded-[7px] text-h-18-semibold tracking-normal transition-colors duration-150 ease-out",
                operator.selected
                  ? "bg-green-400 text-white"
                  : "text-gray-600 hover:bg-gray-50",
              )}
            >
              {operator.label}
            </button>
          ))}
        </div>
        <div className="flex h-11 items-center rounded-[8px] border border-gray-200 bg-gray-50 px-4 text-h-18-regular tracking-normal text-gray-400">
          {form.amountPlaceholder}
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Button type="button" className="h-12 rounded-[10px] px-7">
          <Plus className="size-5" />
          {form.submitLabel}
        </Button>
      </div>
    </div>
  );
}

function AdjustmentRow({ item }: { item: PayrollAdjustmentItem }) {
  return (
    <div className="flex min-h-[48px] items-center gap-4 border-b border-gray-100 text-h-18-regular tracking-normal last:border-b-0">
      <span className="min-w-0 flex-1 text-gray-600">{item.label}</span>
      <span
        className={cn(
          "text-right text-h-18-semibold tracking-normal",
          amountToneClassName[item.tone],
        )}
      >
        {item.amount}
      </span>
      <button
        type="button"
        className="flex h-[28px] items-center justify-center rounded-[4px] border border-gray-300 bg-white px-1.5 text-detail-16-semibold tracking-normal text-gray-800"
      >
        {item.deleteLabel}
      </button>
    </div>
  );
}

function OpenItemsPanel({ detail }: { detail: PayrollCalculationDetail }) {
  const section = detail.workRecordSection;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[8px] bg-white px-4 pb-4 pt-4",
        openItemsPanelHeight[detail.id],
      )}
    >
      <div className="flex items-center gap-3">
        <h2 className="text-h-20 tracking-normal text-gray-900">
          {section.title}
        </h2>
        <Badge variant="grey" size="M">
          {section.totalCount}
        </Badge>
        {section.openCount ? (
          <Badge variant="red" size="M">
            {section.openCount}
          </Badge>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {section.cards.map((card) => (
          <OpenItemCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}

function OpenItemCard({ card }: { card: PayrollOpenItemCard }) {
  const unresolved = card.state === "open";

  return (
    <article
      className={cn(
        "rounded-[8px] border bg-white px-4 py-4",
        unresolved ? "border-red-500" : "border-gray-200",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-body-16-medium tracking-normal text-gray-900">
            {card.dateLabel}
          </p>
          <h3
            className={cn(
              "mt-2 text-h-18-semibold tracking-normal text-gray-900",
              card.state === "resolved" && "line-through decoration-gray-900",
            )}
          >
            {card.title}
          </h3>
          <div className="mt-3 flex items-center gap-3 text-h-18-regular tracking-normal text-gray-700">
            <span>{card.locationName}</span>
            <Divider />
            <span>{card.timeLabel}</span>
          </div>
        </div>
        <PayrollBadge tone={card.statusTone}>{card.statusLabel}</PayrollBadge>
      </div>

      <div className="mt-5 border-t border-gray-200 pt-4">
        {card.lines.map((line) => (
          <OpenItemLine key={line.id} line={line} />
        ))}
      </div>

      {card.actions.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {card.actions.map((action) => (
            <OpenItemActionControl action={action} key={action.id} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function OpenItemActionControl({
  action,
}: {
  action: PayrollOpenItemCard["actions"][number];
}) {
  const className =
    "flex h-10 items-center justify-center rounded-full border px-4 text-h-16-medium tracking-normal transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200";

  if (action.href) {
    return (
      <Link
        href={action.href}
        className={cn(
          className,
          "border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50",
        )}
      >
        {action.label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label={`${action.label} - 이동할 대상 없음`}
      className={cn(
        className,
        "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400",
      )}
      disabled
    >
      {action.unavailableLabel ?? `${action.label} 불가`}
    </button>
  );
}

function OpenItemLine({ line }: { line: PayrollOpenItemLine }) {
  return (
    <div className="flex min-h-10 items-start justify-between gap-4 text-h-18-regular tracking-normal">
      <span className="shrink-0 text-gray-600">{line.label}</span>
      <span
        className={cn(
          "min-w-0 text-right text-h-18-semibold tracking-normal",
          amountToneClassName[line.tone ?? "default"],
        )}
      >
        {line.value}
      </span>
    </div>
  );
}

function PayrollDetailFooter({ detail }: { detail: PayrollCalculationDetail }) {
  return (
    <footer className="mt-auto flex h-[72px] shrink-0 items-center justify-between gap-6 border-t border-gray-200 bg-white px-4">
      <div className="min-w-0">
        <h2 className="text-h-20 tracking-normal text-green-400">
          {detail.footer.title}
        </h2>
        <p className="mt-2 text-h-18-regular tracking-normal text-gray-900">
          {detail.footer.description}
        </p>
      </div>
      <Button
        type="button"
        disabled={detail.footer.actionDisabled}
        className="h-10 rounded-full px-7 text-h-18-semibold tracking-normal disabled:opacity-30"
      >
        {detail.footer.actionLabel}
      </Button>
    </footer>
  );
}

function PayrollBadge({
  tone,
  children,
}: {
  tone: PayrollTone;
  children: string;
}) {
  const config = toneBadgeConfig[tone];

  return (
    <Badge variant={config.variant} size="M" style={config.style}>
      {children}
    </Badge>
  );
}

function Divider() {
  return <span aria-hidden="true" className="h-4 w-px bg-gray-300" />;
}

function createEmptyPayrollCalculationViewModel(): PayrollCalculationFixture {
  return {
    ...payrollCalculationFixture,
    detailByRowId: {},
    listCountText: "0명",
    rows: [],
    selectedRowId: "",
  };
}
