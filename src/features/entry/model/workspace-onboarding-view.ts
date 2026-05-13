export type WorkspaceOnboardingStepId =
  | "workspace-info"
  | "plan"
  | "billing"
  | "code";

export type WorkspacePlanId = "starter" | "standard";

export type WorkspaceFormState = {
  workspaceName: string;
  businessNumber: string;
  ownerName: string;
  contact: string;
};

export type BillingFormState = {
  cardNumber: string;
  expiry: string;
  cvc: string;
  holderName: string;
};

export type WorkspaceFormField = keyof WorkspaceFormState;
export type BillingFormField = keyof BillingFormState;
export type WorkspaceFormErrors = Partial<Record<WorkspaceFormField, string>>;
export type BillingFormErrors = Partial<Record<BillingFormField, string>>;
export type WorkspaceStepStatusTone =
  | "active"
  | "complete"
  | "pending"
  | "skipped";
export type WorkspaceStepStatus = {
  badgeVariant: "blue" | "green" | "grey" | "outline";
  label: string;
  tone: WorkspaceStepStatusTone;
};

export const workspaceCreationSteps: {
  id: WorkspaceOnboardingStepId;
  title: string;
  description: string;
}[] = [
  {
    id: "workspace-info",
    title: "사업장 정보",
    description: "관리자와 조교에게 표시되는 기본 정보",
  },
  {
    id: "plan",
    title: "요금제 선택",
    description: "초기 운영 범위에 맞는 플랜",
  },
  {
    id: "billing",
    title: "결제 정보",
    description: "Standard 선택 시 필요한 카드 정보",
  },
  {
    id: "code",
    title: "코드 발급",
    description: "조교 소속 신청에 사용할 코드",
  },
];

export const initialWorkspaceForm: WorkspaceFormState = {
  workspaceName: "",
  businessNumber: "",
  ownerName: "",
  contact: "",
};

export const initialBillingForm: BillingFormState = {
  cardNumber: "",
  expiry: "",
  cvc: "",
  holderName: "",
};

export const planOptions: {
  id: WorkspacePlanId;
  title: string;
  price: string;
  description: string;
  details: readonly string[];
}[] = [
  {
    id: "starter",
    title: "Starter",
    price: "월 0원",
    description: "소규모 운영을 바로 시작하는 무료 플랜",
    details: ["근무지 기본 관리", "조교 소속 승인", "근무 기록 확인"],
  },
  {
    id: "standard",
    title: "Standard",
    price: "월 49,000원",
    description: "인수인계와 정산까지 함께 관리하는 플랜",
    details: ["인수인계 AI", "급여 명세 관리", "운영 알림 확장"],
  },
];

export function getWorkspaceFormErrors(
  form: WorkspaceFormState,
): WorkspaceFormErrors {
  const errors: WorkspaceFormErrors = {};

  if (!form.workspaceName.trim()) {
    errors.workspaceName = "소속 이름을 입력해 주세요.";
  }

  if (normalizeDigits(form.businessNumber).length !== 10) {
    errors.businessNumber = "사업자등록번호 10자리를 입력해 주세요.";
  }

  if (!form.ownerName.trim()) {
    errors.ownerName = "대표자명을 입력해 주세요.";
  }

  if (!form.contact.trim()) {
    errors.contact = "대표 연락처를 입력해 주세요.";
  }

  return errors;
}

export function getBillingFormErrors(
  form: BillingFormState,
): BillingFormErrors {
  const errors: BillingFormErrors = {};

  if (normalizeDigits(form.cardNumber).length !== 16) {
    errors.cardNumber = "카드번호 16자리를 입력해 주세요.";
  }

  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(form.expiry)) {
    errors.expiry = "유효기간을 MM/YY 형식으로 입력해 주세요.";
  }

  if (!/^\d{3}$/.test(form.cvc)) {
    errors.cvc = "CVC 3자리를 입력해 주세요.";
  }

  if (!form.holderName.trim()) {
    errors.holderName = "카드 소유자명을 입력해 주세요.";
  }

  return errors;
}

export function hasFormErrors(
  errors: WorkspaceFormErrors | BillingFormErrors,
) {
  return Object.keys(errors).length > 0;
}

export function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeBusinessNumberInput(value: string) {
  return normalizeDigits(value).slice(0, 10);
}

export function normalizeExpiryInput(value: string) {
  const digits = normalizeDigits(value).slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function formatBusinessNumber(value: string) {
  const digits = normalizeDigits(value).slice(0, 10);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 5) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function formatCardNumber(value: string) {
  return normalizeDigits(value)
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function getPlanLabel(planId: WorkspacePlanId) {
  return planId === "starter" ? "Starter" : "Standard";
}

export function getWorkspaceStepStatus({
  activeStepIndex,
  billingComplete = false,
  index,
  selectedPlan,
  stepId,
  workspaceCode,
}: {
  activeStepIndex: number;
  billingComplete?: boolean;
  index: number;
  selectedPlan: WorkspacePlanId;
  stepId: WorkspaceOnboardingStepId;
  workspaceCode: string;
}): WorkspaceStepStatus {
  const billingSkipped =
    stepId === "billing" &&
    selectedPlan === "starter" &&
    activeStepIndex === 3;

  if (billingSkipped) {
    return { badgeVariant: "grey", label: "건너뜀", tone: "skipped" };
  }

  if (stepId === "code" && workspaceCode) {
    return { badgeVariant: "green", label: "발급 완료", tone: "complete" };
  }

  if (stepId === "billing" && billingComplete) {
    return { badgeVariant: "blue", label: "등록 완료", tone: "complete" };
  }

  if (activeStepIndex === index) {
    return { badgeVariant: "green", label: "진행중", tone: "active" };
  }

  if (index < activeStepIndex) {
    return { badgeVariant: "blue", label: "완료", tone: "complete" };
  }

  return { badgeVariant: "outline", label: "대기", tone: "pending" };
}

export function getWorkspaceCreationErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "소속 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}
