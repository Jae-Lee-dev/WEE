"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { OptionSelect } from "@/shared/ui/select";
import {
  type PayrollRequiredSettingsField as PayrollRequiredSettingsFieldConfig,
  type PayrollRequiredSettingsState,
} from "../model/payroll-fixtures";
import { type PayrollRequiredSettingsInput } from "../api/payroll-data-source";

type PayrollRequiredSettingsDialogProps = {
  blocking: boolean;
  settings: PayrollRequiredSettingsState;
  saving: boolean;
  onClose: () => void;
  onSave: (input: PayrollRequiredSettingsInput) => Promise<void>;
};

export function PayrollRequiredSettingsDialog({
  blocking,
  settings,
  saving,
  onClose,
  onSave,
}: PayrollRequiredSettingsDialogProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(settings.fields.map((field) => [field.id, field.value])),
  );
  const [validationMessage, setValidationMessage] = useState("");

  const handleSave = async () => {
    const input = parseRequiredSettingsInput(formValues);

    if (!input) {
      setValidationMessage(
        "근무시간 올림은 1~60분, 정기 지급일은 1~31일로 입력해 주세요.",
      );
      return;
    }

    setValidationMessage("");
    await onSave(input);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !blocking && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex w-[calc(100vw-32px)] max-w-[640px] flex-col gap-7 rounded-[10px] bg-white p-8 text-gray-900 shadow-[0px_16px_44px_rgba(17,24,39,0.18)] ring-0"
        data-testid="payroll-required-settings-dialog"
      >
        <DialogHeader className="gap-2">
          <DialogTitle className="text-h-20 tracking-normal text-gray-900">
            {settings.title}
          </DialogTitle>
          <DialogDescription className="text-body-14-regular tracking-normal text-gray-600">
            {settings.description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {settings.fields.map((field) => (
            <PayrollRequiredSettingsField
              key={field.id}
              disabled={saving}
              field={field}
              missing={settings.missingFieldIds.includes(field.id)}
              value={formValues[field.id] ?? ""}
              onChange={(value) =>
                setFormValues((current) => ({
                  ...current,
                  [field.id]: value,
                }))
              }
            />
          ))}
        </div>

        {validationMessage ? (
          <p className="text-body-14-medium tracking-normal text-red-500" role="alert">
            {validationMessage}
          </p>
        ) : null}

        <DialogFooter className="-mx-0 -mb-0 flex-row justify-end gap-3 rounded-none border-0 bg-transparent p-0">
          {!blocking ? (
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={onClose}
              className="h-11 rounded-[8px] px-6 text-h-18-semibold tracking-normal"
            >
              취소
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={saving}
            onClick={() => {
              void handleSave();
            }}
            className="h-11 rounded-[8px] px-6 text-h-18-semibold tracking-normal text-white"
          >
            {saving ? "저장 중" : settings.saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayrollRequiredSettingsField({
  disabled,
  field,
  missing,
  onChange,
  value,
}: {
  disabled: boolean;
  field: PayrollRequiredSettingsFieldConfig;
  missing: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="flex items-center gap-2 text-h-16-semibold tracking-normal text-gray-900">
        {field.label}
        {missing ? (
          <span className="rounded-[4px] bg-red-50 px-1.5 py-0.5 text-label-12-medium tracking-normal text-red-500">
            필수
          </span>
        ) : null}
      </span>
      <span className="mt-2 flex items-center gap-2">
        {field.kind === "select" ? (
          <OptionSelect
            size="lg"
            disabled={disabled}
            onValueChange={onChange}
            options={(field.options ?? []).map((option) => ({
              label: option.label,
              value: option.value,
            }))}
            triggerAriaLabel={field.label}
            triggerClassName="w-full justify-between rounded-[8px] border-gray-200 bg-gray-50 font-normal tracking-normal text-gray-900 focus-visible:ring-green-200"
            value={value}
          />
        ) : (
          <Input
            aria-label={field.label}
            size="lg"
            disabled={disabled}
            inputMode="numeric"
            min={1}
            max={field.id === "regularPaymentDay" ? 31 : 60}
            type="number"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-[8px] border-gray-200 bg-gray-50 text-right tracking-normal text-gray-900"
          />
        )}
        {field.suffix ? (
          <span className="shrink-0 text-h-16-semibold tracking-normal text-gray-900">
            {field.suffix}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function parseRequiredSettingsInput(
  values: Record<string, string>,
): PayrollRequiredSettingsInput | null {
  const workTimeRoundingUnitMinutes = parseInteger(
    values.workTimeRoundingUnitMinutes,
  );
  const payrollRoundingUnitWon = parseInteger(values.payrollRoundingUnitWon);
  const regularPaymentDay = parseInteger(values.regularPaymentDay);

  if (
    workTimeRoundingUnitMinutes == null ||
    workTimeRoundingUnitMinutes < 1 ||
    workTimeRoundingUnitMinutes > 60 ||
    payrollRoundingUnitWon == null ||
    ![1, 10, 100].includes(payrollRoundingUnitWon) ||
    regularPaymentDay == null ||
    regularPaymentDay < 1 ||
    regularPaymentDay > 31
  ) {
    return null;
  }

  return {
    payrollRoundingUnitWon,
    regularPaymentDay,
    workTimeRoundingUnitMinutes,
  };
}

function parseInteger(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) ? parsed : null;
}
