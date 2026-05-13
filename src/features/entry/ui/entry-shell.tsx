"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from "react";
import { ArrowRight, Check, CircleCheck } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";

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
  badgeLabel: string;
  highlighted?: boolean;
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

export function AuthShell({
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

export function EntryShell({
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

export function AdminSetupActionCard({
  badgeLabel,
  highlighted = false,
  icon: Icon,
  title,
  description,
  href,
  actionLabel,
}: AdminSetupActionCardProps) {
  return (
    <article
      className={cn(
        "rounded-[8px] border p-5",
        highlighted
          ? "border-green-200 bg-green-50"
          : "border-gray-200 bg-gray-50",
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <Badge
          variant={highlighted ? "green" : "grey"}
          size="M"
          className="text-label-12-medium"
        >
          {badgeLabel}
        </Badge>
        {highlighted ? (
          <span className="text-label-12-medium tracking-normal text-green-500">
            필수
          </span>
        ) : null}
      </div>
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
        variant={highlighted ? "primary" : "secondary"}
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

export function EntryField({
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

export function SectionHeading({
  icon: Icon,
  title,
  description,
}: SectionHeadingProps) {
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

export function PlanOption({
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

function OnboardingProgress({ activeIndex }: { activeIndex: number }) {
  return (
    <nav
      aria-label="온보딩 진행 단계"
      className="mt-6"
      data-testid="onboarding-progress"
    >
      <ol className="grid gap-2 sm:grid-cols-2">
        {onboardingProgressSteps.map((step, index) => {
          const active = index === activeIndex;
          const reached = index <= activeIndex;

          return (
            <li
              key={step.title}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-[8px] border bg-white px-4 py-3",
                active
                  ? "border-green-200 bg-green-50"
                  : reached
                    ? "border-green-200"
                    : "border-gray-200",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-label-12-medium tracking-normal",
                  reached ? "bg-green-400 text-white" : "bg-gray-100 text-gray-500",
                )}
              >
                {activeIndex > index ? (
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
                  {step.description}
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
