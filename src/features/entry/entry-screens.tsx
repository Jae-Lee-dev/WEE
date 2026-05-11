import Link from "next/link";
import Image from "next/image";
import type { ComponentProps, ComponentType, ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  CircleCheck,
  Clock3,
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
  return (
    <EntryShell
      title="소속 생성"
      description="조교가 소속 신청에 사용할 운영 소속과 코드를 준비합니다."
      activeStepIndex={0}
    >
      <div className="w-full" data-testid="workspace-onboarding-screen">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="rounded-[8px] border border-gray-200 bg-white p-5">
            <SectionHeading
              icon={Building2}
              title="소속 정보"
              description="관리자와 조교에게 공통으로 표시되는 기본 정보입니다."
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <EntryField
                label="소속 이름"
                placeholder="Wee 강남캠퍼스"
                defaultValue="Wee 강남캠퍼스"
              />
              <EntryField
                label="사업자등록번호"
                placeholder="000-00-00000"
              />
              <EntryField label="대표자명" placeholder="김민채" />
              <EntryField
                label="대표 연락처"
                type="tel"
                placeholder="02-0000-0000"
              />
            </div>
          </section>

          <aside className="rounded-[8px] border border-green-200 bg-green-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-h-16-semibold tracking-normal text-gray-900">
                소속 코드
              </div>
              <Badge variant="green" size="M">
                예정
              </Badge>
            </div>
            <div className="mt-5 rounded-[8px] bg-white px-4 py-5 text-center">
              <div className="text-[28px] font-semibold leading-none tracking-normal text-green-400">
                WEE-GN01
              </div>
              <div className="mt-2 text-label-12-medium tracking-normal text-gray-500">
                조교 소속 신청 코드
              </div>
            </div>
            <dl className="mt-5 space-y-3 text-body-14-regular tracking-normal">
              <InfoPair label="상태" value="생성 전" />
              <InfoPair label="사용 범위" value="소속 신청" />
              <InfoPair label="관리자" value="김민채" />
            </dl>
          </aside>
        </div>

        <section className="mt-5 rounded-[8px] border border-gray-200 bg-white p-5">
          <SectionHeading
            icon={CreditCard}
            title="요금제 선택"
            description="초기 운영 규모에 맞는 플랜을 선택합니다."
          />
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <PlanOption
              selected
              title="Starter"
              price="월 0원"
              details={["근무지 기본 관리", "조교 소속 승인", "근무 기록 확인"]}
            />
            <PlanOption
              title="Standard"
              price="월 49,000원"
              details={["인수인계 AI", "급여 명세 관리", "운영 알림 확장"]}
            />
          </div>
        </section>

        <div className="mt-6 flex justify-end">
          <Button
            asChild
            className="h-[50px] rounded-[8px] px-7 text-h-18-semibold tracking-normal"
          >
            <Link href="/onboarding/setup">
              관리자 설정으로 이동
              <ArrowRight className="size-5" strokeWidth={2.2} />
            </Link>
          </Button>
        </div>
      </div>
    </EntryShell>
  );
}

export function SetupGuideScreen() {
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
  title,
  price,
  details,
  selected = false,
}: {
  title: string;
  price: string;
  details: readonly string[];
  selected?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[8px] border px-4 py-4",
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
    </div>
  );
}
