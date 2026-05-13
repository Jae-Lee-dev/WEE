"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { OptionSelect, type SelectOption } from "@/shared/ui/select";
import { cn } from "@/shared/lib/utils";
import {
  WorkerDetailShell,
  WorkerDetailSubsection,
  WorkerDetailSubsectionHeader,
} from "./worker-detail-shell";
import {
  workerDetailBasicFixture,
  type BasicInfoRow,
  type DeleteBlocker,
  type DeleteBlockerTone,
  type PayrollSettingRow,
} from "../model/worker-detail-basic-fixtures";
import {
  createWorkerDetailBasicDataSource,
  type WorkerDetailBasicData,
  type WorkerDetailBasicEditValues,
  type WorkerDetailBasicSaveInput,
  type WorkerDetailPayrollType,
  type WorkerDetailStatusValue,
  type WorkerDetailTagOption,
  type WorkerDetailTaxType,
} from "../api/worker-detail-basic-data-source";
import { defaultWorkerDetailRouteId } from "../model/worker-detail-common-fixtures";

type DialogState = "edit-info" | "delete-blocked" | null;
type EditInfoFormField =
  | "contact"
  | "effectiveFrom"
  | "name"
  | "payAmount"
  | "taxRatePercent";
type EditInfoFormErrors = Partial<Record<EditInfoFormField, string>>;
type EditInfoFormState = {
  contact: string;
  effectiveFrom: string;
  name: string;
  payAmount: string;
  payrollType: WorkerDetailPayrollType;
  status: WorkerDetailStatusValue;
  tagIds: readonly string[];
  taxRatePercent: string;
  taxType: WorkerDetailTaxType;
};

const blockerToneClassName: Record<DeleteBlockerTone, string> = {
  red: "bg-red-50 text-red-500",
  orange: "bg-orange-100 text-orange-400",
  blue: "bg-blue-50 text-blue-500",
};

const statusOptions: SelectOption[] = [
  { label: "활성", value: "active" },
  { label: "비활성", value: "inactive" },
];

const taxTypeOptions: SelectOption[] = [
  { label: "원천징수 3.3%", value: "custom" },
  { label: "비과세", value: "none" },
];

export function WorkerDetailBasicScreen({
  workerId = defaultWorkerDetailRouteId,
}: {
  workerId?: string;
}) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const dataSource = useMemo(() => createWorkerDetailBasicDataSource(), []);
  const [detailData, setDetailData] = useState<WorkerDetailBasicData>(
    dataSource.initialData ?? {
      bankbookDownloadUrl: null,
      editValues: {
        contact: "",
        effectiveFrom: "",
        hourlyRate: null,
        monthlySalary: null,
        name: "조교",
        payrollType: "hourly",
        status: "active",
        tagIds: [],
        taxRatePercent: null,
        taxType: "custom",
      },
      fixture: workerDetailBasicFixture,
      profile: {
        name: "조교",
        tag: "미지정",
        status: "불러오는 중",
        paySummary: "급여 확인 중",
        registeredSummary: "등록일 확인 중",
        monthlySummary: "당월 근무시간 확인 중",
        deleteLabel: "조교 삭제",
      },
      tagOptions: [],
    },
  );
  const [loading, setLoading] = useState(!dataSource.initialData);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    dataSource
      .getWorkerDetail(workerId)
      .then((nextData) => {
        if (!ignore) {
          setDetailData(nextData);
          setLoadError(null);
          setLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (!ignore) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "조교 상세 정보를 불러오지 못했습니다.",
          );
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [dataSource, workerId]);

  const fixture = detailData.fixture;

  const openEditDialog = () => {
    setSaveErrorMessage("");
    setStatusMessage("");
    setDialog("edit-info");
  };

  const handleSaveWorker = async (input: WorkerDetailBasicSaveInput) => {
    setSaving(true);
    setSaveErrorMessage("");
    setStatusMessage("");

    try {
      const nextData = await dataSource.updateWorkerDetail(workerId, input);

      setDetailData(nextData);
      setDialog(null);
      setStatusMessage("조교 정보를 수정했습니다.");
    } catch {
      setSaveErrorMessage("조교 정보를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={(event) => {
        const target = event.target;
        if (
          target instanceof HTMLElement &&
          target.closest("button")?.textContent?.trim() === "조교 삭제"
        ) {
          setDialog("delete-blocked");
        }
      }}
      data-testid="worker-detail-basic-screen"
    >
      <WorkerDetailShell
        activeTab="basic"
        profile={detailData.profile}
        workerId={workerId}
      >
        {loadError ? (
          <div
            className="rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-h-18-semibold text-red-500"
            role="status"
          >
            {loadError}
          </div>
        ) : null}
        {statusMessage ? (
          <p
            className="rounded-[8px] border border-green-100 bg-green-50 px-4 py-3 text-h-18-semibold text-green-500"
            role="status"
          >
            {statusMessage}
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-4">
          <PersonalAccountCard
            bankbookDownloadUrl={detailData.bankbookDownloadUrl}
            fixture={fixture}
            loading={loading}
            loadError={loadError}
            onEdit={openEditDialog}
          />
          <PayrollSettingsCard
            fixture={fixture}
            loading={loading}
            loadError={loadError}
          />
        </div>
      </WorkerDetailShell>

      {dialog === "edit-info" ? (
        <EditInfoDialog
          fixture={fixture}
          initialValues={detailData.editValues}
          saveErrorMessage={saveErrorMessage}
          saving={saving}
          tagOptions={detailData.tagOptions}
          onClose={() => {
            if (!saving) {
              setDialog(null);
            }
          }}
          onSave={handleSaveWorker}
        />
      ) : null}
      {dialog === "delete-blocked" ? (
        <DeleteBlockedDialog fixture={fixture} onClose={() => setDialog(null)} />
      ) : null}
    </div>
  );
}

function PersonalAccountCard({
  bankbookDownloadUrl,
  fixture,
  loading,
  loadError,
  onEdit,
}: {
  bankbookDownloadUrl: string | null;
  fixture: WorkerDetailBasicData["fixture"];
  loading: boolean;
  loadError: string | null;
  onEdit: () => void;
}) {
  const stateLabel = getDetailCardStateLabel(
    loading,
    loadError,
    "개인/계좌 정보를 불러오는 중입니다.",
  );

  return (
    <WorkerDetailSubsection className="min-h-[360px] overflow-hidden">
      <WorkerDetailSubsectionHeader
        actions={
          stateLabel ? null : (
            <>
              <PillButton
                href={bankbookDownloadUrl ?? undefined}
                disabled={!bankbookDownloadUrl}
              >
                {fixture.bankCopyLabel}
              </PillButton>
              <PillButton onClick={onEdit} testId="worker-basic-edit-trigger">
                {fixture.editLabel}
              </PillButton>
            </>
          )
        }
      >
        <h2 className="text-h-20 text-gray-900">{fixture.personalTitle}</h2>
      </WorkerDetailSubsectionHeader>

      {stateLabel ? (
        <DetailCardState label={stateLabel} />
      ) : (
        <div>
          {fixture.personalRows.map((row, index) => (
            <InfoRow
              key={row.id}
              row={row}
              last={index === fixture.personalRows.length - 1}
            />
          ))}
        </div>
      )}
    </WorkerDetailSubsection>
  );
}

function PayrollSettingsCard({
  fixture,
  loading,
  loadError,
}: {
  fixture: WorkerDetailBasicData["fixture"];
  loading: boolean;
  loadError: string | null;
}) {
  const stateLabel = getDetailCardStateLabel(
    loading,
    loadError,
    "급여 설정을 불러오는 중입니다.",
  );

  return (
    <WorkerDetailSubsection className="min-h-[360px] overflow-hidden">
      <WorkerDetailSubsectionHeader>
        <h2 className="text-h-20 text-gray-900">{fixture.payrollTitle}</h2>
      </WorkerDetailSubsectionHeader>

      {stateLabel ? (
        <DetailCardState label={stateLabel} />
      ) : (
        <div>
          {fixture.payrollRows.map((row, index) => (
            <PayrollRow
              key={row.id}
              row={row}
              last={index === fixture.payrollRows.length - 1}
            />
          ))}
        </div>
      )}
    </WorkerDetailSubsection>
  );
}

function getDetailCardStateLabel(
  loading: boolean,
  loadError: string | null,
  loadingLabel: string,
) {
  if (loading) {
    return loadingLabel;
  }

  return loadError ? "정보를 표시할 수 없습니다." : "";
}

function DetailCardState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-[8px] border border-gray-100 px-4 text-center text-h-18-regular text-gray-500">
      {label}
    </div>
  );
}

function PillButton({
  children,
  disabled = false,
  href,
  onClick,
  testId,
}: {
  children: string;
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
  testId?: string;
}) {
  const className =
    "flex h-9 items-center justify-center rounded-full border border-gray-200 bg-white px-4 text-h-18-regular font-medium text-gray-700 transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400";

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        download
        data-testid={testId}
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={className}
    >
      {children}
    </button>
  );
}

function InfoRow({ row, last }: { row: BasicInfoRow; last: boolean }) {
  return (
    <div
      className={cn(
        "flex min-h-11 items-center justify-between py-3 text-h-18-semibold",
        !last && "border-b border-gray-200",
      )}
    >
      <span className="text-gray-500">{row.label}</span>
      {row.kind === "badge" ? (
        <Badge
          variant={row.tone === "green" ? "green" : "grey"}
          size="M"
          style={row.tone === "green" ? { color: "var(--color-green-400)" } : undefined}
        >
          {row.value}
        </Badge>
      ) : (
        <span className="text-h-18-regular font-medium text-gray-800">
          {row.value}
        </span>
      )}
    </div>
  );
}

function PayrollRow({ row, last }: { row: PayrollSettingRow; last: boolean }) {
  return (
    <div
      className={cn(
        "flex min-h-11 items-center justify-between py-3 text-h-18-semibold",
        !last && "border-b border-gray-200",
      )}
    >
      <span className="text-gray-500">{row.label}</span>
      <span className="text-h-18-regular font-medium text-gray-800">
        {row.value}
      </span>
    </div>
  );
}

function EditInfoDialog({
  fixture,
  initialValues,
  onSave,
  onClose,
  saveErrorMessage,
  saving,
  tagOptions,
}: {
  fixture: WorkerDetailBasicData["fixture"];
  initialValues: WorkerDetailBasicEditValues;
  onClose: () => void;
  onSave: (input: WorkerDetailBasicSaveInput) => Promise<void>;
  saveErrorMessage: string;
  saving: boolean;
  tagOptions: readonly WorkerDetailTagOption[];
}) {
  const dialog = fixture.editDialog;
  const initialForm = useMemo(
    () => createEditInfoFormState(initialValues),
    [initialValues],
  );
  const [form, setForm] = useState<EditInfoFormState>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const errors = getEditInfoFormErrors(form);
  const hasChanges = !areEditInfoFormsEqual(form, initialForm);
  const selectedTagCount = form.tagIds.length;
  const showUnsavedChangesAlert = useCallback(() => {
    // TODO: alert는 추후 토스트 기반 안내로 개선한다.
    window.alert("저장하지 않은 수정사항이 있습니다. 저장하거나 취소해 주세요.");
  }, []);

  useEffect(() => {
    if (!hasChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasChanges]);

  const setFormValue = <Field extends keyof EditInfoFormState>(
    field: Field,
    value: EditInfoFormState[Field],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleTextChange =
    (field: EditInfoFormField) => (event: ChangeEvent<HTMLInputElement>) => {
      setFormValue(field, event.target.value);
    };

  const handlePayrollTypeChange = (payrollType: WorkerDetailPayrollType) => {
    setForm((current) => ({
      ...current,
      payAmount: current.payAmount || (payrollType === "hourly" ? "10000" : "1000000"),
      payrollType,
    }));
  };

  const toggleTag = (tagId: string) => {
    setForm((current) => ({
      ...current,
      tagIds: current.tagIds.includes(tagId)
        ? current.tagIds.filter((currentTagId) => currentTagId !== tagId)
        : [...current.tagIds, tagId],
    }));
  };

  const handleSave = () => {
    if (!hasChanges) {
      return;
    }

    setSubmitted(true);

    if (hasEditInfoFormErrors(errors)) {
      return;
    }

    void onSave(createWorkerDetailSaveInput(form));
  };

  const handleClose = () => {
    if (saving) {
      return;
    }

    if (hasChanges) {
      showUnsavedChangesAlert();
      return;
    }

    onClose();
  };

  return (
    <DialogBackdrop>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="worker-edit-info-dialog-title"
        className="flex max-h-[calc(100dvh-48px)] w-[calc(100vw-32px)] max-w-[680px] flex-col rounded-[8px] bg-white p-8 shadow-[0px_16px_44px_rgba(17,24,39,0.18)]"
        data-testid="worker-edit-info-dialog"
      >
        <h2 id="worker-edit-info-dialog-title" className="text-h-20 text-gray-900">
          {dialog.title}
        </h2>

        <div className="mt-6 min-h-0 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <EditTextField
              error={submitted ? errors.name : undefined}
              label={dialog.fields[0]?.label ?? "이름"}
              value={form.name}
              disabled={saving}
              onChange={handleTextChange("name")}
            />
            <EditTextField
              error={submitted ? errors.contact : undefined}
              label={dialog.fields[1]?.label ?? "연락처"}
              value={form.contact}
              disabled={saving}
              onChange={handleTextChange("contact")}
            />
            <label className="block">
              <span className="text-h-18-semibold text-gray-900">소속 상태</span>
              <OptionSelect
                value={form.status}
                disabled={saving}
                onValueChange={(value) =>
                  setFormValue("status", value as WorkerDetailStatusValue)
                }
                options={[...statusOptions]}
                triggerAriaLabel="소속 상태"
                triggerClassName="mt-3 h-11 w-full rounded-[8px] border-gray-200 bg-white px-4 text-h-18-regular"
                contentClassName="z-[70]"
                itemClassName="text-h-16-medium tracking-normal"
              />
              <span className="mt-1 block min-h-4 text-label-12-regular text-red-500" />
            </label>
            <EditTextField
              error={submitted ? errors.effectiveFrom : undefined}
              label="적용 시작"
              type="date"
              value={form.effectiveFrom}
              disabled={saving}
              onChange={handleTextChange("effectiveFrom")}
            />
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <span className="text-h-18-semibold text-gray-900">
              {dialog.tagLabel}
            </span>
            <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-[8px] border border-gray-100 bg-gray-50 px-3 py-2">
              {tagOptions.length > 0 ? (
                tagOptions.map((tag) => {
                  const selected = form.tagIds.includes(tag.id);

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={selected}
                      disabled={saving}
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "rounded-[4px] px-2.5 py-1 text-h-16-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 disabled:cursor-not-allowed disabled:opacity-60",
                        selected
                          ? "bg-green-400 text-white"
                          : "bg-white text-gray-700 ring-1 ring-inset ring-gray-200",
                      )}
                    >
                      {tag.label}
                    </button>
                  );
                })
              ) : (
                <span className="text-h-16-regular text-gray-500">
                  등록된 근무자 태그가 없습니다.
                </span>
              )}
            </div>
            <p className="text-detail-16-regular text-gray-600">
              선택된 태그 {selectedTagCount}개
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <span className="text-h-18-semibold text-gray-900">
              {dialog.payTypeLabel}
            </span>
            <div className="grid h-11 grid-cols-2 rounded-[8px] border border-gray-200 bg-white p-1">
              <PayTypeButton
                active={form.payrollType === "hourly"}
                disabled={saving}
                label={dialog.payTypeOptions[0]}
                onClick={() => handlePayrollTypeChange("hourly")}
              />
              <PayTypeButton
                active={form.payrollType === "monthly"}
                disabled={saving}
                label={dialog.payTypeOptions[1]}
                onClick={() => handlePayrollTypeChange("monthly")}
              />
            </div>
            <p className="text-detail-16-regular text-gray-600">
              {dialog.payTypeNote}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-[1fr_180px] gap-4">
            <EditTextField
              error={submitted ? errors.payAmount : undefined}
              inputMode="numeric"
              label="급여 금액"
              value={form.payAmount}
              disabled={saving}
              onChange={handleTextChange("payAmount")}
              suffix={form.payrollType === "hourly" ? "원/시간" : "원/월"}
            />
            <label className="block">
              <span className="text-h-18-semibold text-gray-900">세율 방식</span>
              <OptionSelect
                value={form.taxType}
                disabled={saving}
                onValueChange={(value) =>
                  setFormValue("taxType", value as WorkerDetailTaxType)
                }
                options={[...taxTypeOptions]}
                triggerAriaLabel="세율 방식"
                triggerClassName="mt-3 h-11 w-full rounded-[8px] border-gray-200 bg-white px-4 text-h-18-regular"
                contentClassName="z-[70]"
                itemClassName="text-h-16-medium tracking-normal"
              />
              <span className="mt-1 block min-h-4 text-label-12-regular text-red-500" />
            </label>
          </div>

          {form.taxType === "custom" ? (
            <div className="mt-4 max-w-[220px]">
              <EditTextField
                error={submitted ? errors.taxRatePercent : undefined}
                inputMode="decimal"
                label="세율"
                value={form.taxRatePercent}
                disabled={saving}
                onChange={handleTextChange("taxRatePercent")}
                suffix="%"
              />
            </div>
          ) : null}

          {saveErrorMessage ? (
            <p className="mt-3 text-label-14-medium text-red-500" role="alert">
              {saveErrorMessage}
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={handleClose}
            className="h-11 rounded-[8px] px-6 text-h-18-semibold tracking-normal"
          >
            {dialog.cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={saving || !hasChanges}
            onClick={handleSave}
            className="h-11 rounded-[8px] px-6 text-h-18-semibold tracking-normal text-white"
          >
            {saving ? "저장 중" : dialog.saveLabel}
          </Button>
        </div>
      </section>
    </DialogBackdrop>
  );
}

function PayTypeButton({
  active,
  disabled,
  label,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-[8px] text-h-18-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 disabled:cursor-not-allowed",
        active ? "bg-green-400 text-white" : "text-gray-700 hover:bg-gray-50",
      )}
    >
      {label}
    </button>
  );
}

function EditTextField({
  disabled,
  error,
  inputMode,
  label,
  onChange,
  suffix,
  type = "text",
  value,
}: {
  disabled: boolean;
  error?: string;
  inputMode?: "decimal" | "numeric";
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  suffix?: string;
  type?: "date" | "text";
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-h-18-semibold text-gray-900">{label}</span>
      <div className="relative mt-3">
        <Input
          type={type}
          value={value}
          disabled={disabled}
          inputMode={inputMode}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          className={cn(
            "h-11 w-full rounded-[8px] border-gray-200 bg-white text-h-18-regular text-gray-900 disabled:bg-gray-50 disabled:text-gray-500",
            suffix && "pr-20",
          )}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-h-16-medium text-gray-500">
            {suffix}
          </span>
        ) : null}
      </div>
      <span className="mt-1 block min-h-4 text-label-12-regular text-red-500">
        {error ?? ""}
      </span>
    </label>
  );
}

function createEditInfoFormState(
  values: WorkerDetailBasicEditValues,
): EditInfoFormState {
  const amount =
    values.payrollType === "monthly" ? values.monthlySalary : values.hourlyRate;

  return {
    contact: values.contact,
    effectiveFrom: values.effectiveFrom,
    name: values.name,
    payAmount: amount === null ? "" : String(amount),
    payrollType: values.payrollType,
    status: values.status,
    tagIds: [...values.tagIds],
    taxRatePercent:
      values.taxRatePercent === null ? "" : String(values.taxRatePercent),
    taxType: values.taxType,
  };
}

function getEditInfoFormErrors(form: EditInfoFormState): EditInfoFormErrors {
  const errors: EditInfoFormErrors = {};
  const payAmount = parseDecimalInput(form.payAmount);
  const taxRatePercent = parseDecimalInput(form.taxRatePercent);

  if (!form.name.trim()) {
    errors.name = "이름을 입력해 주세요.";
  }

  if (!form.contact.trim()) {
    errors.contact = "연락처를 입력해 주세요.";
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.effectiveFrom)) {
    errors.effectiveFrom = "적용 시작일을 선택해 주세요.";
  }

  if (payAmount === null || payAmount <= 0) {
    errors.payAmount = "급여 금액을 입력해 주세요.";
  }

  if (
    form.taxType === "custom" &&
    (taxRatePercent === null || taxRatePercent < 0 || taxRatePercent > 100)
  ) {
    errors.taxRatePercent = "0~100 사이의 세율을 입력해 주세요.";
  }

  return errors;
}

function hasEditInfoFormErrors(errors: EditInfoFormErrors) {
  return Object.values(errors).some(Boolean);
}

function areEditInfoFormsEqual(
  left: EditInfoFormState,
  right: EditInfoFormState,
) {
  return areWorkerDetailSaveInputsEqual(
    createWorkerDetailSaveInput(left),
    createWorkerDetailSaveInput(right),
  );
}

function areWorkerDetailSaveInputsEqual(
  left: WorkerDetailBasicSaveInput,
  right: WorkerDetailBasicSaveInput,
) {
  return (
    left.contact === right.contact &&
    left.effectiveFrom === right.effectiveFrom &&
    left.hourlyRate === right.hourlyRate &&
    left.monthlySalary === right.monthlySalary &&
    left.name === right.name &&
    left.payrollType === right.payrollType &&
    left.status === right.status &&
    areStringSetsEqual(left.tagIds, right.tagIds) &&
    left.taxRatePercent === right.taxRatePercent &&
    left.taxType === right.taxType
  );
}

function areStringSetsEqual(
  left: readonly string[],
  right: readonly string[],
) {
  if (left.length !== right.length) {
    return false;
  }

  const rightValues = new Set(right);

  return left.every((value) => rightValues.has(value));
}

function createWorkerDetailSaveInput(
  form: EditInfoFormState,
): WorkerDetailBasicSaveInput {
  const payAmount = parseDecimalInput(form.payAmount) ?? 0;
  const taxRatePercent =
    form.taxType === "custom" ? parseDecimalInput(form.taxRatePercent) ?? 0 : null;

  return {
    contact: form.contact.trim(),
    effectiveFrom: form.effectiveFrom,
    hourlyRate: form.payrollType === "hourly" ? Math.round(payAmount) : null,
    monthlySalary: form.payrollType === "monthly" ? Math.round(payAmount) : null,
    name: form.name.trim(),
    payrollType: form.payrollType,
    status: form.status,
    tagIds: [...form.tagIds],
    taxRatePercent,
    taxType: form.taxType,
  };
}

function parseDecimalInput(value: string) {
  const normalizedValue = value.replace(/,/g, "").trim();

  if (!normalizedValue) {
    return null;
  }

  const number = Number(normalizedValue);

  return Number.isFinite(number) ? number : null;
}

function DeleteBlockedDialog({
  fixture,
  onClose,
}: {
  fixture: WorkerDetailBasicData["fixture"];
  onClose: () => void;
}) {
  const dialog = fixture.deleteBlockedDialog;

  return (
    <DialogBackdrop>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="worker-delete-blocked-dialog-title"
        className="flex w-[calc(100vw-32px)] max-w-[520px] flex-col gap-8 rounded-[8px] bg-white p-8 shadow-[0px_16px_44px_rgba(17,24,39,0.18)]"
        data-testid="worker-delete-blocked-dialog"
      >
        <h2
          id="worker-delete-blocked-dialog-title"
          className="text-h-20 text-gray-900"
        >
          {dialog.title}
        </h2>

        <div className="text-detail-16-regular text-gray-600">
          {dialog.description.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {dialog.blockers.map((blocker) => (
            <BlockerRow key={blocker.id} blocker={blocker} />
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="h-11 rounded-[8px] px-6 text-h-18-semibold tracking-normal text-white"
          >
            {dialog.confirmLabel}
          </Button>
        </div>
      </section>
    </DialogBackdrop>
  );
}

function BlockerRow({ blocker }: { blocker: DeleteBlocker }) {
  return (
    <div className="flex h-[56px] items-center gap-6 rounded-[8px] border border-gray-100 px-4">
      <span
        className={cn(
          "rounded-[4px] px-1.5 py-0.5 text-detail-16-semibold",
          blockerToneClassName[blocker.tone],
        )}
      >
        {blocker.label}
      </span>
      <span className="text-h-18-semibold text-gray-900">{blocker.value}</span>
    </div>
  );
}

function DialogBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#9a9a9a]/80">
      {children}
    </div>
  );
}
