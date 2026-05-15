export type WorkspaceOnboardingStepId = "workspace-info" | "code";

export type WorkspaceFormState = {
  workspaceName: string;
  businessNumber: string;
  ownerName: string;
  contact: string;
};

export type WorkspaceFormField = keyof WorkspaceFormState;
export type WorkspaceFormErrors = Partial<Record<WorkspaceFormField, string>>;
export type WorkspaceStepStatusTone = "active" | "complete" | "pending";
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

export function hasFormErrors(errors: WorkspaceFormErrors) {
  return Object.keys(errors).length > 0;
}

export function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeBusinessNumberInput(value: string) {
  return normalizeDigits(value).slice(0, 10);
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

export function getWorkspaceStepStatus({
  activeStepIndex,
  index,
  stepId,
  workspaceCode,
}: {
  activeStepIndex: number;
  index: number;
  stepId: WorkspaceOnboardingStepId;
  workspaceCode: string;
}): WorkspaceStepStatus {
  if (stepId === "code" && workspaceCode) {
    return { badgeVariant: "green", label: "발급 완료", tone: "complete" };
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
