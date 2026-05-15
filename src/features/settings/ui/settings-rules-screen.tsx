"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { OptionSelect } from "@/shared/ui/select";
import { useWeeErrorToast, useWeeSuccessToast } from "@/shared/ui/wee-toast";
import {
  createSettingsSupportDataSource,
  type SettingsRulesInput,
} from "../api/settings-support-data-source";
import {
  settingsRulesFixture,
  type SettingsRulesFixture,
  type SettingsRuleField,
} from "../model/settings-rules-fixtures";

export function SettingsRulesScreen() {
  const dataSource = useMemo(() => createSettingsSupportDataSource(), []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fixture, setFixture] =
    useState<SettingsRulesFixture>(settingsRulesFixture);
  const [loading, setLoading] = useState(dataSource.mode !== "fixture");
  const [saving, setSaving] = useState(false);
  const [actionErrorMessage, setActionErrorMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  useWeeErrorToast(errorMessage);
  useWeeErrorToast(actionErrorMessage, { title: "저장 실패" });
  useWeeSuccessToast(statusMessage);

  useEffect(() => {
    let cancelled = false;

    dataSource
      .getRules()
      .then((nextFixture) => {
        if (!cancelled) {
          setFixture(nextFixture);
          setErrorMessage("");
          setLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "운영 설정을 불러오지 못했습니다.",
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dataSource]);

  return (
    <section
      aria-label="운영 설정"
      className="mx-auto flex h-[calc(100vh-144px)] min-h-[520px] w-full max-w-[1480px] flex-col items-end gap-4 overflow-hidden rounded-[10px] border border-gray-200 bg-white p-4 tracking-normal"
      data-testid="settings-rules-screen"
    >
      {loading || errorMessage ? (
        <SettingsRulesState
          label={
            loading
              ? "운영 설정을 불러오는 중입니다."
              : "운영 설정을 표시할 수 없습니다."
          }
        />
      ) : (
        <div className="flex w-full flex-col gap-3">
          {fixture.rules.map((rule) => (
            <div
              key={rule.id}
              className="flex h-[58px] items-center justify-between rounded-[10px] border border-gray-200 bg-white px-4 text-h-18-semibold text-gray-500"
            >
              <span>{rule.label}</span>
              <span className="text-h-18-regular font-medium text-gray-900">
                {rule.value}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="flex h-9 items-center justify-center rounded-full bg-green-400 px-4 text-h-18-regular font-medium text-white transition-colors duration-150 ease-out hover:bg-green-450 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
        data-testid="settings-rules-edit-trigger"
        disabled={loading || !!errorMessage}
        onClick={() => setDialogOpen(true)}
      >
        {fixture.editLabel}
      </button>

      {dialogOpen ? (
        <SettingsRulesDialog
          fixture={fixture}
          saving={saving}
          onClose={() => setDialogOpen(false)}
          onSave={async (input) => {
            setSaving(true);
            setActionErrorMessage("");
            setStatusMessage("");

            try {
              const nextFixture = await dataSource.updateRules(input);

              setFixture(nextFixture);
              setDialogOpen(false);
              setStatusMessage("운영 설정을 저장했습니다.");
            } catch (error: unknown) {
              setStatusMessage("");
              setActionErrorMessage(
                error instanceof Error
                  ? error.message
                  : "운영 설정을 저장하지 못했습니다.",
              );
            } finally {
              setSaving(false);
            }
          }}
        />
      ) : null}
    </section>
  );
}

function SettingsRulesState({
  label,
}: {
  label: string;
}) {
  return (
    <div
      className="flex min-h-[300px] w-full items-center justify-center rounded-[8px] border border-gray-100 px-4 text-center text-h-18-regular text-gray-500"
      role="status"
    >
      {label}
    </div>
  );
}

function SettingsRulesDialog({
  fixture,
  saving,
  onClose,
  onSave,
}: {
  fixture: SettingsRulesFixture;
  saving: boolean;
  onClose: () => void;
  onSave: (input: SettingsRulesInput) => void | Promise<void>;
}) {
  const [formValues, setFormValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fixture.dialog.fields.map((field) => [field.id, field.value])),
  );
  const [validationMessage, setValidationMessage] = useState("");
  const [firstField, secondField, selectField, regularPaymentDayField] =
    fixture.dialog.fields;

  function handleSave() {
    const input = parseRulesInput(formValues);

    if (!input) {
      setValidationMessage(
        "시간 설정은 숫자로 입력하고, 정기 지급일은 비워두거나 1~31 사이로 입력해 주세요.",
      );
      return;
    }

    setValidationMessage("");
    void onSave(input);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex w-[calc(100vw-32px)] max-w-[720px] flex-col gap-8 rounded-[10px] bg-white p-8 text-gray-900 shadow-[0px_16px_44px_rgba(17,24,39,0.16)] ring-0"
        data-testid="settings-rules-dialog"
      >
        <DialogHeader className="gap-0">
          <DialogTitle className="text-h-20 tracking-normal text-gray-900">
            {fixture.dialog.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-6">
            <SettingsRuleInputField
              disabled={saving}
              field={firstField}
              value={formValues[firstField.id] ?? ""}
              onChange={(value) =>
                setFormValues((current) => ({
                  ...current,
                  [firstField.id]: value,
                }))
              }
            />
            <SettingsRuleInputField
              disabled={saving}
              field={secondField}
              value={formValues[secondField.id] ?? ""}
              onChange={(value) =>
                setFormValues((current) => ({
                  ...current,
                  [secondField.id]: value,
                }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <SettingsRuleInputField
              disabled={saving}
              field={selectField}
              value={formValues[selectField.id] ?? ""}
              onChange={(value) =>
                setFormValues((current) => ({
                  ...current,
                  [selectField.id]: value,
                }))
              }
            />
            <SettingsRuleInputField
              disabled={saving}
              field={regularPaymentDayField}
              value={formValues[regularPaymentDayField.id] ?? ""}
              onChange={(value) =>
                setFormValues((current) => ({
                  ...current,
                  [regularPaymentDayField.id]: value,
                }))
              }
            />
          </div>
          {validationMessage ? (
            <p className="text-body-14-regular text-red-500" role="alert">
              {validationMessage}
            </p>
          ) : null}
        </div>

        <DialogFooter className="-mx-0 -mb-0 flex-row justify-end gap-3 rounded-none border-0 bg-transparent p-0">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={onClose}
            className="h-11 rounded-[10px] px-6 text-h-18-semibold tracking-normal"
          >
            {fixture.dialog.cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="h-11 rounded-[10px] px-6 text-h-18-semibold tracking-normal text-white"
          >
            {saving ? "저장 중" : fixture.dialog.saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingsRuleInputField({
  disabled,
  field,
  onChange,
  value,
}: {
  disabled: boolean;
  field: SettingsRuleField;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block w-[312px]">
      <span className="text-h-18-semibold tracking-normal text-gray-900">
        {field.label}
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
            triggerClassName="w-[260px] justify-between rounded-[8px] border-gray-400 font-normal tracking-normal text-gray-900 focus-visible:ring-green-200"
            value={value}
          />
        ) : (
          <Input
            aria-label={field.label}
            size="lg"
            disabled={disabled}
            inputMode="numeric"
            min={field.id === "regular-payment-day" ? 1 : 0}
            max={field.id === "regular-payment-day" ? 31 : 120}
            type="number"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="w-[260px] rounded-[8px] border-gray-200 bg-gray-50 text-right tracking-normal text-gray-900"
          />
        )}
        {field.suffix ? (
          <span className="text-h-18-semibold tracking-normal text-gray-900">
            {field.suffix}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function parseRulesInput(
  values: Record<string, string>,
): SettingsRulesInput | null {
  const anomalyToleranceMinutes = parseInteger(values["time-tolerance"]);
  const workTimeRoundingUnitMinutes = parseInteger(values["work-rounding"]);
  const payrollRoundingUnitWon = parseInteger(values["pay-rounding"]);
  const regularPaymentDay = parseOptionalInteger(values["regular-payment-day"]);

  if (
    anomalyToleranceMinutes == null ||
    anomalyToleranceMinutes < 0 ||
    anomalyToleranceMinutes > 120 ||
    workTimeRoundingUnitMinutes == null ||
    workTimeRoundingUnitMinutes < 1 ||
    workTimeRoundingUnitMinutes > 60 ||
    ![1, 10, 100].includes(payrollRoundingUnitWon ?? 0) ||
    (regularPaymentDay != null &&
      (regularPaymentDay < 1 || regularPaymentDay > 31))
  ) {
    return null;
  }

  return {
    anomalyToleranceMinutes,
    payrollRoundingUnitWon: payrollRoundingUnitWon ?? 1,
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

function parseOptionalInteger(value: string | undefined) {
  if (!value) {
    return null;
  }

  return parseInteger(value);
}
