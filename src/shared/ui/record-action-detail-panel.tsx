"use client";

import { useState, type CSSProperties } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Segment } from "@/shared/ui/segment";
import { Textarea } from "@/shared/ui/textarea";
import { cn } from "@/shared/lib/utils";

export type RecordActionPanelTone =
  | "green"
  | "orange"
  | "pink"
  | "blue"
  | "grey";

export type RecordActionPanelStateId =
  | "empty"
  | "normal-selected"
  | "anomaly-step-1"
  | "anomaly-step-2"
  | "anomaly-step-3"
  | "anomaly-step-4";

export type RecordActionPanelAction = {
  active?: boolean;
  id: string;
  label: string;
};

export type RecordActionPanelProcessingAction =
  | "approve-correction"
  | "approve-overtime"
  | "delete"
  | "edit"
  | "mark-normal"
  | "reject-correction"
  | "reject-overtime";

export type RecordActionPanelInput = {
  action: RecordActionPanelProcessingAction;
  amount?: number | null;
  endTime?: string;
  overtimePayMode?: "fixed" | "hourly" | null;
  payrollEffect: "none" | "hold" | "immediate";
  reason: string;
  resolveAnomaly?: boolean;
  startTime?: string;
};

export type RecordActionPanelLine = {
  id: string;
  label: string;
  tone?: RecordActionPanelTone;
  value: string;
};

export type RecordActionPanelLineSection = {
  id: string;
  lines: readonly RecordActionPanelLine[];
  title: string;
};

export type RecordActionPanelState = {
  actions?: readonly RecordActionPanelAction[];
  alertText?: string;
  amountField?: {
    label: string;
    placeholder: string;
  };
  anomalyResolutionMode?: {
    description?: string;
    label: string;
    options: readonly RecordActionPanelAction[];
  };
  confirmDescription?: string;
  confirmLabel?: string;
  confirmTitle?: string;
  emptyText?: readonly string[];
  helperText?: string;
  id: RecordActionPanelStateId;
  lineSections?: readonly RecordActionPanelLineSection[];
  lines?: readonly RecordActionPanelLine[];
  noteText?: string;
  noteTitle?: string;
  payrollMode?: {
    description?: string;
    label: string;
    options: readonly RecordActionPanelAction[];
  };
  payrollPayMode?: {
    description?: string;
    label: string;
    options: readonly RecordActionPanelAction[];
  };
  reasonField?: {
    label: string;
    placeholder: string;
  };
  statusLabel?: string;
  statusTone?: RecordActionPanelTone;
  submitAction?: RecordActionPanelProcessingAction;
  timeFields?: readonly {
    id: string;
    label: string;
    value: string;
  }[];
  title?: string;
};

type RecordMainActionInput = RecordActionPanelInput & {
  recordId?: string;
};
type RecordDetailAction = RecordActionPanelAction;
type RecordDetailLine = RecordActionPanelLine;
type RecordDetailState = RecordActionPanelState;
type RecordDetailStateId = RecordActionPanelStateId;
type RecordsTone = RecordActionPanelTone;

const badgeToneClassNames: Record<RecordsTone, string> = {
  green: "bg-green-100",
  orange: "bg-orange-100",
  pink: "bg-red-50",
  blue: "bg-blue-50",
  grey: "bg-gray-100",
};

const toneTextStyles: Record<RecordsTone, CSSProperties> = {
  green: { color: "var(--color-green-400)" },
  orange: { color: "var(--color-orange-400)" },
  pink: { color: "var(--color-red-500)" },
  blue: { color: "var(--color-blue-500)" },
  grey: { color: "var(--color-gray-600)" },
};

type RecordActionDetailPanelProps = {
  actionSaving: boolean;
  className?: string;
  detailStates: Record<RecordDetailStateId, RecordDetailState>;
  onConfirmRecordAction: (
    input: Omit<RecordMainActionInput, "recordId">,
  ) => Promise<void>;
  onSelectState: (stateId: RecordDetailStateId) => void;
  state: RecordDetailState;
  variant?: "panel" | "embedded";
};

export function RecordActionDetailPanel({
  actionSaving,
  className,
  detailStates,
  onConfirmRecordAction,
  onSelectState,
  state,
  variant = "panel",
}: RecordActionDetailPanelProps) {
  return (
    <aside
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white",
        variant === "panel"
          ? "rounded-[8px] border border-gray-200 px-4 py-4"
          : "border-t border-gray-200 pt-4",
        className,
      )}
      data-testid="record-detail-panel"
    >
      {state.id === "empty" ? (
        <EmptyDetail state={state} />
      ) : (
        <SelectedDetail
          key={`${state.id}:${state.title ?? ""}`}
          actionSaving={actionSaving}
          detailStates={detailStates}
          onConfirmRecordAction={onConfirmRecordAction}
          onSelectState={onSelectState}
          state={state}
        />
      )}
    </aside>
  );
}

function EmptyDetail({ state }: { state: RecordDetailState }) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center text-h-18-regular tracking-normal text-gray-400">
        {(state.emptyText ?? []).map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>
    </div>
  );
}

function RecordDetailLineList({
  compact = false,
  lines,
}: {
  compact?: boolean;
  lines: readonly RecordDetailLine[];
}) {
  return (
    <div className={compact ? "mt-2" : undefined}>
      {lines.map((line) => (
        <div
          className={cn(
            "flex items-center justify-between border-b border-gray-200 text-h-18-regular tracking-normal last:border-b-0",
            compact ? "h-11" : "h-14",
          )}
          key={line.id}
        >
          <span className="text-gray-500">{line.label}</span>
          <span
            className="text-right text-gray-900"
            style={line.tone ? toneTextStyles[line.tone] : undefined}
          >
            {line.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function SelectedDetail({
  actionSaving,
  detailStates,
  onConfirmRecordAction,
  onSelectState,
  state,
}: {
  actionSaving: boolean;
  detailStates: Record<RecordDetailStateId, RecordDetailState>;
  onConfirmRecordAction: (
    input: Omit<RecordMainActionInput, "recordId">,
  ) => Promise<void>;
  onSelectState: (stateId: RecordDetailStateId) => void;
  state: RecordDetailState;
}) {
  const compactForm = state.id === "anomaly-step-3";
  const action = getRecordActionFromState(state.id, state);
  const inlineActionForm = usesInlineActionForm(action);
  const inlineReasonField = inlineActionForm ? state.reasonField : undefined;
  const inlineTimeFields = inlineActionForm ? state.timeFields : undefined;
  const [reason, setReason] = useState("");
  const [timeValues, setTimeValues] = useState<Record<string, string>>(() =>
    createTimeInputValues(state.timeFields),
  );
  const [pendingDialog, setPendingDialog] = useState<{
    input: Omit<RecordMainActionInput, "recordId">;
    state: RecordDetailState;
  } | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState("");

  function openActionDialog(stateId: RecordDetailStateId) {
    const actionState = detailStates[stateId];
    const input = createPendingRecordActionInput({
      reason: "",
      setSaveErrorMessage,
      state: actionState,
      validate: false,
    });

    if (input) {
      setPendingDialog({ input, state: actionState });
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
          {state.statusLabel && state.statusTone ? (
            <ToneBadge label={state.statusLabel} tone={state.statusTone} />
          ) : null}

          {state.title ? (
            <h2 className="mt-4 text-h-20 tracking-normal text-gray-900">
              {state.title}
            </h2>
          ) : null}

          {state.lineSections ? (
            <div className="mt-6 space-y-5">
              {state.lineSections.map((section) => (
                <section key={section.id}>
                  <h3 className="text-h-16-semibold tracking-normal text-gray-900">
                    {section.title}
                  </h3>
                  <RecordDetailLineList compact lines={section.lines} />
                </section>
              ))}
            </div>
          ) : state.lines ? (
            <div className="mt-7">
              <RecordDetailLineList lines={state.lines} />
            </div>
          ) : null}

          {state.alertText ? (
            <div
              className={cn(
                "rounded-[8px] bg-red-50 px-4 text-h-18-regular leading-[1.55] tracking-normal text-red-500",
                compactForm ? "mt-4 py-4" : "mt-[26px] py-4",
              )}
            >
              {state.alertText}
            </div>
          ) : null}

          {state.noteText ? (
            <section className={cn(state.alertText ? "mt-5" : "mt-6")}>
              {state.noteTitle ? (
                <h3 className="text-h-16-semibold tracking-normal text-gray-900">
                  {state.noteTitle}
                </h3>
              ) : null}
              <p className="mt-2 whitespace-pre-wrap text-body-16-regular leading-[1.55] tracking-normal text-gray-700">
                {state.noteText}
              </p>
            </section>
          ) : null}

          {state.actions ? (
            <div
              className={cn(
                "flex items-center gap-3",
                compactForm ? "mt-4" : "mt-5",
              )}
            >
              {state.actions.map((action) => (
                <DetailActionButton
                  action={action}
                  key={action.id}
                  onOpenActionDialog={openActionDialog}
                  onSelectState={onSelectState}
                />
              ))}
            </div>
          ) : null}

          {state.helperText ? (
            <p
              className="mt-5 text-h-18-regular leading-[1.45] tracking-normal"
              style={
                state.id === "anomaly-step-4"
                  ? toneTextStyles.pink
                  : toneTextStyles.green
              }
            >
              {state.helperText}
            </p>
          ) : null}

          {inlineReasonField ? (
            <label className={cn("block", compactForm ? "mt-4" : "mt-5")}>
              <span className="text-h-18-semibold tracking-normal text-gray-900">
                {inlineReasonField.label}
              </span>
              <Textarea
                aria-label={inlineReasonField.label}
                className={cn(
                  "mt-3 w-full rounded-[8px] border-gray-200 bg-white py-4 text-h-18-regular tracking-normal text-gray-800",
                  compactForm ? "h-[76px]" : "h-[84px]",
                )}
                placeholder={inlineReasonField.placeholder}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          ) : null}

          {inlineTimeFields ? (
            <div
              className={cn(
                "grid grid-cols-2 gap-4",
                compactForm ? "mt-4" : "mt-5",
              )}
            >
              {inlineTimeFields.map((field) => (
                <label className="block" key={field.id}>
                  <span className="text-h-18-semibold tracking-normal text-gray-900">
                    {field.label}
                  </span>
                  <Input
                    type="time"
                    aria-label={field.label}
                    value={timeValues[field.id] ?? toTimeInputValue(field.value)}
                    onChange={(event) =>
                      setTimeValues((currentValues) => ({
                        ...currentValues,
                        [field.id]: event.target.value,
                      }))
                    }
                    className="mt-3 flex h-11 w-full items-center rounded-[8px] border-gray-200 bg-white text-h-18-regular tracking-normal text-gray-800"
                  />
                </label>
              ))}
            </div>
          ) : null}

          {saveErrorMessage ? (
            <p className="mt-4 rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-h-16-medium text-red-500">
              {saveErrorMessage}
            </p>
          ) : null}
        </div>
      </div>

      {state.confirmLabel ? (
        <div className="mt-5 flex shrink-0 justify-end">
          <button
            type="button"
            disabled={actionSaving}
            onClick={() => {
              const input = createPendingRecordActionInput({
                endTime: inlineTimeFields ? timeValues["check-out"] : undefined,
                reason,
                setSaveErrorMessage,
                startTime: inlineTimeFields ? timeValues["check-in"] : undefined,
                state,
              });

              if (input) {
                setPendingDialog({ input, state });
              }
            }}
            className="flex h-11 min-w-[78px] items-center justify-center rounded-[10px] bg-green-400 px-4 text-h-18-semibold tracking-normal text-white transition-colors duration-150 ease-out hover:bg-green-450 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {actionSaving ? "저장 중" : state.confirmLabel}
          </button>
        </div>
      ) : null}
      {pendingDialog ? (
        <RecordActionConfirmDialog
          actionSaving={actionSaving}
          input={pendingDialog.input}
          onClose={() => setPendingDialog(null)}
          onConfirmRecordAction={onConfirmRecordAction}
          setSaveErrorMessage={setSaveErrorMessage}
          state={pendingDialog.state}
        />
      ) : null}
    </div>
  );
}

function ToneBadge({ label, tone }: { label: string; tone: RecordsTone }) {
  return (
    <span
      className={cn(
        "inline-flex h-[26px] items-center rounded-[4px] px-1.5 text-detail-16-semibold tracking-normal",
        badgeToneClassNames[tone],
      )}
      style={toneTextStyles[tone]}
    >
      {label}
    </span>
  );
}

function DetailActionButton({
  action,
  onOpenActionDialog,
  onSelectState,
}: {
  action: RecordDetailAction;
  onOpenActionDialog: (stateId: RecordDetailStateId) => void;
  onSelectState: (stateId: RecordDetailStateId) => void;
}) {
  return (
    <button
      type="button"
      data-testid={`record-detail-action-${action.id}`}
      aria-pressed={action.active}
      className={cn(
        "flex h-10 items-center justify-center rounded-full border px-4 text-h-16-medium tracking-normal transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200",
        action.active
          ? "border-green-400 bg-green-400 text-white"
          : "border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50",
      )}
      onClick={() => {
        if (action.id === "mark-normal") {
          onOpenActionDialog("anomaly-step-2");
        }

        if (action.id === "edit") {
          onOpenActionDialog("anomaly-step-3");
        }

        if (action.id === "delete") {
          onOpenActionDialog("anomaly-step-4");
        }

        if (action.id === "approve-correction") {
          onOpenActionDialog("anomaly-step-3");
        }

        if (action.id === "approve-overtime") {
          onSelectState("anomaly-step-3");
        }

        if (action.id === "reject-correction") {
          onOpenActionDialog("anomaly-step-4");
        }

        if (action.id === "reject-overtime") {
          onSelectState("anomaly-step-4");
        }
      }}
    >
      {action.label}
    </button>
  );
}

function toTimeInputValue(value: string) {
  const normalizedValue = value.trim();
  const timeMatch = normalizedValue.match(/(\d{1,2}):(\d{2})/);

  if (!timeMatch) {
    return "";
  }

  let hour = Number(timeMatch[1]);
  const minute = timeMatch[2];

  if (normalizedValue.includes("오후") && hour < 12) {
    hour += 12;
  }

  if (normalizedValue.includes("오전") && hour === 12) {
    hour = 0;
  }

  return `${hour.toString().padStart(2, "0")}:${minute}`;
}

function createTimeInputValues(timeFields: RecordDetailState["timeFields"]) {
  return Object.fromEntries(
    (timeFields ?? []).map((field) => [
      field.id,
      toTimeInputValue(field.value),
    ]),
  );
}

function isTimeInputValue(value: string | undefined) {
  return Boolean(value?.match(/^\d{2}:\d{2}$/));
}

function usesInlineActionForm(action: RecordMainActionInput["action"]) {
  return action === "approve-overtime" || action === "reject-overtime";
}

function parseMoneyInput(value: string) {
  const normalized = value.replace(/[^0-9]/g, "");
  const amount = Number.parseInt(normalized, 10);

  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function createPendingRecordActionInput({
  endTime,
  reason,
  setSaveErrorMessage,
  startTime,
  state,
  validate = true,
}: {
  endTime?: string;
  reason: string;
  setSaveErrorMessage: (message: string) => void;
  startTime?: string;
  state: RecordDetailState;
  validate?: boolean;
}): Omit<RecordMainActionInput, "recordId"> | null {
  const action = getRecordActionFromState(state.id, state);

  setSaveErrorMessage("");

  if (validate && action === "reject-correction" && !reason.trim()) {
    setSaveErrorMessage("반려 사유를 입력해 주세요.");
    return null;
  }

  return {
    action,
    amount: null,
    endTime,
    overtimePayMode: null,
    payrollEffect: "immediate",
    reason,
    startTime,
  };
}

function RecordActionConfirmDialog({
  actionSaving,
  input,
  onClose,
  onConfirmRecordAction,
  setSaveErrorMessage,
  state,
}: {
  actionSaving: boolean;
  input: Omit<RecordMainActionInput, "recordId">;
  onClose: () => void;
  onConfirmRecordAction: (
    input: Omit<RecordMainActionInput, "recordId">,
  ) => Promise<void>;
  setSaveErrorMessage: (message: string) => void;
  state: RecordDetailState;
}) {
  const initialPayrollEffect =
    state.payrollMode?.options.find((option) => option.active)?.id ??
    state.payrollMode?.options[0]?.id ??
    input.payrollEffect;
  const initialPayMode =
    state.payrollPayMode?.options.find((option) => option.active)?.id ??
    state.payrollPayMode?.options[0]?.id ??
    "fixed";
  const initialAnomalyResolution =
    state.anomalyResolutionMode?.options.find((option) => option.active)?.id ??
    state.anomalyResolutionMode?.options[0]?.id ??
    "keep";
  const [payrollEffect, setPayrollEffect] = useState(initialPayrollEffect);
  const [payMode, setPayMode] = useState(initialPayMode);
  const [anomalyResolution, setAnomalyResolution] = useState(
    initialAnomalyResolution,
  );
  const [amountText, setAmountText] = useState("");
  const [reasonText, setReasonText] = useState(input.reason);
  const [timeValues, setTimeValues] = useState<Record<string, string>>(() =>
    createTimeInputValues(state.timeFields),
  );
  const [dialogError, setDialogError] = useState("");
  const hasPayrollDecision = Boolean(state.payrollMode);
  const showPayMode = hasPayrollDecision && payrollEffect === "immediate";
  const showAmountField = showPayMode && payMode === "fixed" && state.amountField;
  const dialogReasonField = getDialogReasonField(input.action, state);
  const showDialogTimeFields = shouldShowDialogTimeFields(input.action, state);
  const showAnomalyResolutionMode =
    input.action === "reject-correction" && Boolean(state.anomalyResolutionMode);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="record-action-confirm-dialog"
        className="w-[calc(100vw-32px)] max-w-[520px] rounded-[8px] bg-white p-8 text-gray-900 shadow-[0px_16px_44px_rgba(17,24,39,0.18)] ring-0"
      >
        <DialogHeader className="gap-3">
          <DialogTitle className="text-h-20 tracking-normal text-gray-900">
            {state.confirmTitle ?? getRecordActionConfirmTitle(input.action)}
          </DialogTitle>
          <DialogDescription className="text-body-16-regular leading-[24px] tracking-normal text-gray-600">
            {state.confirmDescription ??
              getRecordActionConfirmDescription(input.action, hasPayrollDecision)}
          </DialogDescription>
        </DialogHeader>

        {state.payrollMode ? (
          <section className="mt-5">
            <h3 className="text-h-18-semibold tracking-normal text-gray-900">
              {state.payrollMode.label}
            </h3>
            {state.payrollMode.description ? (
              <p className="mt-2 text-body-14-regular leading-[1.45] tracking-normal text-gray-500">
                {state.payrollMode.description}
              </p>
            ) : null}
            <Segment
              size="lg"
              className={cn(
                "mt-3 grid w-full rounded-[8px]",
                getSegmentGridClassName(state.payrollMode.options.length),
              )}
              options={state.payrollMode.options.map((option) => ({
                label: option.label,
                value: option.id,
              }))}
              value={payrollEffect}
              onChange={setPayrollEffect}
            />
          </section>
        ) : null}

        {dialogReasonField ? (
          <label className="mt-5 block">
            <span className="text-h-18-semibold tracking-normal text-gray-900">
              {dialogReasonField.label}
            </span>
            <Textarea
              aria-label={dialogReasonField.label}
              className="mt-3 h-[84px] w-full rounded-[8px] border-gray-200 bg-white py-4 text-h-18-regular tracking-normal text-gray-800"
              placeholder={dialogReasonField.placeholder}
              value={reasonText}
              onChange={(event) => setReasonText(event.target.value)}
            />
          </label>
        ) : null}

        {showAnomalyResolutionMode && state.anomalyResolutionMode ? (
          <section className="mt-5">
            <h3 className="text-h-18-semibold tracking-normal text-gray-900">
              {state.anomalyResolutionMode.label}
            </h3>
            {state.anomalyResolutionMode.description ? (
              <p className="mt-2 text-body-14-regular leading-[1.45] tracking-normal text-gray-500">
                {state.anomalyResolutionMode.description}
              </p>
            ) : null}
            <Segment
              size="lg"
              className={cn(
                "mt-3 grid w-full rounded-[8px]",
                getSegmentGridClassName(state.anomalyResolutionMode.options.length),
              )}
              options={state.anomalyResolutionMode.options.map((option) => ({
                label: option.label,
                value: option.id,
              }))}
              value={anomalyResolution}
              onChange={setAnomalyResolution}
            />
          </section>
        ) : null}

        {showDialogTimeFields ? (
          <section className="mt-5">
            <h3 className="text-h-18-semibold tracking-normal text-gray-900">
              {input.action === "approve-correction"
                ? "반영할 근무 시간"
                : "변경 예정 시간"}
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-4">
              {state.timeFields?.map((field) => (
                <label className="block" key={field.id}>
                  <span className="text-body-14-medium tracking-normal text-gray-900">
                    {field.label}
                  </span>
                  <Input
                    type="time"
                    aria-label={field.label}
                    value={timeValues[field.id] ?? toTimeInputValue(field.value)}
                    onChange={(event) =>
                      setTimeValues((currentValues) => ({
                        ...currentValues,
                        [field.id]: event.target.value,
                      }))
                    }
                    className="mt-2 flex h-11 w-full items-center rounded-[8px] border-gray-200 bg-white text-h-18-regular tracking-normal text-gray-800"
                  />
                </label>
              ))}
            </div>
          </section>
        ) : null}

        {showPayMode && state.payrollPayMode ? (
          <section className="mt-5">
            <h3 className="text-h-18-semibold tracking-normal text-gray-900">
              {state.payrollPayMode.label}
            </h3>
            {state.payrollPayMode.description ? (
              <p className="mt-2 text-body-14-regular leading-[1.45] tracking-normal text-gray-500">
                {state.payrollPayMode.description}
              </p>
            ) : null}
            <Segment
              size="lg"
              className={cn(
                "mt-3 grid w-full rounded-[8px]",
                getSegmentGridClassName(state.payrollPayMode.options.length),
              )}
              disabled={state.payrollPayMode.options.length < 2}
              options={state.payrollPayMode.options.map((option) => ({
                label: option.label,
                value: option.id,
              }))}
              value={payMode}
              onChange={setPayMode}
            />
          </section>
        ) : null}

        {showAmountField && state.amountField ? (
          <label className="mt-5 block">
            <span className="text-h-18-semibold tracking-normal text-gray-900">
              {state.amountField.label}
            </span>
            <Input
              aria-label={state.amountField.label}
              className="mt-3 flex h-11 w-full items-center rounded-[8px] border-gray-200 bg-white text-h-18-regular tracking-normal text-gray-800"
              inputMode="numeric"
              placeholder={state.amountField.placeholder}
              value={amountText}
              onChange={(event) => setAmountText(event.target.value)}
            />
          </label>
        ) : null}

        {dialogError ? (
          <p className="mt-4 rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-h-16-medium text-red-500">
            {dialogError}
          </p>
        ) : null}

        <DialogFooter className="-mx-0 -mb-0 mt-7 flex-row justify-end gap-3 rounded-none border-0 bg-transparent p-0">
          <button
            type="button"
            disabled={actionSaving}
            className="h-11 rounded-[8px] border border-gray-200 bg-white px-6 text-h-18-semibold tracking-normal text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200 disabled:cursor-not-allowed disabled:text-gray-400"
            onClick={onClose}
          >
            취소
          </button>
          <button
            type="button"
            disabled={actionSaving}
            className="h-11 rounded-[8px] bg-green-400 px-6 text-h-18-semibold tracking-normal text-white transition-colors hover:bg-green-450 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 disabled:cursor-not-allowed disabled:bg-gray-300"
            onClick={() => {
              const amount = showAmountField ? parseMoneyInput(amountText) : null;
              const startTime = showDialogTimeFields
                ? timeValues["check-in"]
                : input.startTime;
              const endTime = showDialogTimeFields
                ? timeValues["check-out"]
                : input.endTime;
              const reason = dialogReasonField ? reasonText.trim() : input.reason;

              setDialogError("");
              if (isDialogReasonRequired(input.action, state) && !reason) {
                setDialogError(getDialogReasonRequiredMessage(input.action, state));
                return;
              }

              if (
                showDialogTimeFields &&
                (!isTimeInputValue(startTime) || !isTimeInputValue(endTime))
              ) {
                setDialogError(getDialogTimeRequiredMessage(input.action));
                return;
              }

              if (showAmountField && (!amount || amount <= 0)) {
                setDialogError("고정 지급액을 입력해 주세요.");
                return;
              }

              void (async () => {
                try {
                  setSaveErrorMessage("");
                  await onConfirmRecordAction({
                    ...input,
                    amount,
                    endTime,
                    overtimePayMode: showPayMode ? (payMode as "fixed" | "hourly") : null,
                    payrollEffect: hasPayrollDecision
                      ? (payrollEffect as RecordMainActionInput["payrollEffect"])
                      : input.payrollEffect,
                    reason,
                    resolveAnomaly: showAnomalyResolutionMode
                      ? anomalyResolution === "resolve"
                      : input.resolveAnomaly,
                    startTime,
                  });
                  onClose();
                } catch {
                  // Failure feedback is shown as a toast by the parent action.
                }
              })();
            }}
          >
            {actionSaving ? "저장 중" : "확인"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getDialogReasonField(
  action: RecordMainActionInput["action"],
  state: RecordDetailState,
) {
  if (
    action === "edit" ||
    action === "approve-correction" ||
    action === "reject-correction"
  ) {
    return state.reasonField;
  }

  return undefined;
}

function shouldShowDialogTimeFields(
  action: RecordMainActionInput["action"],
  state: RecordDetailState,
) {
  return (action === "edit" || action === "approve-correction") && Boolean(state.timeFields);
}

function isDialogReasonRequired(
  action: RecordMainActionInput["action"],
  state: RecordDetailState,
) {
  return (
    action === "edit" ||
    action === "reject-correction" ||
    (action === "approve-correction" && !state.payrollMode)
  );
}

function getDialogReasonRequiredMessage(
  action: RecordMainActionInput["action"],
  state: RecordDetailState,
) {
  if (action === "reject-correction") {
    return "반려 사유를 입력해 주세요.";
  }

  if (action === "approve-correction" && state.payrollMode) {
    return "처리 메모를 입력해 주세요.";
  }

  return "수정 사유를 입력해 주세요.";
}

function getDialogTimeRequiredMessage(action: RecordMainActionInput["action"]) {
  if (action === "approve-correction") {
    return "반영할 근무 시간을 입력해 주세요.";
  }

  return "변경할 근무 시간을 입력해 주세요.";
}

function getRecordActionFromState(
  stateId: RecordDetailStateId,
  state?: RecordDetailState,
): RecordMainActionInput["action"] {
  if (state?.submitAction) {
    return state.submitAction;
  }

  if (stateId === "anomaly-step-4") {
    return "delete";
  }

  if (stateId === "anomaly-step-3") {
    return "edit";
  }

  return "mark-normal";
}

function getSegmentGridClassName(optionCount: number) {
  if (optionCount >= 3) {
    return "grid-cols-3";
  }

  if (optionCount === 1) {
    return "grid-cols-1";
  }

  return "grid-cols-2";
}

function getRecordActionConfirmTitle(action: RecordMainActionInput["action"]) {
  if (action === "approve-overtime") {
    return "추가근무 신청을 승인할까요?";
  }

  if (action === "approve-correction") {
    return "이의신청을 승인할까요?";
  }

  if (action === "reject-correction" || action === "reject-overtime") {
    return "반려할까요?";
  }

  if (action === "delete") {
    return "근무기록을 삭제할까요?";
  }

  if (action === "edit") {
    return "수정사항을 저장할까요?";
  }

  if (action === "mark-normal") {
    return "정상 처리할까요?";
  }

  return "처리 내용을 저장할까요?";
}

function getRecordActionConfirmDescription(
  action: RecordMainActionInput["action"],
  hasPayrollDecision: boolean,
) {
  if (hasPayrollDecision) {
    return "급여 처리 방식을 선택한 뒤 저장합니다.";
  }

  if (action === "edit") {
    return "일반근무 시간 변경은 근무시간 기준 급여 산정에 반영됩니다.";
  }

  if (action === "approve-correction") {
    return "조교가 보낸 이의 사유를 검토하고, 관리자가 입력한 근무시간으로 반영합니다.";
  }

  if (action === "reject-correction") {
    return "반려 사유만 조교에게 전달하고 근무기록은 변경하지 않습니다.";
  }

  if (action === "delete") {
    return "삭제된 일반근무는 근무시간 기준 급여 산정에서 제외됩니다.";
  }

  if (action === "mark-normal") {
    return "근무기록은 변경하지 않고 이상 플래그만 닫습니다.";
  }

  return "입력한 내용으로 처리 상태를 저장합니다.";
}

export function getRecordActionSavedMessage(
  action: RecordMainActionInput["action"],
) {
  if (action === "approve-correction") {
    return "이의신청을 승인했습니다.";
  }

  if (action === "reject-correction") {
    return "이의신청을 반려했습니다.";
  }

  if (action === "approve-overtime") {
    return "추가근무 신청을 승인했습니다.";
  }

  if (action === "reject-overtime") {
    return "추가근무 신청을 반려했습니다.";
  }

  if (action === "delete") {
    return "근무기록 삭제 처리를 적용했습니다.";
  }

  if (action === "edit") {
    return "근무기록 수정 내용을 적용했습니다.";
  }

  return "처리 내용을 적용했습니다.";
}
