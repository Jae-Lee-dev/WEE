"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CircleCheck,
  Clock3,
  Copy,
  CreditCard,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LoginForm } from "./login-form";
import { SignupForm } from "./signup-form";
import { createManagerWorkspace } from "./workspace-data-source";
import {
  getSetupGuideRedirectPath,
  persistWorkspaceOnboardingState,
  readWorkspaceOnboardingStatus,
} from "./workspace-onboarding-state";

type EntryScreenId = "AUTH-01" | "AUTH-02" | "AUTH-03";

type EntryShellProps = {
  title: string;
  description: string;
  activeStepIndex: number;
  children: ReactNode;
};

type AuthShellProps = {
  screenId: Extract<EntryScreenId, "AUTH-01" | "AUTH-02" | "AUTH-03">;
  title: string;
  description: string;
  children: ReactNode;
  cardClassName?: string;
};

type EntryFieldProps = {
  label: string;
  placeholder: string;
  type?: string;
  inputMode?: ComponentProps<"input">["inputMode"];
  defaultValue?: string;
  className?: string;
};

type SectionHeadingProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
};

type AdminSetupActionCardProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
};

type WorkspaceOnboardingStepId =
  | "workspace-info"
  | "plan"
  | "billing"
  | "code";

type WorkspacePlanId = "starter" | "standard";

type WorkspaceFormState = {
  workspaceName: string;
  businessNumber: string;
  ownerName: string;
  contact: string;
};

type BillingFormState = {
  cardNumber: string;
  expiry: string;
  cvc: string;
  holderName: string;
};

type WorkspaceFormField = keyof WorkspaceFormState;
type BillingFormField = keyof BillingFormState;
type WorkspaceFormErrors = Partial<Record<WorkspaceFormField, string>>;
type BillingFormErrors = Partial<Record<BillingFormField, string>>;

const onboardingProgressSteps = [
  {
    title: "소속 만들기",
    description: "기본 정보와 조교 신청 코드",
  },
  {
    title: "관리자 설정",
    description: "근무지와 첫 근무는 운영 화면에서 설정",
  },
] as const;

const workspaceCreationSteps: {
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

const initialWorkspaceForm: WorkspaceFormState = {
  workspaceName: "",
  businessNumber: "",
  ownerName: "",
  contact: "",
};

const initialBillingForm: BillingFormState = {
  cardNumber: "",
  expiry: "",
  cvc: "",
  holderName: "",
};

const planOptions: {
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

export function LoginScreen() {
  return (
    <AuthShell
      screenId="AUTH-01"
      title="로그인"
      description="관리자 계정으로 Wee 운영 화면에 접속합니다."
      cardClassName="max-w-[440px]"
    >
      <div className="w-full" data-testid="login-screen">
        <LoginForm />

        <p className="mt-4 text-center text-body-14-regular tracking-normal text-gray-500">
          계정이 없나요?{" "}
          <Link
            href="/signup"
            className="font-medium text-green-400 hover:text-green-500"
          >
            회원가입
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export function SignupScreen() {
  return (
    <AuthShell
      screenId="AUTH-02"
      title="회원가입"
      description="이메일과 비밀번호로 관리자 계정을 만듭니다."
      cardClassName="max-w-[480px]"
    >
      <div className="w-full" data-testid="signup-screen">
        <SignupForm />

        <p className="mt-5 text-center text-body-14-regular tracking-normal text-gray-500">
          이미 계정이 있나요?{" "}
          <Link
            href="/login"
            className="font-medium text-green-400 hover:text-green-500"
          >
            로그인
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export function ForgotPasswordScreen() {
  return (
    <AuthShell
      screenId="AUTH-03"
      title="아이디/비밀번호 찾기"
      description="가입 이메일 확인과 비밀번호 재설정을 한 화면에서 진행합니다."
      cardClassName="max-w-[760px]"
    >
      <div className="w-full" data-testid="forgot-password-screen">
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-[8px] border border-gray-200 bg-white p-5">
            <SectionHeading
              icon={UserRound}
              title="아이디 찾기"
              description="가입자 이름과 휴대폰 번호로 로그인 이메일을 확인합니다."
            />
            <div className="mt-5 space-y-4">
              <EntryField label="이름" placeholder="김민채" />
              <EntryField
                label="휴대폰 번호"
                type="tel"
                inputMode="tel"
                placeholder="010-0000-0000"
              />
            </div>
            <Button
              asChild
              variant="secondary"
              className="mt-6 h-[48px] w-full rounded-[8px] text-h-16-semibold tracking-normal"
            >
              <Link href="/forgot-password">가입 이메일 확인</Link>
            </Button>
          </section>

          <section className="rounded-[8px] border border-green-100 bg-green-50 p-5">
            <SectionHeading
              icon={KeyRound}
              title="비밀번호 재설정"
              description="로그인 이메일로 비밀번호 변경 링크를 발송합니다."
            />
            <div className="mt-5 rounded-[8px] border border-blue-50 bg-blue-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 size-5 shrink-0 text-blue-500" />
                <p className="text-body-14-regular tracking-normal text-gray-600">
                  등록된 관리자 이메일로만 재설정 안내가 전송됩니다.
                </p>
              </div>
            </div>
            <div className="mt-5">
              <EntryField
                label="이메일"
                type="email"
                placeholder="admin@wee.kr"
              />
            </div>
            <Button
              asChild
              className="mt-6 h-[48px] w-full rounded-[8px] text-h-16-semibold tracking-normal"
            >
              <Link href="/login">재설정 링크 보내기</Link>
            </Button>
          </section>
        </div>

        <div className="mt-6 rounded-[8px] border border-gray-200 bg-gray-50 px-4 py-4">
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 size-5 shrink-0 text-gray-500" />
            <p className="text-body-14-regular tracking-normal text-gray-600">
              휴대폰 번호가 변경된 경우 소속 관리자 인증 후 계정을 확인할 수
              있습니다.
            </p>
          </div>
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/login"
            className="text-label-14-medium tracking-normal text-gray-500 hover:text-green-400"
          >
            로그인으로 돌아가기
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

export function WorkspaceOnboardingScreen() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [workspaceForm, setWorkspaceForm] =
    useState<WorkspaceFormState>(initialWorkspaceForm);
  const [billingForm, setBillingForm] =
    useState<BillingFormState>(initialBillingForm);
  const [selectedPlan, setSelectedPlan] =
    useState<WorkspacePlanId>("starter");
  const [submittedSteps, setSubmittedSteps] = useState<
    Partial<Record<WorkspaceOnboardingStepId, boolean>>
  >({});
  const [workspaceCode, setWorkspaceCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [workspaceCreationError, setWorkspaceCreationError] = useState<
    string | null
  >(null);

  const activeStep = workspaceCreationSteps[activeStepIndex];
  const workspaceErrors = getWorkspaceFormErrors(workspaceForm);
  const billingErrors = getBillingFormErrors(billingForm);
  const hasWorkspaceErrors = hasFormErrors(workspaceErrors);
  const hasBillingErrors = hasFormErrors(billingErrors);

  const handleWorkspaceFieldChange =
    (field: WorkspaceFormField) => (event: ChangeEvent<HTMLInputElement>) => {
      setWorkspaceForm((current) => ({
        ...current,
        [field]:
          field === "businessNumber"
            ? normalizeBusinessNumberInput(event.target.value)
            : event.target.value,
      }));
    };

  const handleBillingFieldChange =
    (field: BillingFormField) => (event: ChangeEvent<HTMLInputElement>) => {
      setBillingForm((current) => ({
        ...current,
        [field]:
          field === "cardNumber" || field === "cvc"
            ? normalizeDigits(event.target.value)
            : field === "expiry"
              ? normalizeExpiryInput(event.target.value)
              : event.target.value,
      }));
    };

  const handleWorkspaceContinue = () => {
    setSubmittedSteps((current) => ({ ...current, "workspace-info": true }));

    if (hasWorkspaceErrors) {
      return;
    }

    setActiveStepIndex(1);
  };

  const handlePlanContinue = async () => {
    setSubmittedSteps((current) => ({ ...current, plan: true }));

    if (selectedPlan === "starter") {
      await issueWorkspaceCode("starter");
      return;
    }

    setActiveStepIndex(2);
  };

  const handleBillingContinue = async () => {
    setSubmittedSteps((current) => ({ ...current, billing: true }));

    if (hasBillingErrors) {
      return;
    }

    await issueWorkspaceCode(selectedPlan);
  };

  const issueWorkspaceCode = async (planId: WorkspacePlanId) => {
    if (workspaceCode) {
      setActiveStepIndex(3);
      return;
    }

    setIsCreatingWorkspace(true);
    setWorkspaceCreationError(null);

    try {
      const workspaceState = await createManagerWorkspace({
        businessNumber: workspaceForm.businessNumber,
        contact: workspaceForm.contact,
        ownerName: workspaceForm.ownerName,
        planId,
        workspaceName: workspaceForm.workspaceName,
      });

      persistWorkspaceOnboardingState({
        status: workspaceState.status,
        userId: workspaceState.managerUid,
        workspaceId: workspaceState.workspaceId,
      });
      setWorkspaceCode(workspaceState.workspaceCode ?? "");
      setCodeCopied(false);
      setActiveStepIndex(3);
    } catch (error) {
      setWorkspaceCreationError(getWorkspaceCreationErrorMessage(error));
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const goBack = () => {
    setActiveStepIndex((current) => {
      if (current === 3 && selectedPlan === "starter") {
        return 1;
      }

      return Math.max(0, current - 1);
    });
  };

  const switchToStarter = async () => {
    setSelectedPlan("starter");
    await issueWorkspaceCode("starter");
  };

  const copyWorkspaceCode = () => {
    if (
      !workspaceCode ||
      typeof navigator === "undefined" ||
      !navigator.clipboard
    ) {
      return;
    }

    void navigator.clipboard.writeText(workspaceCode).then(() => {
      setCodeCopied(true);
    });
  };

  return (
    <EntryShell
      title="소속 생성"
      description="사업장 정보, 요금제, 조교 소속 신청 코드를 순서대로 준비합니다."
      activeStepIndex={0}
    >
      <div className="w-full" data-testid="workspace-onboarding-screen">
        <WorkspaceCreationProgress
          activeStepIndex={activeStepIndex}
          selectedPlan={selectedPlan}
        />

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section
            className="min-h-[480px] rounded-[8px] border border-gray-200 bg-white p-5"
            data-testid={`workspace-onboarding-step-${activeStep.id}`}
          >
            {activeStep.id === "workspace-info" ? (
              <WorkspaceInfoStep
                errors={workspaceErrors}
                form={workspaceForm}
                onChange={handleWorkspaceFieldChange}
                onContinue={handleWorkspaceContinue}
                showErrors={Boolean(submittedSteps["workspace-info"])}
              />
            ) : null}

            {activeStep.id === "plan" ? (
              <PlanSelectionStep
                isSubmitting={isCreatingWorkspace}
                onBack={goBack}
                onContinue={handlePlanContinue}
                onPlanChange={setSelectedPlan}
                selectedPlan={selectedPlan}
              />
            ) : null}

            {activeStep.id === "billing" ? (
              <BillingStep
                errors={billingErrors}
                form={billingForm}
                isSubmitting={isCreatingWorkspace}
                onBack={goBack}
                onChange={handleBillingFieldChange}
                onContinue={handleBillingContinue}
                onSwitchToStarter={switchToStarter}
                showErrors={Boolean(submittedSteps.billing)}
              />
            ) : null}

            {activeStep.id === "code" ? (
              <WorkspaceCodeStep
                codeCopied={codeCopied}
                onBack={goBack}
                onCopy={copyWorkspaceCode}
                planId={selectedPlan}
                workspaceCode={workspaceCode}
                workspaceName={workspaceForm.workspaceName}
              />
            ) : null}

            {workspaceCreationError ? (
              <p
                className="mt-5 rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-body-14-medium tracking-normal text-red-500"
                role="alert"
              >
                {workspaceCreationError}
              </p>
            ) : null}
          </section>

          <WorkspaceCreationSummary
            activeStepIndex={activeStepIndex}
            billingComplete={activeStepIndex === 3 && selectedPlan === "standard"}
            planId={selectedPlan}
            workspaceCode={workspaceCode}
            workspaceForm={workspaceForm}
          />
        </div>
      </div>
    </EntryShell>
  );
}

function WorkspaceInfoStep({
  errors,
  form,
  onChange,
  onContinue,
  showErrors,
}: {
  errors: WorkspaceFormErrors;
  form: WorkspaceFormState;
  onChange: (
    field: WorkspaceFormField,
  ) => (event: ChangeEvent<HTMLInputElement>) => void;
  onContinue: () => void;
  showErrors: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <SectionHeading
        icon={Building2}
        title="사업장 정보 입력"
        description="사업자등록번호는 숫자 10자리 기준으로 확인합니다."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <WorkspaceTextField
          error={showErrors ? errors.workspaceName : undefined}
          label="소속 이름"
          name="workspaceName"
          onChange={onChange("workspaceName")}
          placeholder="Wee 강남캠퍼스"
          value={form.workspaceName}
        />
        <WorkspaceTextField
          error={showErrors ? errors.businessNumber : undefined}
          inputMode="numeric"
          label="사업자등록번호"
          maxLength={12}
          name="businessNumber"
          onChange={onChange("businessNumber")}
          placeholder="000-00-00000"
          value={formatBusinessNumber(form.businessNumber)}
        />
        <WorkspaceTextField
          error={showErrors ? errors.ownerName : undefined}
          label="대표자명"
          name="ownerName"
          onChange={onChange("ownerName")}
          placeholder="김민채"
          value={form.ownerName}
        />
        <WorkspaceTextField
          error={showErrors ? errors.contact : undefined}
          inputMode="tel"
          label="대표 연락처"
          name="contact"
          onChange={onChange("contact")}
          placeholder="02-0000-0000"
          type="tel"
          value={form.contact}
        />
      </div>

      <div className="mt-auto flex justify-end pt-8">
        <Button
          type="button"
          onClick={onContinue}
          className="h-[50px] rounded-[8px] px-7 text-h-18-semibold tracking-normal"
        >
          요금제 선택으로 이동
          <ArrowRight className="size-5" strokeWidth={2.2} />
        </Button>
      </div>
    </div>
  );
}

function PlanSelectionStep({
  isSubmitting,
  onBack,
  onContinue,
  onPlanChange,
  selectedPlan,
}: {
  isSubmitting: boolean;
  onBack: () => void;
  onContinue: () => void | Promise<void>;
  onPlanChange: (plan: WorkspacePlanId) => void;
  selectedPlan: WorkspacePlanId;
}) {
  const selectedPlanLabel = getPlanLabel(selectedPlan);

  return (
    <div className="flex h-full flex-col">
      <SectionHeading
        icon={CreditCard}
        title="요금제 선택"
        description="Starter는 결제 정보 없이 소속 코드를 발급합니다."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-2" role="radiogroup">
        {planOptions.map((plan) => (
          <PlanOption
            key={plan.id}
            details={plan.details}
            description={plan.description}
            onSelect={() => onPlanChange(plan.id)}
            price={plan.price}
            selected={selectedPlan === plan.id}
            title={plan.title}
          />
        ))}
      </div>

      <div className="mt-5 rounded-[8px] border border-gray-200 bg-gray-50 px-4 py-3 text-body-14-regular tracking-normal text-gray-600">
        현재 선택한 요금제는{" "}
        <span className="font-medium text-gray-900">{selectedPlanLabel}</span>
        입니다.
      </div>

      <div className="mt-auto flex flex-wrap justify-between gap-3 pt-8">
        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={onBack}
          className="h-[50px] rounded-[8px] px-6 text-h-18-semibold tracking-normal"
        >
          <ArrowLeft className="size-5" strokeWidth={2.2} />
          이전
        </Button>
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={onContinue}
          className="h-[50px] rounded-[8px] px-7 text-h-18-semibold tracking-normal"
        >
          {isSubmitting
            ? "소속 생성 중"
            : selectedPlan === "starter"
              ? "소속 코드 발급"
              : "결제 정보 등록"}
          <ArrowRight className="size-5" strokeWidth={2.2} />
        </Button>
      </div>
    </div>
  );
}

function BillingStep({
  errors,
  form,
  isSubmitting,
  onBack,
  onChange,
  onContinue,
  onSwitchToStarter,
  showErrors,
}: {
  errors: BillingFormErrors;
  form: BillingFormState;
  isSubmitting: boolean;
  onBack: () => void;
  onChange: (
    field: BillingFormField,
  ) => (event: ChangeEvent<HTMLInputElement>) => void;
  onContinue: () => void | Promise<void>;
  onSwitchToStarter: () => void | Promise<void>;
  showErrors: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <SectionHeading
        icon={CreditCard}
        title="결제 정보 등록"
        description="Standard 요금제 활성화를 위한 카드 정보를 입력합니다."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <WorkspaceTextField
          className="sm:col-span-2"
          error={showErrors ? errors.cardNumber : undefined}
          inputMode="numeric"
          label="카드번호"
          maxLength={19}
          name="cardNumber"
          onChange={onChange("cardNumber")}
          placeholder="0000 0000 0000 0000"
          value={formatCardNumber(form.cardNumber)}
        />
        <WorkspaceTextField
          error={showErrors ? errors.expiry : undefined}
          inputMode="numeric"
          label="유효기간"
          maxLength={5}
          name="expiry"
          onChange={onChange("expiry")}
          placeholder="MM/YY"
          value={form.expiry}
        />
        <WorkspaceTextField
          error={showErrors ? errors.cvc : undefined}
          inputMode="numeric"
          label="CVC"
          maxLength={3}
          name="cvc"
          onChange={onChange("cvc")}
          placeholder="000"
          value={form.cvc}
        />
        <WorkspaceTextField
          className="sm:col-span-2"
          error={showErrors ? errors.holderName : undefined}
          label="카드 소유자명"
          name="holderName"
          onChange={onChange("holderName")}
          placeholder="김민채"
          value={form.holderName}
        />
      </div>

      <div className="mt-5 rounded-[8px] border border-blue-50 bg-blue-50 px-4 py-3 text-body-14-regular tracking-normal text-gray-600">
        카드 등록이 완료되면 소속 코드가 발급됩니다. 카드 등록을 원하지 않으면
        Starter로 시작할 수 있습니다.
      </div>

      <div className="mt-auto flex flex-wrap justify-between gap-3 pt-8">
        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={onBack}
          className="h-[50px] rounded-[8px] px-6 text-h-18-semibold tracking-normal"
        >
          <ArrowLeft className="size-5" strokeWidth={2.2} />
          이전
        </Button>
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={onSwitchToStarter}
            className="h-[50px] rounded-[8px] px-6 text-h-18-semibold tracking-normal"
          >
            Starter로 변경
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={onContinue}
            className="h-[50px] rounded-[8px] px-7 text-h-18-semibold tracking-normal"
          >
            {isSubmitting ? "소속 생성 중" : "결제 정보 저장"}
            <ArrowRight className="size-5" strokeWidth={2.2} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function WorkspaceCodeStep({
  codeCopied,
  onBack,
  onCopy,
  planId,
  workspaceCode,
  workspaceName,
}: {
  codeCopied: boolean;
  onBack: () => void;
  onCopy: () => void;
  planId: WorkspacePlanId;
  workspaceCode: string;
  workspaceName: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <SectionHeading
        icon={ShieldCheck}
        title="소속 코드 발급 완료"
        description="조교는 이 코드로 소속 신청을 보낼 수 있습니다."
      />

      <div className="mt-8 rounded-[8px] border border-green-200 bg-green-50 px-5 py-6 text-center">
        <p className="text-label-14-medium tracking-normal text-gray-600">
          {workspaceName || "새 소속"}
        </p>
        <div className="mt-3 text-[34px] font-semibold leading-none tracking-normal text-green-500">
          {workspaceCode}
        </div>
        <div className="mt-3 flex justify-center">
          <Badge variant={planId === "standard" ? "blue" : "green"} size="M">
            {getPlanLabel(planId)}
          </Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCopy}
          className="h-[48px] rounded-[8px] px-5 text-h-16-semibold tracking-normal"
        >
          <Copy className="size-4" strokeWidth={2.2} />
          {codeCopied ? "복사됨" : "코드 복사"}
        </Button>
        <Button
          asChild
          className="h-[48px] rounded-[8px] px-5 text-h-16-semibold tracking-normal"
        >
          <Link href="/onboarding/setup">
            관리자 설정으로 이동
            <ArrowRight className="size-4" strokeWidth={2.2} />
          </Link>
        </Button>
      </div>

      <div className="mt-auto flex justify-start pt-8">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="h-[44px] rounded-[8px] px-4 text-h-16-semibold tracking-normal"
        >
          <ArrowLeft className="size-4" strokeWidth={2.2} />
          이전 단계 수정
        </Button>
      </div>
    </div>
  );
}

function WorkspaceCreationProgress({
  activeStepIndex,
  selectedPlan,
}: {
  activeStepIndex: number;
  selectedPlan: WorkspacePlanId;
}) {
  return (
    <nav
      aria-label="소속 생성 세부 단계"
      className="grid gap-3 md:grid-cols-4"
      data-testid="workspace-creation-progress"
    >
      {workspaceCreationSteps.map((step, index) => {
        const active = activeStepIndex === index;
        const billingSkipped =
          step.id === "billing" &&
          selectedPlan === "starter" &&
          activeStepIndex === 3;
        const complete = index < activeStepIndex && !billingSkipped;
        const reached = active || complete || billingSkipped;

        return (
          <div
            key={step.id}
            aria-current={active ? "step" : undefined}
            className={cn(
              "min-h-[116px] rounded-[8px] border bg-white p-4",
              reached ? "border-green-200" : "border-gray-200",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-label-12-medium tracking-normal",
                  reached ? "bg-green-400 text-white" : "bg-gray-100 text-gray-500",
                )}
              >
                {complete ? <Check className="size-4" strokeWidth={2.4} /> : index + 1}
              </span>
              <Badge
                variant={active ? "green" : billingSkipped ? "grey" : complete ? "blue" : "outline"}
                size="M"
              >
                {active ? "진행중" : billingSkipped ? "건너뜀" : complete ? "완료" : "대기"}
              </Badge>
            </div>
            <div className="mt-3 text-label-14-medium tracking-normal text-gray-900">
              {step.title}
            </div>
            <div className="mt-1 text-label-12-regular tracking-normal text-gray-500">
              {step.description}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function WorkspaceCreationSummary({
  activeStepIndex,
  billingComplete,
  planId,
  workspaceCode,
  workspaceForm,
}: {
  activeStepIndex: number;
  billingComplete: boolean;
  planId: WorkspacePlanId;
  workspaceCode: string;
  workspaceForm: WorkspaceFormState;
}) {
  const planLabel = getPlanLabel(planId);
  const billingStatus =
    planId === "starter" ? "불필요" : billingComplete ? "등록 완료" : "등록 전";
  const status = activeStepIndex === 3 ? "발급 완료" : "진행 중";

  return (
    <aside className="h-fit rounded-[8px] border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-h-16-semibold tracking-normal text-gray-900">
          생성 요약
        </div>
        <Badge variant={activeStepIndex === 3 ? "green" : "grey"} size="M">
          {status}
        </Badge>
      </div>

      <dl className="mt-5 space-y-3 text-body-14-regular tracking-normal">
        <InfoPair
          label="소속 이름"
          value={workspaceForm.workspaceName.trim() || "입력 전"}
        />
        <InfoPair
          label="사업자등록번호"
          value={
            workspaceForm.businessNumber
              ? formatBusinessNumber(workspaceForm.businessNumber)
              : "입력 전"
          }
        />
        <InfoPair
          label="대표자"
          value={workspaceForm.ownerName.trim() || "입력 전"}
        />
        <InfoPair label="요금제" value={planLabel} />
        <InfoPair label="결제 정보" value={billingStatus} />
      </dl>

      <div className="mt-5 border-t border-gray-200 pt-5">
        <div className="text-label-12-medium tracking-normal text-gray-500">
          조교 소속 신청 코드
        </div>
        <div className="mt-2 text-[28px] font-semibold leading-none tracking-normal text-green-500">
          {workspaceCode || "발급 전"}
        </div>
      </div>
    </aside>
  );
}

function WorkspaceTextField({
  className,
  error,
  id,
  label,
  ...props
}: ComponentProps<"input"> & {
  error?: string;
  label: string;
}) {
  const inputId = id ?? `workspace-${props.name}`;
  const errorId = `${inputId}-error`;

  return (
    <label className={cn("block", className)}>
      <span className="mb-2 block text-label-14-medium tracking-normal text-gray-700">
        {label}
      </span>
      <Input
        id={inputId}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className="h-12 rounded-[8px] border-gray-200 text-body-16-regular tracking-normal"
        {...props}
      />
      {error ? (
        <p
          id={errorId}
          className="mt-2 text-label-12-medium tracking-normal text-red-500"
        >
          {error}
        </p>
      ) : null}
    </label>
  );
}

function getWorkspaceFormErrors(form: WorkspaceFormState): WorkspaceFormErrors {
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

function getBillingFormErrors(form: BillingFormState): BillingFormErrors {
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

function hasFormErrors(errors: WorkspaceFormErrors | BillingFormErrors) {
  return Object.keys(errors).length > 0;
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeBusinessNumberInput(value: string) {
  return normalizeDigits(value).slice(0, 10);
}

function normalizeExpiryInput(value: string) {
  const digits = normalizeDigits(value).slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function formatBusinessNumber(value: string) {
  const digits = normalizeDigits(value).slice(0, 10);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 5) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function formatCardNumber(value: string) {
  return normalizeDigits(value)
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

function getPlanLabel(planId: WorkspacePlanId) {
  return planId === "starter" ? "Starter" : "Standard";
}

function getWorkspaceCreationErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "소속 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

export function SetupGuideScreen() {
  const router = useRouter();

  useEffect(() => {
    const redirectPath = getSetupGuideRedirectPath(
      readWorkspaceOnboardingStatus(),
    );

    if (redirectPath) {
      router.replace(redirectPath);
    }
  }, [router]);

  return (
    <EntryShell
      title="관리자 설정으로 이어가기"
      description="근무지와 첫 근무는 실제 운영 데이터가 쌓이는 관리자 화면에서 설정합니다."
      activeStepIndex={1}
    >
      <div className="w-full" data-testid="setup-guide-screen">
        <section className="rounded-[8px] border border-gray-200 bg-white p-5">
          <SectionHeading
            icon={ShieldCheck}
            title="초기 운영 설정"
            description="소속 생성 후에는 관리자 인터페이스에서 근무지와 근무를 바로 관리합니다."
          />

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <AdminSetupActionCard
              icon={MapPin}
              title="근무지 관리"
              description="주소와 출퇴근 허용 반경을 등록합니다. 반경은 숫자로 입력하고 m 단위가 붙습니다."
              href="/settings/locations"
              actionLabel="근무지 관리 열기"
            />
            <AdminSetupActionCard
              icon={Clock3}
              title="근무 목록"
              description="요일, 시간, 시급 기준으로 조교가 배정될 첫 근무를 개설합니다."
              href="/schedule/duties"
              actionLabel="근무 개설 열기"
            />
          </div>
        </section>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button
            asChild
            variant="secondary"
            className="h-[50px] rounded-[8px] px-7 text-h-18-semibold tracking-normal"
          >
            <Link href="/dashboard">대시보드로 이동</Link>
          </Button>
          <Button
            asChild
            className="h-[50px] rounded-[8px] px-7 text-h-18-semibold tracking-normal"
          >
            <Link href="/settings/locations">
              근무지부터 설정
              <ArrowRight className="size-5" strokeWidth={2.2} />
            </Link>
          </Button>
        </div>
      </div>
    </EntryShell>
  );
}

function AuthShell({
  title,
  description,
  children,
  cardClassName,
}: AuthShellProps) {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-gray-50 px-4 py-4 tracking-normal text-gray-900 sm:px-5 sm:py-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100dvh-32px)] w-full max-w-[1040px] items-center justify-center sm:min-h-[calc(100dvh-48px)]">
        <div
          className={cn(
            "w-full max-w-[560px] rounded-[10px] border border-gray-200 bg-white px-6 py-6 shadow-[0_18px_48px_rgba(17,24,39,0.08)] sm:px-7 lg:px-8 lg:py-7",
            cardClassName,
          )}
        >
          <header className="text-center">
            <AuthLogo />
            <h1 className="mt-5 text-h-32 tracking-normal text-gray-900">
              {title}
            </h1>
            <p className="mt-2 text-body-16-regular tracking-normal text-gray-500">
              {description}
            </p>
          </header>

          <div className="mt-6">{children}</div>
        </div>
      </section>
    </main>
  );
}

function EntryShell({
  title,
  description,
  activeStepIndex,
  children,
}: EntryShellProps) {
  return (
    <main className="min-h-screen bg-gray-50 px-5 py-6 tracking-normal text-gray-900 md:px-8 lg:py-8">
      <div className="mx-auto min-h-[calc(100vh-64px)] w-full max-w-[1040px]">
        <header className="flex items-center justify-between gap-4">
          <BrandBlock />
        </header>

        <OnboardingProgress activeIndex={activeStepIndex} />

        <section className="mt-7">
          <header className="max-w-[720px]">
            <p className="text-label-14-medium tracking-normal text-green-500">
              Wee 시작하기
            </p>
            <h1 className="mt-3 text-h-32 tracking-normal text-gray-900">
              {title}
            </h1>
            <p className="mt-2 text-body-16-regular tracking-normal text-gray-500">
              {description}
            </p>
          </header>

          <div className="mt-6">{children}</div>
        </section>
      </div>
    </main>
  );
}

function OnboardingProgress({ activeIndex }: { activeIndex: number }) {
  return (
    <nav
      aria-label="온보딩 진행 단계"
      className="mt-7"
      data-testid="onboarding-progress"
    >
      <ol className="grid gap-3 sm:grid-cols-2">
        {onboardingProgressSteps.map((step, index) => {
          const active = index === activeIndex;
          const reached = index <= activeIndex;

          return (
            <li
              key={step.title}
              aria-current={active ? "step" : undefined}
              className={cn(
                "min-h-[94px] rounded-[10px] border bg-white p-4 shadow-[0_12px_32px_rgba(17,24,39,0.04)]",
                reached ? "border-green-200" : "border-gray-200",
              )}
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full",
                  reached ? "bg-green-400" : "bg-gray-200",
                )}
              />
              <span className="mt-3 flex items-start gap-3">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-label-12-medium tracking-normal",
                    reached ? "bg-green-400 text-white" : "bg-gray-100 text-gray-500",
                  )}
                >
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-label-14-medium tracking-normal text-gray-900">
                    {step.title}
                  </span>
                  <span className="mt-1 block text-label-12-regular tracking-normal text-gray-500">
                    {step.description}
                  </span>
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function BrandBlock() {
  return (
    <Link
      href="/login"
      className="flex w-fit items-center gap-3 rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
    >
      <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white">
        <Image
          src="/admin-shell/logo.png"
          alt=""
          width={72}
          height={50}
          priority
          className="h-8 w-auto object-contain"
        />
      </span>
      <span>
        <span className="block text-h-20 tracking-normal text-gray-900">
          Wee
        </span>
        <span className="block text-label-12-medium tracking-normal text-gray-500">
          관리자
        </span>
      </span>
    </Link>
  );
}

function AuthLogo() {
  return (
    <Link
      href="/login"
      className="inline-flex items-center justify-center rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
    >
      <Image
        src="/admin-shell/logo.png"
        alt="Wee"
        width={96}
        height={67}
        priority
        className="h-10 w-auto object-contain"
      />
    </Link>
  );
}

function AdminSetupActionCard({
  icon: Icon,
  title,
  description,
  href,
  actionLabel,
}: AdminSetupActionCardProps) {
  return (
    <article className="rounded-[8px] border border-gray-200 bg-gray-50 p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-white text-green-400">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-h-18-semibold tracking-normal text-gray-900">
            {title}
          </h2>
          <p className="mt-1 text-body-14-regular tracking-normal text-gray-500">
            {description}
          </p>
        </div>
      </div>

      <Button
        asChild
        variant="secondary"
        className="mt-5 h-[46px] w-full justify-between rounded-[8px] px-4 text-h-16-semibold tracking-normal"
      >
        <Link href={href}>
          {actionLabel}
          <ArrowRight className="size-4" strokeWidth={2.2} />
        </Link>
      </Button>
    </article>
  );
}

function EntryField({
  label,
  placeholder,
  type = "text",
  inputMode,
  defaultValue,
  className,
}: EntryFieldProps) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-2 block text-label-14-medium tracking-normal text-gray-700">
        {label}
      </span>
      <Input
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="h-12 rounded-[8px] border-gray-200 text-body-16-regular tracking-normal"
      />
    </label>
  );
}

function SectionHeading({ icon: Icon, title, description }: SectionHeadingProps) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-green-100 text-green-400">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <h2 className="text-h-20 tracking-normal text-gray-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-body-14-regular tracking-normal text-gray-500">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-800">{value}</dd>
    </div>
  );
}

function PlanOption({
  details,
  description,
  onSelect,
  price,
  selected = false,
  title,
}: {
  details: readonly string[];
  description: string;
  onSelect: () => void;
  price: string;
  selected?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "rounded-[8px] border px-4 py-4 text-left transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200",
        selected ? "border-green-400 bg-green-50" : "border-gray-200 bg-white",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-h-18-semibold tracking-normal text-gray-900">
            {title}
          </div>
          <div className="mt-1 text-body-14-medium tracking-normal text-green-400">
            {price}
          </div>
          <div className="mt-2 text-body-14-regular tracking-normal text-gray-500">
            {description}
          </div>
        </div>
        <span
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full",
            selected ? "bg-green-400 text-white" : "bg-gray-100 text-gray-400",
          )}
        >
          <Check className="size-4" strokeWidth={2.4} />
        </span>
      </div>
      <ul className="mt-4 space-y-2">
        {details.map((detail) => (
          <li
            key={detail}
            className="flex items-center gap-2 text-body-14-regular tracking-normal text-gray-600"
          >
            <CircleCheck className="size-4 text-green-400" strokeWidth={2.2} />
            {detail}
          </li>
        ))}
      </ul>
    </button>
  );
}
