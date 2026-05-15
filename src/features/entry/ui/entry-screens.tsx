"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  type ChangeEvent,
  type ComponentProps,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Clock3,
  Copy,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";
import {
  AdminSetupActionCard,
  AuthShell,
  EntryField,
  EntryShell,
  SectionHeading,
} from "./entry-shell";
import { LoginForm } from "./login-form";
import { SignupForm } from "./signup-form";
import { createManagerWorkspace } from "@/entities/workspace";
import {
  createWorkspaceSetupDataSource,
  type WorkspaceSetupProgress,
} from "../api/workspace-setup-data-source";
import {
  getSetupGuideRedirectPath,
  persistWorkspaceOnboardingState,
  readWorkspaceOnboardingStatus,
} from "@/entities/workspace";
import {
  formatBusinessNumber,
  getWorkspaceCreationErrorMessage,
  getWorkspaceFormErrors,
  getWorkspaceStepStatus,
  hasFormErrors,
  initialWorkspaceForm,
  normalizeBusinessNumberInput,
  workspaceCreationSteps,
  type WorkspaceFormErrors,
  type WorkspaceFormField,
  type WorkspaceFormState,
  type WorkspaceOnboardingStepId,
} from "../model/workspace-onboarding-view";

type SetupProgressStepState = "active" | "complete" | "pending";
type SetupProgressStep = {
  caption: string;
  state: SetupProgressStepState;
  title: string;
};

const emptySetupProgress: WorkspaceSetupProgress = {
  dutyCount: 0,
  locationCount: 0,
  setupComplete: false,
  status: "workspace-created",
};

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
  const hasWorkspaceErrors = hasFormErrors(workspaceErrors);

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

  const handleWorkspaceContinue = async () => {
    setSubmittedSteps((current) => ({ ...current, "workspace-info": true }));

    if (hasWorkspaceErrors) {
      return;
    }

    await issueWorkspaceCode();
  };

  const issueWorkspaceCode = async () => {
    if (workspaceCode) {
      setActiveStepIndex(1);
      return;
    }

    setIsCreatingWorkspace(true);
    setWorkspaceCreationError(null);

    try {
      const workspaceState = await createManagerWorkspace({
        businessNumber: workspaceForm.businessNumber,
        contact: workspaceForm.contact,
        ownerName: workspaceForm.ownerName,
        planId: "starter",
        workspaceName: workspaceForm.workspaceName,
      });

      persistWorkspaceOnboardingState({
        status: workspaceState.status,
        userId: workspaceState.managerUid,
        workspaceId: workspaceState.workspaceId,
      });
      setWorkspaceCode(workspaceState.workspaceCode ?? "");
      setCodeCopied(false);
      setActiveStepIndex(1);
    } catch (error) {
      setWorkspaceCreationError(getWorkspaceCreationErrorMessage(error));
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const goBack = () => {
    setActiveStepIndex(0);
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
      description="사업장 정보를 입력하면 조교 소속 신청 코드가 바로 발급됩니다."
      activeStepIndex={0}
    >
      <div className="w-full" data-testid="workspace-onboarding-screen">
        <WorkspaceCreationProgress
          activeStepIndex={activeStepIndex}
          workspaceCode={workspaceCode}
        />

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,720px)_minmax(280px,1fr)] xl:items-start">
          <section
            className="rounded-[8px] border border-gray-200 bg-white p-5 sm:p-6"
            data-testid={`workspace-onboarding-step-${activeStep.id}`}
          >
            {activeStep.id === "workspace-info" ? (
              <WorkspaceInfoStep
                errors={workspaceErrors}
                form={workspaceForm}
                isSubmitting={isCreatingWorkspace}
                onChange={handleWorkspaceFieldChange}
                onContinue={handleWorkspaceContinue}
                showErrors={Boolean(submittedSteps["workspace-info"])}
              />
            ) : null}

            {activeStep.id === "code" ? (
              <WorkspaceCodeStep
                codeCopied={codeCopied}
                onBack={goBack}
                onCopy={copyWorkspaceCode}
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
  isSubmitting,
  onChange,
  onContinue,
  showErrors,
}: {
  errors: WorkspaceFormErrors;
  form: WorkspaceFormState;
  isSubmitting: boolean;
  onChange: (
    field: WorkspaceFormField,
  ) => (event: ChangeEvent<HTMLInputElement>) => void;
  onContinue: () => void | Promise<void>;
  showErrors: boolean;
}) {
  return (
    <div>
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

      <div className="mt-7 flex justify-end">
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={onContinue}
          className="h-[50px] rounded-[8px] px-7 text-h-18-semibold tracking-normal"
        >
          {isSubmitting ? "소속 생성 중" : "소속 코드 발급"}
          <ArrowRight className="size-5" strokeWidth={2.2} />
        </Button>
      </div>
    </div>
  );
}

function WorkspaceCodeStep({
  codeCopied,
  onBack,
  onCopy,
  workspaceCode,
  workspaceName,
}: {
  codeCopied: boolean;
  onBack: () => void;
  onCopy: () => void;
  workspaceCode: string;
  workspaceName: string;
}) {
  return (
    <div>
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

      <div className="mt-7 flex justify-start">
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
  workspaceCode,
}: {
  activeStepIndex: number;
  workspaceCode: string;
}) {
  return (
    <nav
      aria-label="소속 생성 세부 단계"
      className="rounded-[8px] border border-gray-200 bg-white px-3 py-3"
      data-testid="workspace-creation-progress"
    >
      <ol className="grid gap-2 md:grid-cols-2">
        {workspaceCreationSteps.map((step, index) => {
          const status = getWorkspaceStepStatus({
            activeStepIndex,
            index,
            stepId: step.id,
            workspaceCode,
          });
          const reached = status.tone !== "pending";

          return (
            <li
              key={step.id}
              aria-current={status.tone === "active" ? "step" : undefined}
              className={cn(
                "flex min-w-0 items-center gap-3 rounded-[6px] px-2 py-2",
                status.tone === "active"
                  ? "bg-green-50"
                  : reached
                    ? "bg-white"
                    : "bg-gray-50",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-label-12-medium tracking-normal",
                  reached ? "bg-green-400 text-white" : "bg-white text-gray-500",
                )}
              >
                {status.tone === "complete" ? (
                  <Check className="size-4" strokeWidth={2.4} />
                ) : (
                  index + 1
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-label-14-medium tracking-normal text-gray-900">
                {step.title}
              </span>
              <Badge
                variant={status.badgeVariant}
                size="M"
                className="text-label-12-medium"
              >
                {status.label}
              </Badge>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function WorkspaceCreationSummary({
  activeStepIndex,
  workspaceCode,
  workspaceForm,
}: {
  activeStepIndex: number;
  workspaceCode: string;
  workspaceForm: WorkspaceFormState;
}) {
  const status = activeStepIndex === 1 ? "발급 완료" : "진행 중";
  const activeStep = workspaceCreationSteps[activeStepIndex];
  const nextStep = workspaceCreationSteps[activeStepIndex + 1];
  const activeStepStatus = getWorkspaceStepStatus({
    activeStepIndex,
    index: activeStepIndex,
    stepId: activeStep.id,
    workspaceCode,
  });

  return (
    <aside
      className="h-fit rounded-[8px] border border-gray-200 bg-white p-5"
      data-testid="workspace-creation-summary"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-h-16-semibold tracking-normal text-gray-900">
          소속 요약
        </div>
        <Badge variant={activeStepIndex === 1 ? "green" : "grey"} size="M">
          {status}
        </Badge>
      </div>

      <div className="mt-5 rounded-[8px] border border-gray-200 bg-gray-50 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-label-12-medium tracking-normal text-gray-500">
              현재 단계
            </div>
            <p className="mt-1 text-body-14-medium tracking-normal text-gray-900">
              {activeStep.title}
            </p>
          </div>
          <Badge
            variant={activeStepStatus.badgeVariant}
            size="M"
            className="text-label-12-medium"
          >
            {activeStepStatus.label}
          </Badge>
        </div>
        <p className="mt-2 text-label-12-regular tracking-normal text-gray-500">
          {activeStep.description}
        </p>
      </div>

      <dl className="mt-5 space-y-3 text-body-14-regular tracking-normal">
        <SummaryInfoPair
          label="소속 이름"
          value={workspaceForm.workspaceName.trim() || "-"}
        />
        {workspaceCode ? (
          <SummaryInfoPair label="신청 코드" value={workspaceCode} highlight />
        ) : null}
      </dl>

      {nextStep ? (
        <div className="mt-5 rounded-[8px] border border-blue-50 bg-blue-50 px-4 py-3">
          <div className="text-label-12-medium tracking-normal text-gray-500">
            다음 단계
          </div>
          <p className="mt-1 text-body-14-medium tracking-normal text-gray-900">
            {nextStep.title}
          </p>
          <p className="mt-1 text-label-12-regular tracking-normal text-gray-500">
            {nextStep.description}
          </p>
        </div>
      ) : null}
    </aside>
  );
}

function SummaryInfoPair({
  highlight = false,
  label,
  value,
}: {
  highlight?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd
        className={cn(
          "font-medium",
          highlight ? "text-green-500" : "text-gray-800",
        )}
      >
        {value}
      </dd>
    </div>
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

function getSetupProgressSteps(
  progress: WorkspaceSetupProgress,
): SetupProgressStep[] {
  const locationComplete = progress.locationCount > 0;
  const dutyComplete = progress.dutyCount > 0;

  return [
    {
      caption: locationComplete
        ? `${progress.locationCount}개 등록됨`
        : "등록 대기",
      state: locationComplete ? "complete" : "active",
      title: "근무지 등록",
    },
    {
      caption: dutyComplete ? `${progress.dutyCount}개 개설됨` : "개설 대기",
      state: dutyComplete
        ? "complete"
        : locationComplete
          ? "active"
          : "pending",
      title: "첫 근무 개설",
    },
    {
      caption: progress.setupComplete ? "진입 가능" : "설정 완료 후 가능",
      state: progress.setupComplete
        ? "complete"
        : dutyComplete
          ? "active"
          : "pending",
      title: "대시보드 진입",
    },
  ];
}

function getSetupStepContainerClassName(state: SetupProgressStepState) {
  if (state === "complete") {
    return "border-green-200 bg-green-50";
  }

  if (state === "active") {
    return "border-blue-100 bg-blue-50";
  }

  return "border-gray-200 bg-gray-50";
}

function getSetupStepIconClassName(state: SetupProgressStepState) {
  if (state === "complete") {
    return "bg-green-400 text-white";
  }

  if (state === "active") {
    return "bg-blue-500 text-white";
  }

  return "bg-white text-gray-500";
}

function getSetupGuideMessage(
  progress: WorkspaceSetupProgress,
  setupLoadError: string | null,
) {
  if (setupLoadError) {
    return setupLoadError;
  }

  if (progress.setupComplete) {
    return "초기 설정이 완료되었습니다. Wee 대시보드에서 운영 현황을 볼 수 있습니다.";
  }

  if (progress.locationCount > 0) {
    return "근무지가 등록되었습니다. 첫 근무를 개설하면 대시보드가 열립니다.";
  }

  return "근무지를 먼저 등록한 뒤 첫 근무를 개설하면 Wee 대시보드를 사용할 수 있습니다.";
}

export function SetupGuideScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState<WorkspaceSetupProgress | null>(null);
  const [setupLoadError, setSetupLoadError] = useState<string | null>(null);

  useEffect(() => {
    const redirectPath = getSetupGuideRedirectPath(
      readWorkspaceOnboardingStatus(),
    );

    if (redirectPath) {
      router.replace(redirectPath);
      return;
    }

    let cancelled = false;

    createWorkspaceSetupDataSource()
      .loadProgress()
      .then((nextProgress) => {
        if (cancelled) {
          return;
        }

        const nextRedirectPath = getSetupGuideRedirectPath(nextProgress.status);

        if (nextRedirectPath) {
          router.replace(nextRedirectPath);
          return;
        }

        setProgress(nextProgress);
        setSetupLoadError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setSetupLoadError(
            "초기 설정 진행 상태를 불러오지 못했습니다. 각 관리 화면에서 계속 진행할 수 있습니다.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const setupProgress = progress ?? emptySetupProgress;
  const setupSteps = getSetupProgressSteps(setupProgress);
  const locationComplete = setupProgress.locationCount > 0;
  const dutyComplete = setupProgress.dutyCount > 0;
  const guideMessage = getSetupGuideMessage(setupProgress, setupLoadError);

  return (
    <EntryShell
      title={
        setupProgress.setupComplete
          ? "관리자 설정이 완료되었습니다"
          : "관리자 설정으로 이어가기"
      }
      description="근무지와 첫 근무를 등록해야 대시보드로 이동합니다."
      activeStepIndex={1}
    >
      <div className="w-full" data-testid="setup-guide-screen">
        <section className="rounded-[8px] border border-gray-200 bg-white p-5 sm:p-6">
          <SectionHeading
            icon={ShieldCheck}
            title="초기 운영 설정"
            description="운영을 시작하기 전에 근무지와 첫 근무를 차례대로 등록합니다."
          />

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {setupSteps.map((step, index) => (
              <div
                key={step.title}
                className={cn(
                  "flex items-center gap-3 rounded-[8px] border px-4 py-3",
                  getSetupStepContainerClassName(step.state),
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-label-12-medium tracking-normal",
                    getSetupStepIconClassName(step.state),
                  )}
                >
                  {step.state === "complete" ? (
                    <Check className="size-4" strokeWidth={2.4} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-label-14-medium tracking-normal text-gray-900">
                    {step.title}
                  </span>
                  <span className="mt-0.5 block text-label-12-regular tracking-normal text-gray-500">
                    {step.caption}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <AdminSetupActionCard
              badgeLabel={
                locationComplete
                  ? `${setupProgress.locationCount}개 등록`
                  : "먼저 진행"
              }
              highlighted={!locationComplete}
              icon={MapPin}
              title="근무지 관리"
              description="주소와 출퇴근 허용 반경을 등록합니다. 허용 반경은 숫자로 입력하고 m 단위가 붙습니다."
              href="/settings/locations"
              actionLabel="근무지 관리 열기"
            />
            <AdminSetupActionCard
              badgeLabel={
                dutyComplete
                  ? `${setupProgress.dutyCount}개 개설`
                  : locationComplete
                    ? "다음 진행"
                    : "다음 단계"
              }
              highlighted={locationComplete && !dutyComplete}
              icon={Clock3}
              title="근무 목록"
              description="요일, 시간, 시급 기준으로 조교가 배정될 첫 근무를 개설합니다."
              href="/schedule/duties"
              actionLabel="근무 개설 열기"
            />
          </div>

          <div
            className={cn(
              "mt-5 rounded-[8px] border px-4 py-3 text-body-14-regular tracking-normal text-gray-600",
              setupLoadError
                ? "border-red-100 bg-red-50"
                : setupProgress.setupComplete
                  ? "border-green-100 bg-green-50"
                  : "border-blue-50 bg-blue-50",
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>{guideMessage}</p>
              {setupProgress.setupComplete ? (
                <Button
                  asChild
                  variant="primary"
                  className="h-10 shrink-0 rounded-[8px] px-4 text-label-14-medium tracking-normal"
                >
                  <Link href="/dashboard">
                    대시보드로 이동
                    <ArrowRight className="size-4" strokeWidth={2.2} />
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </EntryShell>
  );
}
