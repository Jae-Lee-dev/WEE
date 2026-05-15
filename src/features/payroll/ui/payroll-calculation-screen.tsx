"use client";

import { ChevronDown, Plus, Printer, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DetailStateHeader } from "@/shared/ui/detail-state-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { IconNotice } from "@/shared/ui/icons";
import { Input } from "@/shared/ui/input";
import { Segment } from "@/shared/ui/segment";
import { useWeeErrorToast, useWeeSuccessToast } from "@/shared/ui/wee-toast";
import { cn } from "@/shared/lib/utils";
import {
  RecordActionDetailPanel,
  type RecordActionPanelInput,
  type RecordActionPanelState,
  type RecordActionPanelStateId,
} from "@/shared/ui/record-action-detail-panel";
import {
  createPayrollDataSource,
  type PayrollAdjustmentInput,
  type PayrollDataSource,
  type PayrollDecisionInput,
  type PayrollOpenItemResolutionInput,
  type PayrollRequiredSettingsInput,
} from "../api/payroll-data-source";
import {
  payrollCalculationFixture,
  type PayrollAdjustmentItem,
  type PayrollAdjustmentForm,
  type PayrollAdjustmentTaxScope,
  type PayrollAmountTone,
  type PayrollCalculationDetail,
  type PayrollCalculationFixture,
  type PayrollCalculationLine,
  type PayrollCalculationRow,
  type PayrollDetailStateId,
  type PayrollOpenItemCard,
  type PayrollOpenItemLine,
  type PayrollTone,
} from "../model/payroll-fixtures";
import { PayrollRequiredSettingsDialog } from "./payroll-required-settings-dialog";

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

const openItemsPanelHeight: Record<PayrollDetailStateId, string> = {
  detail: "max-h-[855px]",
  "no-open-items": "max-h-[855px]",
};

type PayrollCalculationScreenProps = {
  dataSource?: PayrollDataSource;
  initialFocusId?: string;
  initialMonthKey?: string;
  initialWorkerId?: string;
  recordActionAdapter?: PayrollRecordActionAdapter;
};

type PayrollRecordActionBlock = {
  focusIds?: readonly string[];
  id: string;
  selectedStateId?: RecordActionPanelStateId;
};

type PayrollRecordActionViewModel = {
  blocks: readonly PayrollRecordActionBlock[];
  detailStates: Record<RecordActionPanelStateId, RecordActionPanelState>;
  detailStatesByBlockId: Record<
    string,
    Record<RecordActionPanelStateId, RecordActionPanelState>
  >;
};

export type PayrollRecordActionAdapter = {
  apply: (
    recordId: string,
    input: RecordActionPanelInput,
  ) => Promise<{ message: string }>;
  load: () => Promise<PayrollRecordActionViewModel>;
};

type PayrollActionStatus = {
  kind: "success" | "error";
  message: string;
};

type CreateAdjustmentPayload = Pick<
  PayrollAdjustmentInput,
  "amount" | "label" | "taxScope"
>;

type DecidePayrollPayload = Pick<
  PayrollDecisionInput,
  "action" | "scheduledPaymentDate"
>;

type ResolveOpenItemPayload = Pick<
  PayrollOpenItemResolutionInput,
  "decision" | "itemId" | "itemType"
>;

export function PayrollCalculationScreen({
  dataSource: dataSourceProp,
  initialFocusId,
  initialMonthKey,
  initialWorkerId,
  recordActionAdapter,
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
  const [actionStatus, setActionStatus] = useState<PayrollActionStatus | null>(
    null,
  );
  const [savingAction, setSavingAction] = useState(false);
  const [requiredSettingsSaving, setRequiredSettingsSaving] = useState(false);
  const [requiredSettingsErrorMessage, setRequiredSettingsErrorMessage] =
    useState("");
  const [requiredSettingsSuccessMessage, setRequiredSettingsSuccessMessage] =
    useState("");
  const [recordViewModel, setRecordViewModel] =
    useState<PayrollRecordActionViewModel | null>(null);
  const [recordViewErrorMessage, setRecordViewErrorMessage] = useState("");
  useWeeErrorToast(errorMessage);
  useWeeErrorToast(requiredSettingsErrorMessage, { title: "저장 실패" });
  useWeeSuccessToast(requiredSettingsSuccessMessage);

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

  useEffect(() => {
    let active = true;

    if (!recordActionAdapter) {
      return;
    }

    void recordActionAdapter
      .load()
      .then((nextViewModel) => {
        if (!active) {
          return;
        }

        setRecordViewModel(nextViewModel);
        setRecordViewErrorMessage("");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setRecordViewModel(null);
        setRecordViewErrorMessage("근무기록 처리 정보를 불러오지 못했습니다.");
      });

    return () => {
      active = false;
    };
  }, [recordActionAdapter]);

  const selectedRow =
    viewModel.rows.find((row) => row.id === selectedRowId) ??
    viewModel.rows[0];
  const requiredSettingsMissing =
    viewModel.requiredSettings.missingFieldIds.length > 0;
  const requiredSettingsDialogOpen = !loading && requiredSettingsMissing;

  const applyMutatedViewModel = (
    nextViewModel: PayrollCalculationFixture,
    target: {
      focusId?: string;
      monthKey?: string;
      workerId?: string;
    },
  ) => {
    const nextSelectedRowId = resolveSelectedRowId(nextViewModel, target);

    setViewModel(nextViewModel);
    setSelectedRowId(nextSelectedRowId);
  };

  const runPayrollMutation = async (
    mutation: () => Promise<PayrollCalculationFixture>,
    target: {
      focusId?: string;
      monthKey?: string;
      workerId?: string;
    },
    successMessage: string,
  ) => {
    setSavingAction(true);
    setActionStatus(null);

    try {
      const nextViewModel = await mutation();

      applyMutatedViewModel(nextViewModel, target);
      setActionStatus({ kind: "success", message: successMessage });
      return true;
    } catch (error) {
      setActionStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "급여 변경을 저장하지 못했습니다.",
      });
      return false;
    } finally {
      setSavingAction(false);
    }
  };

  const handleCreateAdjustment = async (input: CreateAdjustmentPayload) => {
    const target = createPayrollMutationTarget(selectedRow);
    const success = await runPayrollMutation(
      () =>
        dataSource.createAdjustment({
          ...target,
          ...input,
          workerName: target.workerName,
        }),
      target,
      "급여 조정 항목을 추가했습니다.",
    );

    if (success) {
      setDetailState("detail");
    }
  };

  const handleDeleteAdjustment = async (adjustmentId: string) => {
    const target = createPayrollMutationTarget(selectedRow);

    await runPayrollMutation(
      () =>
        dataSource.deleteAdjustment({
          ...target,
          adjustmentId,
        }),
      target,
      "급여 조정 항목을 삭제했습니다.",
    );
  };

  const handleDecidePayroll = async (input: DecidePayrollPayload) => {
    const target = createPayrollMutationTarget(selectedRow);

    await runPayrollMutation(
      () =>
        dataSource.decidePayroll({
          ...target,
          ...input,
          workerName: target.workerName,
        }),
      target,
      getPayrollDecisionSuccessMessage(input.action),
    );
  };

  const handleResolveOpenItem = async (input: ResolveOpenItemPayload) => {
    const target = createPayrollMutationTarget(selectedRow);

    await runPayrollMutation(
      () =>
        dataSource.resolveOpenItem({
          ...target,
          ...input,
          workerName: target.workerName,
        }),
      target,
      getOpenItemResolutionSuccessMessage(input.decision),
    );
  };

  const handleConfirmOpenRecordAction = async (
    recordId: string,
    input: RecordActionPanelInput,
  ) => {
    const target = createPayrollMutationTarget(selectedRow);

    if (!recordActionAdapter) {
      const error = new Error("근무기록 처리 정보를 불러오지 못했습니다.");

      setActionStatus({
        kind: "error",
        message: error.message,
      });
      throw error;
    }

    setSavingAction(true);
    setActionStatus(null);

    try {
      const result = await recordActionAdapter.apply(recordId, input);
      const [nextViewModel, nextRecordViewModel] = await Promise.all([
        dataSource.loadCalculation(target),
        recordActionAdapter.load(),
      ]);

      applyMutatedViewModel(nextViewModel, target);
      setRecordViewModel(nextRecordViewModel);
      setRecordViewErrorMessage("");
      setActionStatus({
        kind: "success",
        message: result.message,
      });
    } catch (error) {
      setActionStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "근무기록 처리 내용을 저장하지 못했습니다.",
      });
      throw error;
    } finally {
      setSavingAction(false);
    }
  };

  const handleSaveRequiredSettings = async (
    input: PayrollRequiredSettingsInput,
  ) => {
    const target = createPayrollReloadTarget(selectedRow, {
      focusId: initialFocusId,
      monthKey: initialMonthKey,
      workerId: initialWorkerId,
    });

    setRequiredSettingsSaving(true);
    setRequiredSettingsErrorMessage("");
    setRequiredSettingsSuccessMessage("");

    try {
      await dataSource.updateRequiredSettings(input);
      const nextViewModel = await dataSource.loadCalculation(target);

      applyMutatedViewModel(nextViewModel, target);
      setRequiredSettingsSuccessMessage("급여 계산 기준을 저장했습니다.");
    } catch (error: unknown) {
      setRequiredSettingsSuccessMessage("");
      setRequiredSettingsErrorMessage(
        error instanceof Error
          ? error.message
          : "급여 계산 기준을 저장하지 못했습니다.",
      );
    } finally {
      setRequiredSettingsSaving(false);
    }
  };

  const requiredSettingsDialog = requiredSettingsDialogOpen ? (
    <PayrollRequiredSettingsDialog
      blocking={requiredSettingsMissing}
      saving={requiredSettingsSaving}
      settings={viewModel.requiredSettings}
      onClose={() => undefined}
      onSave={handleSaveRequiredSettings}
    />
  ) : null;

  if (detailState) {
    const detailSet =
      viewModel.detailByRowId?.[selectedRowId] ?? viewModel.details;

    return (
      <>
        <PayrollDetailScreen
          detail={detailSet[detailState] ?? detailSet.detail}
          recordActionErrorMessage={recordViewErrorMessage}
          recordActionViewModel={recordViewModel}
          status={actionStatus}
          saving={savingAction}
          selectedRow={selectedRow}
          onBack={() => setDetailState(null)}
          onConfirmOpenRecordAction={handleConfirmOpenRecordAction}
          onCreateAdjustment={handleCreateAdjustment}
          onDeleteAdjustment={handleDeleteAdjustment}
          onDecidePayroll={handleDecidePayroll}
          onResolveOpenItem={handleResolveOpenItem}
          onShowNoOpenItems={() => setDetailState("no-open-items")}
        />
        {requiredSettingsDialog}
      </>
    );
  }

  return (
    <section
      aria-label="급여 산정"
      className="mx-auto flex h-full min-h-0 w-full max-w-[1480px] flex-col gap-4"
      data-testid="payroll-calculation-screen"
      data-payroll-calculation-state="default"
    >
      <PayrollListToolbar
        viewModel={viewModel}
        onExport={() => exportPayrollRows(viewModel)}
      />
      <PayrollListTable
        errorMessage={errorMessage}
        loading={loading}
        onShowDetail={(rowId) => {
          setSelectedRowId(rowId);
          setDetailState("detail");
        }}
        rows={viewModel.rows}
        selectedRowId={selectedRowId}
        viewModel={viewModel}
      />
      {requiredSettingsDialog}
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
  onExport,
  viewModel,
}: {
  onExport: () => void;
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
        onClick={onExport}
        className="h-10 rounded-full px-4 text-h-18-regular font-normal tracking-normal"
      >
        <Printer className="size-5 text-green-400" />
        {viewModel.exportLabel}
      </Button>
    </div>
  );
}

function PayrollListTable({
  errorMessage,
  loading,
  rows,
  selectedRowId,
  onShowDetail,
  viewModel,
}: {
  errorMessage: string;
  loading: boolean;
  rows: readonly PayrollCalculationRow[];
  selectedRowId: string;
  onShowDetail: (rowId: string) => void;
  viewModel: PayrollCalculationFixture;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[8px] bg-white">
      <div className="flex h-[56px] shrink-0 items-center gap-3 px-4">
        <h2 className="text-h-20 tracking-normal text-gray-900">
          {viewModel.listTitle}
        </h2>
        <span className="rounded-[4px] bg-gray-100 px-1.5 py-0.5 text-detail-16-regular tracking-normal text-gray-600">
          {viewModel.listCountText}
        </span>
      </div>

      <div className="grid h-9 shrink-0 grid-cols-[0.9fr_1.2fr_1.2fr_1.25fr_0.95fr_1.25fr_0.95fr_1.05fr_96px] items-center border-b border-gray-300 px-4 text-h-18-regular tracking-normal text-gray-500">
        {viewModel.columns.map((column) => (
          <div key={column.id} className="min-w-0 truncate">
            {column.label}
          </div>
        ))}
      </div>

      {loading ? (
        <PayrollTableState>급여 산정 목록을 불러오는 중입니다.</PayrollTableState>
      ) : errorMessage ? (
        <PayrollTableState>급여 산정 목록을 표시할 수 없습니다.</PayrollTableState>
      ) : rows.length > 0 ? (
        <div
          className="min-h-0 flex-1 overflow-y-auto"
          data-testid="payroll-calculation-table-body"
        >
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
  recordActionErrorMessage,
  recordActionViewModel,
  status,
  saving,
  selectedRow,
  onBack,
  onConfirmOpenRecordAction,
  onCreateAdjustment,
  onDeleteAdjustment,
  onDecidePayroll,
  onResolveOpenItem,
  onShowNoOpenItems,
}: {
  detail: PayrollCalculationDetail;
  recordActionErrorMessage: string;
  recordActionViewModel: PayrollRecordActionViewModel | null;
  status: PayrollActionStatus | null;
  saving: boolean;
  selectedRow?: PayrollCalculationRow;
  onBack: () => void;
  onConfirmOpenRecordAction: (
    recordId: string,
    input: RecordActionPanelInput,
  ) => Promise<void>;
  onCreateAdjustment: (input: CreateAdjustmentPayload) => Promise<void>;
  onDeleteAdjustment: (adjustmentId: string) => Promise<void>;
  onDecidePayroll: (input: DecidePayrollPayload) => Promise<void>;
  onResolveOpenItem: (input: ResolveOpenItemPayload) => Promise<void>;
  onShowNoOpenItems: () => void;
}) {
  const detailKey = `${detail.id}:${detail.worker.id}`;
  const [adjustmentFormTarget, setAdjustmentFormTarget] = useState<{
    detailKey: string;
    taxScope: PayrollAdjustmentTaxScope;
  } | null>(null);
  const activeAdjustmentTaxScope =
    adjustmentFormTarget?.detailKey === detailKey
      ? adjustmentFormTarget.taxScope
      : null;
  const actionErrorMessage =
    status?.kind === "error" ? status.message : "";
  const actionSuccessMessage =
    status?.kind === "success" ? status.message : "";
  useWeeErrorToast(actionErrorMessage, { title: "처리 실패" });
  useWeeSuccessToast(actionSuccessMessage);

  return (
    <section
      aria-label={detail.headerTitle}
      className={cn(
        "fixed bottom-0 left-[var(--admin-sidebar-width)] right-0 top-0 z-40 flex min-w-[808px] flex-col overflow-hidden bg-gray-100",
      )}
      data-testid="payroll-calculation-detail-state"
      data-payroll-calculation-state={detail.id}
    >
      <DetailStateHeader
        backLabel="급여 산정"
        title="급여 산정 상세"
        onBack={onBack}
        actions={
          <>
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
          </>
        }
      />

      <main
        className="min-h-0 flex-1 overflow-y-auto px-4 py-7"
        data-testid={`payroll-calculation-state-${detail.id}`}
        data-payroll-detail-scroll
      >
        <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4">
          <WorkerSummaryCard detail={detail} />

          <div className="grid items-start gap-4 xl:grid-cols-[minmax(540px,1fr)_minmax(520px,1fr)]">
            <PayrollCalculationCard
              activeAdjustmentTaxScope={activeAdjustmentTaxScope}
              detail={detail}
              saving={saving}
              onCreateAdjustment={onCreateAdjustment}
              onDeleteAdjustment={onDeleteAdjustment}
              onHideAdjustmentForm={() => setAdjustmentFormTarget(null)}
              onShowAdjustmentForm={(taxScope) =>
                setAdjustmentFormTarget({ detailKey, taxScope })
              }
            />
            <OpenItemsPanel
              detail={detail}
              recordActionErrorMessage={recordActionErrorMessage}
              recordActionViewModel={recordActionViewModel}
              saving={saving}
              onConfirmOpenRecordAction={onConfirmOpenRecordAction}
              onResolveOpenItem={onResolveOpenItem}
            />
          </div>
        </div>
      </main>

      <PayrollDetailFooter
        detail={detail}
        saving={saving}
        selectedRow={selectedRow}
        onDecidePayroll={onDecidePayroll}
      />
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
  activeAdjustmentTaxScope,
  detail,
  saving,
  onCreateAdjustment,
  onDeleteAdjustment,
  onHideAdjustmentForm,
  onShowAdjustmentForm,
}: {
  activeAdjustmentTaxScope: PayrollAdjustmentTaxScope | null;
  detail: PayrollCalculationDetail;
  saving: boolean;
  onCreateAdjustment: (input: CreateAdjustmentPayload) => Promise<void>;
  onDeleteAdjustment: (adjustmentId: string) => Promise<void>;
  onHideAdjustmentForm: () => void;
  onShowAdjustmentForm: (taxScope: PayrollAdjustmentTaxScope) => void;
}) {
  return (
    <section className="rounded-[8px] bg-white px-4 pb-4 pt-4">
      <div className="flex min-h-7 items-center justify-between gap-4">
        <h2 className="text-h-20 tracking-normal text-gray-900">
          {detail.calculationTitle}
        </h2>
        <span
          className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-label-12-medium tracking-normal text-gray-600"
          data-testid="payroll-calculation-rounding-rule"
        >
          {detail.calculationRuleLabel}
        </span>
      </div>

      <div className="mt-5">
        {detail.calculationRows.map((row) => {
          const taxScope = getAdjustmentTaxScopeForLine(row);

          return taxScope ? (
            <AdjustmentCalculationLine
              key={row.id}
              form={detail.adjustmentForm}
              formOpen={activeAdjustmentTaxScope === taxScope}
              items={detail.adjustmentItems.filter(
                (item) => item.taxScope === taxScope,
              )}
              row={row}
              saving={saving}
              taxScope={taxScope}
              onCreateAdjustment={onCreateAdjustment}
              onDeleteAdjustment={onDeleteAdjustment}
              onHideAdjustmentForm={onHideAdjustmentForm}
              onShowAdjustmentForm={onShowAdjustmentForm}
            />
          ) : (
            <CalculationLine key={row.id} row={row} />
          );
        })}
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-gray-600 pt-6 text-h-18-semibold tracking-normal text-gray-900">
        <span>{detail.expectedPayLabel}</span>
        <span className="text-h-24 tracking-normal text-green-400">
          {detail.expectedPay}
        </span>
      </div>

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

function AdjustmentCalculationLine({
  form,
  formOpen,
  items,
  row,
  saving,
  taxScope,
  onCreateAdjustment,
  onDeleteAdjustment,
  onHideAdjustmentForm,
  onShowAdjustmentForm,
}: {
  form: PayrollAdjustmentForm;
  formOpen: boolean;
  items: readonly PayrollAdjustmentItem[];
  row: PayrollCalculationLine;
  saving: boolean;
  taxScope: PayrollAdjustmentTaxScope;
  onCreateAdjustment: (input: CreateAdjustmentPayload) => Promise<void>;
  onDeleteAdjustment: (adjustmentId: string) => Promise<void>;
  onHideAdjustmentForm: () => void;
  onShowAdjustmentForm: (taxScope: PayrollAdjustmentTaxScope) => void;
}) {
  return (
    <div className="border-b border-gray-200 py-3">
      <div className="flex min-h-[40px] items-center justify-between gap-4 text-h-18-regular tracking-normal">
        <span className="text-gray-600">{row.label}</span>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-right text-h-18-semibold tracking-normal",
              amountToneClassName[row.tone ?? "default"],
            )}
          >
            {row.value}
          </span>
          <button
            type="button"
            data-testid={`payroll-calculation-add-adjustment-${taxScope}`}
            aria-expanded={formOpen}
            aria-label={`${row.label} 항목 추가`}
            onClick={() => onShowAdjustmentForm(taxScope)}
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="mt-1 flex flex-col gap-1">
          {items.map((item) => (
            <AdjustmentRow
              key={item.id}
              item={item}
              saving={saving}
              onDeleteAdjustment={onDeleteAdjustment}
            />
          ))}
        </div>
      ) : null}

      {formOpen ? (
        <AdjustmentForm
          form={form}
          saving={saving}
          taxScope={taxScope}
          onCreateAdjustment={onCreateAdjustment}
          onSubmitted={onHideAdjustmentForm}
        />
      ) : null}
    </div>
  );
}

function getAdjustmentTaxScopeForLine(
  row: PayrollCalculationLine,
): PayrollAdjustmentTaxScope | null {
  if (row.id === "pre-pay-adjustment") {
    return "pre_tax";
  }

  if (row.id === "post-pay-adjustment") {
    return "post_tax";
  }

  return null;
}

function AdjustmentForm({
  form,
  onSubmitted,
  saving,
  taxScope,
  onCreateAdjustment,
}: {
  form: PayrollAdjustmentForm;
  onSubmitted: () => void;
  saving: boolean;
  taxScope: PayrollAdjustmentTaxScope;
  onCreateAdjustment: (input: CreateAdjustmentPayload) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [operatorId, setOperatorId] = useState("plus");
  const [amountText, setAmountText] = useState("");

  const parsedAmount = parseMoneyInput(amountText);
  const signedAmount =
    parsedAmount == null
      ? null
      : operatorId === "minus"
        ? -Math.abs(parsedAmount)
        : Math.abs(parsedAmount);
  const canSubmit =
    !saving &&
    label.trim().length > 0 &&
    signedAmount != null &&
    signedAmount !== 0;

  const handleSubmit = async () => {
    if (!canSubmit || signedAmount == null) {
      return;
    }

    await onCreateAdjustment({
      amount: signedAmount,
      label: label.trim(),
      taxScope,
    });
    setLabel("");
    setAmountText("");
    setOperatorId("plus");
    onSubmitted();
  };

  return (
    <div
      className="mt-3 rounded-[8px] bg-gray-50 p-3"
      data-testid="payroll-calculation-bonus-add-form"
    >
      <div className="grid grid-cols-[minmax(180px,1fr)_90px_minmax(150px,0.7fr)_104px] gap-3 text-h-16-semibold tracking-normal text-gray-900">
        <span>{form.itemLabel}</span>
        <span>{form.operatorLabel}</span>
        <span>{form.amountLabel}</span>
        <span />
      </div>
      <div className="mt-2 grid grid-cols-[minmax(180px,1fr)_90px_minmax(150px,0.7fr)_104px] gap-3">
        <Input
          aria-label={form.itemLabel}
          className="h-11 min-w-0 rounded-[8px] border-gray-200 bg-white text-h-18-regular tracking-normal text-gray-900"
          placeholder={form.itemPlaceholder}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
        <Segment
          size="lg"
          className="grid w-full grid-cols-2"
          options={form.operators.map((operator) => ({
            label: operator.label,
            value: operator.id,
          }))}
          value={operatorId}
          onChange={setOperatorId}
        />
        <Input
          aria-label={form.amountLabel}
          inputMode="numeric"
          className="h-11 min-w-0 rounded-[8px] border-gray-200 bg-white text-h-18-regular tracking-normal text-gray-900"
          placeholder={form.amountPlaceholder}
          value={amountText}
          onChange={(event) => setAmountText(event.target.value)}
        />
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="flex h-11 items-center justify-center rounded-full bg-green-400 px-4 text-h-16-semibold tracking-normal text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-green-200"
        >
          <Plus className="size-4" />
          {saving ? "저장 중" : form.submitLabel}
        </button>
      </div>
    </div>
  );
}

function AdjustmentRow({
  item,
  saving,
  onDeleteAdjustment,
}: {
  item: PayrollAdjustmentItem;
  saving: boolean;
  onDeleteAdjustment: (adjustmentId: string) => Promise<void>;
}) {
  const { amount, sign } = splitSignedAmount(item.amount);
  const canDelete = item.actionLabel === "삭제";
  const held = item.statusLabel === "보류";

  return (
    <div className="flex min-h-8 items-center justify-between gap-3 rounded-[6px] py-1 pl-3 pr-1 text-h-16-regular tracking-normal text-gray-700">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "w-3 shrink-0 text-center text-h-16-semibold tracking-normal",
            amountToneClassName[item.tone],
          )}
        >
          {sign}
        </span>
        <span className="min-w-0 truncate">{item.label}</span>
        <span
          className={cn(
            "shrink-0 text-h-16-semibold tracking-normal",
            amountToneClassName[item.tone],
          )}
        >
          {amount}
        </span>
      </div>
      {canDelete ? (
        <button
          type="button"
          aria-label={`${item.label} 삭제`}
          disabled={saving}
          onClick={() => {
            void onDeleteAdjustment(item.id);
          }}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:text-gray-300"
        >
          <X className="size-4" />
        </button>
      ) : held ? (
        <Badge variant="orange" size="M">
          보류
        </Badge>
      ) : null}
    </div>
  );
}

function splitSignedAmount(amount: string) {
  const trimmed = amount.trim();

  if (trimmed.startsWith("+") || trimmed.startsWith("-")) {
    return {
      amount: trimmed.slice(1).trim(),
      sign: trimmed[0] ?? "",
    };
  }

  return { amount: trimmed, sign: "" };
}

function OpenItemsPanel({
  detail,
  recordActionErrorMessage,
  recordActionViewModel,
  saving,
  onConfirmOpenRecordAction,
  onResolveOpenItem,
}: {
  detail: PayrollCalculationDetail;
  recordActionErrorMessage: string;
  recordActionViewModel: PayrollRecordActionViewModel | null;
  saving: boolean;
  onConfirmOpenRecordAction: (
    recordId: string,
    input: RecordActionPanelInput,
  ) => Promise<void>;
  onResolveOpenItem: (input: ResolveOpenItemPayload) => Promise<void>;
}) {
  const section = detail.workRecordSection;
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  return (
    <section
      className={cn(
        "overflow-y-auto rounded-[8px] bg-white px-4 pb-4 pt-4",
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
          <OpenItemCard
            key={card.id}
            card={card}
            expanded={expandedCardId === card.id}
            recordActionErrorMessage={recordActionErrorMessage}
            recordActionViewModel={recordActionViewModel}
            saving={saving}
            onConfirmOpenRecordAction={onConfirmOpenRecordAction}
            onResolveOpenItem={onResolveOpenItem}
            onToggleRecordAction={() =>
              setExpandedCardId((currentId) =>
                currentId === card.id ? null : card.id,
              )
            }
          />
        ))}
      </div>
    </section>
  );
}

function OpenItemCard({
  card,
  expanded,
  recordActionErrorMessage,
  recordActionViewModel,
  saving,
  onConfirmOpenRecordAction,
  onResolveOpenItem,
  onToggleRecordAction,
}: {
  card: PayrollOpenItemCard;
  expanded: boolean;
  recordActionErrorMessage: string;
  recordActionViewModel: PayrollRecordActionViewModel | null;
  saving: boolean;
  onConfirmOpenRecordAction: (
    recordId: string,
    input: RecordActionPanelInput,
  ) => Promise<void>;
  onResolveOpenItem: (input: ResolveOpenItemPayload) => Promise<void>;
  onToggleRecordAction: () => void;
}) {
  const unresolved = card.state === "open";
  const recordAction = card.actions.find((action) => action.workRecordId);

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
            <OpenItemActionControl
              action={action}
              expanded={expanded && action.workRecordId === recordAction?.workRecordId}
              key={action.id}
              saving={saving}
              onResolveOpenItem={onResolveOpenItem}
              onToggleRecordAction={onToggleRecordAction}
            />
          ))}
        </div>
      ) : null}
      {expanded && recordAction?.workRecordId ? (
        <OpenItemRecordActionPanel
          action={recordAction}
          errorMessage={recordActionErrorMessage}
          recordActionViewModel={recordActionViewModel}
          saving={saving}
          onConfirmOpenRecordAction={onConfirmOpenRecordAction}
        />
      ) : null}
    </article>
  );
}

function OpenItemActionControl({
  action,
  expanded,
  saving,
  onResolveOpenItem,
  onToggleRecordAction,
}: {
  action: PayrollOpenItemCard["actions"][number];
  expanded: boolean;
  saving: boolean;
  onResolveOpenItem: (input: ResolveOpenItemPayload) => Promise<void>;
  onToggleRecordAction: () => void;
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

  if (action.workRecordId) {
    return (
      <button
        type="button"
        aria-expanded={expanded}
        className={cn(
          className,
          expanded
            ? "border-green-400 bg-green-400 text-white"
            : "border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50",
        )}
        onClick={onToggleRecordAction}
      >
        {expanded ? "접기" : action.label}
      </button>
    );
  }

  if (action.resolution) {
    return (
      <button
        type="button"
        disabled={saving}
        className={cn(
          className,
          "border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
        )}
        onClick={() => {
          if (action.resolution) {
            void onResolveOpenItem(action.resolution);
          }
        }}
      >
        {saving ? "저장 중" : action.label}
      </button>
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

function resolveRecordActionStateId(
  block: PayrollRecordActionBlock | null | undefined,
): RecordActionPanelStateId {
  return block ? (block.selectedStateId ?? "normal-selected") : "empty";
}

function OpenItemRecordActionPanel({
  action,
  errorMessage,
  recordActionViewModel,
  saving,
  onConfirmOpenRecordAction,
}: {
  action: PayrollOpenItemCard["actions"][number];
  errorMessage: string;
  recordActionViewModel: PayrollRecordActionViewModel | null;
  saving: boolean;
  onConfirmOpenRecordAction: (
    recordId: string,
    input: RecordActionPanelInput,
  ) => Promise<void>;
}) {
  const workRecordId = action.workRecordId;
  const block =
    workRecordId && recordActionViewModel
      ? recordActionViewModel.blocks.find(
          (candidate) =>
            candidate.id === workRecordId ||
            (candidate.focusIds ?? []).includes(workRecordId),
        )
      : null;
  const initialStateId = resolveRecordActionStateId(block);
  const [selectedStateId, setSelectedStateId] =
    useState<RecordActionPanelStateId | null>(null);

  if (errorMessage) {
    return (
      <p className="mt-4 rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-h-16-medium tracking-normal text-red-500">
        {errorMessage}
      </p>
    );
  }

  if (!recordActionViewModel) {
    return (
      <p className="mt-4 rounded-[8px] border border-gray-200 bg-gray-50 px-4 py-3 text-h-16-medium tracking-normal text-gray-500">
        근무기록 처리 정보를 불러오는 중입니다.
      </p>
    );
  }

  if (!workRecordId || !block) {
    return (
      <p className="mt-4 rounded-[8px] border border-gray-200 bg-gray-50 px-4 py-3 text-h-16-medium tracking-normal text-gray-500">
        처리할 근무기록을 찾을 수 없습니다.
      </p>
    );
  }

  const detailStates =
    recordActionViewModel.detailStatesByBlockId[block.id] ??
    recordActionViewModel.detailStates;
  const activeStateId = selectedStateId ?? initialStateId;
  const state =
    detailStates[activeStateId] ??
    detailStates[initialStateId] ??
    detailStates.empty;

  return (
    <RecordActionDetailPanel
      actionSaving={saving}
      className="mt-4 min-h-[520px]"
      detailStates={detailStates}
      state={state}
      variant="embedded"
      onConfirmRecordAction={(input) =>
        onConfirmOpenRecordAction(block.id, input)
      }
      onSelectState={setSelectedStateId}
    />
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

function PayrollDetailFooter({
  detail,
  saving,
  selectedRow,
  onDecidePayroll,
}: {
  detail: PayrollCalculationDetail;
  saving: boolean;
  selectedRow?: PayrollCalculationRow;
  onDecidePayroll: (input: DecidePayrollPayload) => Promise<void>;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const action = resolvePayrollDecisionAction(detail.footer.actionLabel);
  const disabled =
    saving || detail.footer.actionDisabled || !action || !selectedRow;

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
        disabled={disabled}
        onClick={() => setDialogOpen(true)}
        className="h-10 rounded-full px-7 text-h-18-semibold tracking-normal disabled:opacity-30"
      >
        {saving ? "처리 중" : detail.footer.actionLabel}
      </Button>
      {dialogOpen && action ? (
        <PayrollDecisionDialog
          action={action}
          defaultScheduledPaymentDate={detail.footer.defaultScheduledPaymentDate}
          saving={saving}
          workerName={selectedRow?.workerName ?? detail.worker.name}
          onClose={() => setDialogOpen(false)}
          onConfirm={async (input) => {
            await onDecidePayroll(input);
            setDialogOpen(false);
          }}
        />
      ) : null}
    </footer>
  );
}

function PayrollDecisionDialog({
  action,
  defaultScheduledPaymentDate,
  saving,
  workerName,
  onClose,
  onConfirm,
}: {
  action: PayrollDecisionInput["action"];
  defaultScheduledPaymentDate?: string | null;
  saving: boolean;
  workerName: string;
  onClose: () => void;
  onConfirm: (input: DecidePayrollPayload) => Promise<void>;
}) {
  const needsPaymentDate = action !== "mark_paid";
  const [scheduledPaymentDate, setScheduledPaymentDate] = useState(
    defaultScheduledPaymentDate ?? getTomorrowDateKey(),
  );
  const dateValid =
    !needsPaymentDate ||
    (isDateKey(scheduledPaymentDate) &&
      scheduledPaymentDate >= getTodayDateKey());
  const title = getPayrollDecisionDialogTitle(action);
  const confirmLabel = getPayrollDecisionDialogConfirmLabel(action);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[440px] rounded-[12px] bg-white px-6 py-6 text-gray-900 shadow-[0px_24px_60px_rgba(15,23,42,0.24)] ring-0"
      >
        <DialogHeader className="gap-3">
          <DialogTitle className="text-h-20 tracking-normal text-gray-900">
            {title}
          </DialogTitle>
          <DialogDescription className="text-body-16-regular leading-[24px] tracking-normal text-gray-600">
            {workerName}님의 현재 급여 산정 결과를 기준으로 처리합니다.
          </DialogDescription>
        </DialogHeader>
        {needsPaymentDate ? (
          <label className="mt-5 block text-h-16-semibold tracking-normal text-gray-900">
            지급 예정일
            <Input
              type="date"
              className="mt-2 h-11 w-full rounded-[8px] border-gray-200 px-4 text-h-18-regular tracking-normal text-gray-900"
              value={scheduledPaymentDate}
              onChange={(event) => setScheduledPaymentDate(event.target.value)}
            />
          </label>
        ) : null}
        {!dateValid ? (
          <p className="mt-2 text-body-14-medium tracking-normal text-red-500">
            지급 예정일은 오늘 이후 날짜로 입력해야 합니다.
          </p>
        ) : null}
        <DialogFooter className="-mx-0 -mb-0 mt-6 flex-row justify-end gap-3 rounded-none border-0 bg-transparent p-0">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full px-5"
            onClick={onClose}
          >
            취소
          </Button>
          <Button
            type="button"
            disabled={saving || !dateValid}
            className="h-10 rounded-full px-5"
            onClick={() =>
              void onConfirm({
                action,
                scheduledPaymentDate: needsPaymentDate
                  ? scheduledPaymentDate
                  : null,
              })
            }
          >
            {saving ? "처리 중" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function createPayrollMutationTarget(
  row: PayrollCalculationRow | undefined,
): Pick<PayrollAdjustmentInput, "focusId" | "monthKey" | "workerId"> & {
  workerName: string;
} {
  if (!row?.monthKey || !row.workerId) {
    throw new Error("급여 산정 대상 정보가 없어 작업을 진행할 수 없습니다.");
  }

  return {
    focusId: row.id,
    monthKey: row.monthKey,
    workerId: row.workerId,
    workerName: row.workerName,
  };
}

function createPayrollReloadTarget(
  row: PayrollCalculationRow | undefined,
  fallback: {
    focusId?: string;
    monthKey?: string;
    workerId?: string;
  },
) {
  if (row?.monthKey && row.workerId) {
    return {
      focusId: row.id,
      monthKey: row.monthKey,
      workerId: row.workerId,
    };
  }

  return fallback;
}

function getPayrollDecisionSuccessMessage(
  action: PayrollDecisionInput["action"],
) {
  if (action === "mark_paid") {
    return "급여 지급 완료로 처리했습니다.";
  }

  return action === "reconfirm"
    ? "급여를 재확정했습니다."
    : "급여를 확정했습니다.";
}

function getOpenItemResolutionSuccessMessage(
  decision: ResolveOpenItemPayload["decision"],
) {
  return decision === "apply"
    ? "미처리 항목을 급여에 반영했습니다."
    : "미처리 항목을 급여에서 제외했습니다.";
}

function resolvePayrollDecisionAction(
  label: string,
): PayrollDecisionInput["action"] | null {
  if (label.includes("지급 완료")) {
    return "mark_paid";
  }

  if (label.includes("재확정")) {
    return "reconfirm";
  }

  return label.includes("확정") ? "confirm" : null;
}

function getPayrollDecisionDialogTitle(action: PayrollDecisionInput["action"]) {
  if (action === "mark_paid") {
    return "지급 완료 처리";
  }

  return action === "reconfirm" ? "급여 재확정" : "급여 확정";
}

function getPayrollDecisionDialogConfirmLabel(
  action: PayrollDecisionInput["action"],
) {
  if (action === "mark_paid") {
    return "지급 완료";
  }

  return action === "reconfirm" ? "재확정" : "확정";
}

function parseMoneyInput(value: string) {
  const normalized = value.replace(/[^\d]/g, "");
  const amount = Number.parseInt(normalized, 10);

  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getTodayDateKey() {
  return formatDateKey(new Date());
}

function getTomorrowDateKey() {
  const date = new Date();

  date.setDate(date.getDate() + 1);

  return formatDateKey(date);
}

function formatDateKey(date: Date) {
  return [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function exportPayrollRows(viewModel: PayrollCalculationFixture) {
  const rows = [
    [
      "산정 월",
      "조교",
      "지급 대상액",
      "일반근무",
      "추가근무",
      "보너스/차감",
      "세금",
      "명세 상태",
      "미처리 항목",
    ],
    ...viewModel.rows.map((row) => [
      formatPayrollExportMonth(row.monthKey, viewModel.selectedMonthLabel),
      row.workerName,
      row.finalPay,
      row.basePay,
      row.overtimePay,
      row.bonusDeduction,
      row.tax,
      row.status,
      row.openItems === "-" ? "없음" : row.openItems,
    ]),
  ];
  const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
  const monthLabel = viewModel.selectedMonthLabel.replace(/[^\d.]/g, "");

  downloadTextFile({
    content: `\uFEFF${csv}`,
    fileName: `payroll-${monthLabel || "export"}.csv`,
    mimeType: "text/csv;charset=utf-8",
  });
}

function formatPayrollExportMonth(
  monthKey: string | undefined,
  fallbackLabel: string,
) {
  return monthKey?.replace("-", ".") ?? fallbackLabel;
}

function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadTextFile({
  content,
  fileName,
  mimeType,
}: {
  content: string;
  fileName: string;
  mimeType: string;
}) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
