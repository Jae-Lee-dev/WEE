import {
  type WorkerDetailBasicEditValues,
  type WorkerDetailBasicSaveInput,
  type WorkerDetailPayrollType,
  type WorkerDetailStatusValue,
  type WorkerDetailTaxType,
} from "../api/worker-detail-basic-data-source";

export type EditInfoFormField =
  | "contact"
  | "effectiveFrom"
  | "name"
  | "payAmount"
  | "taxRatePercent";

export type EditInfoFormErrors = Partial<Record<EditInfoFormField, string>>;

export type EditInfoFormState = {
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

export function createEditInfoFormState(
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

export function getEditInfoFormErrors(
  form: EditInfoFormState,
): EditInfoFormErrors {
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

export function hasEditInfoFormErrors(errors: EditInfoFormErrors) {
  return Object.values(errors).some(Boolean);
}

export function areEditInfoFormsEqual(
  left: EditInfoFormState,
  right: EditInfoFormState,
) {
  return areWorkerDetailSaveInputsEqual(
    createWorkerDetailSaveInput(left),
    createWorkerDetailSaveInput(right),
  );
}

export function createWorkerDetailSaveInput(
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

function parseDecimalInput(value: string) {
  const normalizedValue = value.replace(/,/g, "").trim();

  if (!normalizedValue) {
    return null;
  }

  const number = Number(normalizedValue);

  return Number.isFinite(number) ? number : null;
}
