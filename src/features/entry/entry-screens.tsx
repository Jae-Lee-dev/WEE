import Link from "next/link";
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
import { entryRoutes } from "@/app/_config/admin-navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type EntryScreenId = "AUTH-01" | "AUTH-02" | "AUTH-03" | "ONB-01" | "ONB-02";

type SupportItem = {
  label: string;
  value: string;
  detail: string;
  tone?: "green" | "orange" | "blue" | "grey";
};

type EntryShellProps = {
  screenId: EntryScreenId;
  title: string;
  description: string;
  supportTitle: string;
  supportItems: readonly SupportItem[];
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

const workspaceSupportItems = [
  {
    label: "사업장 정보",
    value: "1단계",
    detail: "기본 정보와 대표 연락처",
    tone: "green",
  },
  {
    label: "조교 소속 코드",
    value: "발급",
    detail: "가입 신청에 사용할 코드",
    tone: "orange",
  },
  {
    label: "초기 설정",
    value: "필수",
    detail: "근무지와 첫 근무 등록",
    tone: "blue",
  },
] as const satisfies readonly SupportItem[];

const socialProviders = [
  { label: "Google로 계속", mark: "G" },
  { label: "Apple로 계속", mark: "A" },
  { label: "카카오로 계속", mark: "K" },
] as const;

const workspaceSteps = ["사업장 정보", "요금제 선택", "결제 정보", "코드 발급"];
const setupSteps = ["근무지 등록", "근무 개설", "운영 시작"];

export function LoginScreen() {
  return (
    <AuthShell
      screenId="AUTH-01"
      title="로그인"
      description="관리자 계정으로 Wee 운영 화면에 접속합니다."
    >
      <div className="w-full max-w-[520px]" data-testid="login-screen">
        <SocialProviderButtons />
        <FormDivider label="또는 이메일로 로그인" />

        <div className="space-y-4">
          <EntryField
            label="이메일"
            type="email"
            placeholder="admin@wee.kr"
          />
          <EntryField
            label="비밀번호"
            type="password"
            placeholder="비밀번호"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <CheckboxLine label="로그인 유지" />
          <Link
            href="/forgot-password"
            className="text-label-14-medium tracking-normal text-green-400 transition-colors hover:text-green-500"
          >
            아이디/비밀번호 찾기
          </Link>
        </div>

        <Button
          asChild
          className="mt-7 h-[50px] w-full rounded-[8px] text-h-18-semibold tracking-normal"
        >
          <Link href="/dashboard">로그인</Link>
        </Button>

        <p className="mt-5 text-center text-body-14-regular tracking-normal text-gray-500">
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
      description="이메일 인증 후 사업장 생성으로 이동합니다."
      cardClassName="max-w-[680px]"
    >
      <div className="w-full" data-testid="signup-screen">
        <div className="grid gap-4 sm:grid-cols-2">
          <EntryField label="이름" placeholder="김민채" />
          <EntryField
            label="이메일"
            type="email"
            placeholder="admin@wee.kr"
          />
          <EntryField
            label="비밀번호"
            type="password"
            placeholder="8자 이상"
          />
          <EntryField
            label="비밀번호 확인"
            type="password"
            placeholder="비밀번호 재입력"
          />
        </div>

        <div className="mt-5 rounded-[8px] border border-green-100 bg-green-50 px-4 py-3">
          <div className="text-label-14-medium tracking-normal text-gray-800">
            비밀번호 조건
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {["최소 8자", "영문·숫자 조합", "특수문자 선택"].map((item) => (
              <span
                key={item}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-label-12-medium tracking-normal text-gray-600"
              >
                <Check className="size-3.5 text-green-400" strokeWidth={2.4} />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <CheckboxLine label="서비스 이용약관과 개인정보 처리방침에 동의합니다." />
          <CheckboxLine label="운영 알림 수신에 동의합니다." />
        </div>

        <Button
          asChild
          className="mt-7 h-[50px] w-full rounded-[8px] text-h-18-semibold tracking-normal"
        >
          <Link href="/onboarding/workspace">인증 메일 보내기</Link>
        </Button>

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
              휴대폰 번호가 변경된 경우 사업장 소유자 인증 후 계정을 확인할 수
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
      screenId="ONB-01"
      title="사업장 생성"
      description="조교가 소속 신청에 사용할 사업장과 운영 코드를 준비합니다."
      supportTitle="온보딩"
      supportItems={workspaceSupportItems}
    >
      <div className="w-full" data-testid="workspace-onboarding-screen">
        <EntryStepper steps={workspaceSteps} activeIndex={0} />

        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="rounded-[8px] border border-gray-200 bg-white p-5">
            <SectionHeading
              icon={Building2}
              title="사업장 정보"
              description="관리자와 조교에게 공통으로 표시되는 기본 정보입니다."
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <EntryField
                label="사업장 이름"
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
                사업장 코드
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
              초기 설정으로 이동
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
      screenId="ONB-02"
      title="초기 설정 가이드"
      description="운영 시작 전에 근무지와 첫 근무를 등록합니다."
      supportTitle="시작 조건"
      supportItems={workspaceSupportItems}
    >
      <div className="w-full" data-testid="setup-guide-screen">
        <EntryStepper steps={setupSteps} activeIndex={0} />

        <div className="mt-6 grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="rounded-[8px] border border-gray-200 bg-gray-50 p-5">
            <div className="text-h-16-semibold tracking-normal text-gray-900">
              필수 항목
            </div>
            <div className="mt-5 space-y-3">
              <SetupChecklistItem
                active
                icon={MapPin}
                title="근무지 1개 이상"
                detail="본관 · 100m 반경"
              />
              <SetupChecklistItem
                icon={Clock3}
                title="근무 1개 이상"
                detail="요일 · 시간 · 시급"
              />
              <SetupChecklistItem
                icon={ShieldCheck}
                title="운영 시작"
                detail="대시보드 진입"
              />
            </div>
          </aside>

          <div className="grid gap-5">
            <section className="rounded-[8px] border border-gray-200 bg-white p-5">
              <SectionHeading
                icon={MapPin}
                title="근무지 등록"
                description="출퇴근 반경 확인에 사용할 기준 위치입니다."
              />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <EntryField
                  label="근무지명"
                  placeholder="본관"
                  defaultValue="본관"
                />
                <EntryField
                  label="출퇴근 반경"
                  inputMode="numeric"
                  placeholder="100m"
                  defaultValue="100m"
                />
                <EntryField
                  label="주소"
                  placeholder="서울 강남구 테헤란로 00"
                  className="sm:col-span-2"
                />
              </div>
            </section>

            <section className="rounded-[8px] border border-gray-200 bg-white p-5">
              <SectionHeading
                icon={Clock3}
                title="첫 근무 개설"
                description="조교가 시간표를 구성할 때 선택하는 근무 단위입니다."
              />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <EntryField
                  label="근무명"
                  placeholder="중등 영어 보조"
                  defaultValue="중등 영어 보조"
                />
                <EntryField
                  label="기본 시급"
                  inputMode="numeric"
                  placeholder="12,000원"
                  defaultValue="12,000원"
                />
                <EntryField label="요일" placeholder="월 · 수" />
                <EntryField label="시간" placeholder="18:00 - 21:00" />
              </div>
            </section>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            asChild
            className="h-[50px] rounded-[8px] px-7 text-h-18-semibold tracking-normal"
          >
            <Link href="/dashboard">
              대시보드로 이동
              <ArrowRight className="size-5" strokeWidth={2.2} />
            </Link>
          </Button>
        </div>
      </div>
    </EntryShell>
  );
}

function AuthShell({
  screenId,
  title,
  description,
  children,
  cardClassName,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-gray-50 px-5 py-6 tracking-normal text-gray-900 md:px-8 lg:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1040px] flex-col">
        <header className="flex items-center justify-between gap-4">
          <BrandBlock />
          <EntryNav compact currentHref={routeHrefByScreenId[screenId]} />
        </header>

        <section className="flex flex-1 items-center justify-center py-10">
          <div
            className={cn(
              "w-full max-w-[560px] rounded-[10px] border border-gray-200 bg-white px-6 py-7 shadow-[0_18px_48px_rgba(17,24,39,0.08)] sm:px-8 lg:px-10 lg:py-9",
              cardClassName,
            )}
          >
            <header>
              <h1 className="text-h-32 tracking-normal text-gray-900">
                {title}
              </h1>
              <p className="mt-2 text-body-16-regular tracking-normal text-gray-500">
                {description}
              </p>
            </header>

            <div className="mt-8">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}

function EntryShell({
  screenId,
  title,
  description,
  supportTitle,
  supportItems,
  children,
}: EntryShellProps) {
  return (
    <main className="min-h-screen bg-gray-50 px-5 py-6 tracking-normal text-gray-900 md:px-8 lg:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-64px)] w-full max-w-[1240px] gap-5 lg:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="flex min-h-[360px] flex-col rounded-[10px] border border-gray-200 bg-white px-6 py-6 lg:px-7 lg:py-7">
          <BrandBlock />

          <div className="mt-9">
            <Badge variant="green" size="M">
              {screenId}
            </Badge>
            <h2 className="mt-4 text-h-24 tracking-normal text-gray-900">
              Wee 관리자
            </h2>
            <p className="mt-2 text-body-14-regular tracking-normal text-gray-500">
              학원 운영자용 근태·급여 관리 워크스페이스
            </p>
          </div>

          <SupportList title={supportTitle} items={supportItems} />
          <EntryNav currentHref={routeHrefByScreenId[screenId]} />
        </aside>

        <section className="flex min-h-[620px] flex-col rounded-[10px] border border-gray-200 bg-white px-6 py-7 sm:px-8 lg:px-10 lg:py-9">
          <header className="max-w-[720px]">
            <Badge variant="grey" size="M">
              {screenId}
            </Badge>
            <h1 className="mt-4 text-h-32 tracking-normal text-gray-900">
              {title}
            </h1>
            <p className="mt-2 text-body-16-regular tracking-normal text-gray-500">
              {description}
            </p>
          </header>

          <div className="mt-8 flex flex-1 items-start">{children}</div>
        </section>
      </div>
    </main>
  );
}

function BrandBlock() {
  return (
    <Link
      href="/login"
      className="flex w-fit items-center gap-3 rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
    >
      <span className="flex size-12 items-center justify-center rounded-[10px] bg-green-400 text-h-24 tracking-normal text-white">
        W
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

function SupportList({
  title,
  items,
}: {
  title: string;
  items: readonly SupportItem[];
}) {
  return (
    <div className="mt-9">
      <div className="mb-3 text-label-14-medium tracking-normal text-gray-500">
        {title}
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex min-h-[64px] items-center justify-between gap-4 rounded-[8px] border border-gray-100 bg-gray-50 px-4"
          >
            <div className="min-w-0">
              <div className="truncate text-label-14-medium tracking-normal text-gray-700">
                {item.label}
              </div>
              <div className="mt-1 truncate text-label-12-regular tracking-normal text-gray-500">
                {item.detail}
              </div>
            </div>
            <Badge variant={item.tone ?? "grey"} size="M" className="shrink-0">
              {item.value}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

const routeHrefByScreenId: Record<EntryScreenId, string> = {
  "AUTH-01": "/login",
  "AUTH-02": "/signup",
  "AUTH-03": "/forgot-password",
  "ONB-01": "/onboarding/workspace",
  "ONB-02": "/onboarding/setup",
};

function EntryNav({
  currentHref,
  compact = false,
}: {
  currentHref: string;
  compact?: boolean;
}) {
  return (
    <nav
      className={cn(
        "flex flex-wrap gap-x-4 gap-y-2",
        compact ? "justify-end" : "mt-auto pt-8",
      )}
      aria-label="진입 메뉴"
    >
      {entryRoutes.map((route) => {
        const active = route.href === currentHref;

        return (
          <Link
            key={route.href}
            href={route.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "text-label-12-medium tracking-normal transition-colors duration-150 ease-out",
              active
                ? "text-green-400"
                : "text-gray-500 hover:text-green-400 active:text-green-500",
            )}
          >
            {route.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SocialProviderButtons() {
  return (
    <div className="grid gap-3 sm:grid-cols-3" aria-label="소셜 로그인">
      {socialProviders.map((provider) => (
        <button
          key={provider.label}
          type="button"
          className="flex h-12 items-center justify-center gap-2 rounded-[8px] border border-gray-200 bg-white px-3 text-label-14-medium tracking-normal text-gray-800 transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-gray-100 text-label-12-medium tracking-normal text-gray-700">
            {provider.mark}
          </span>
          <span className="min-w-0 truncate">{provider.label}</span>
        </button>
      ))}
    </div>
  );
}

function FormDivider({ label }: { label: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-label-12-medium tracking-normal text-gray-400">
      <span className="h-px flex-1 bg-gray-100" />
      <span>{label}</span>
      <span className="h-px flex-1 bg-gray-100" />
    </div>
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

function CheckboxLine({ label }: { label: string }) {
  return (
    <label className="flex min-h-6 items-start gap-2 text-body-14-regular tracking-normal text-gray-600">
      <input
        type="checkbox"
        className="mt-0.5 size-4 rounded-[4px] border border-gray-300 accent-green-400"
      />
      <span>{label}</span>
    </label>
  );
}

function EntryStepper({
  steps,
  activeIndex,
}: {
  steps: readonly string[];
  activeIndex: number;
}) {
  return (
    <ol
      className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="온보딩 단계"
    >
      {steps.map((step, index) => {
        const active = index === activeIndex;
        const complete = index < activeIndex;

        return (
          <li
            key={step}
            className={cn(
              "flex min-h-[58px] items-center gap-3 rounded-[8px] border px-4",
              active || complete
                ? "border-green-200 bg-green-50"
                : "border-gray-200 bg-white",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-label-12-medium tracking-normal",
                active || complete
                  ? "bg-green-400 text-white"
                  : "bg-gray-100 text-gray-500",
              )}
            >
              {complete ? (
                <Check className="size-4" strokeWidth={2.4} />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn(
                "min-w-0 truncate text-label-14-medium tracking-normal",
                active ? "text-gray-900" : "text-gray-600",
              )}
            >
              {step}
            </span>
          </li>
        );
      })}
    </ol>
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

function SetupChecklistItem({
  icon: Icon,
  title,
  detail,
  active = false,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  detail: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[68px] items-center gap-3 rounded-[8px] border px-3",
        active ? "border-green-200 bg-white" : "border-gray-100 bg-white/60",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-[8px]",
          active ? "bg-green-100 text-green-400" : "bg-gray-100 text-gray-500",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-label-14-medium tracking-normal text-gray-900">
          {title}
        </span>
        <span className="mt-1 block truncate text-label-12-regular tracking-normal text-gray-500">
          {detail}
        </span>
      </span>
    </div>
  );
}
