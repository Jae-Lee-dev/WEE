import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const problemCards = [
  {
    title: "잦은 변수로 관리가 어렵습니다",
    description:
      "대타, 추가 근무, 지각, 수정 요청처럼 예외 상황이 반복되면 매번 수기로 확인해야 합니다.",
    image: "/landing/problem-variables.png",
  },
  {
    title: "정산보다 검토가 더 오래 걸립니다",
    description:
      "근무시간, 승인 여부, 수정 이력을 엑셀과 메신저로 대조하다 보면 정산 일정이 쉽게 밀립니다.",
    image: "/landing/payroll-screen.png",
  },
  {
    title: "인수인계가 사람마다 달라집니다",
    description:
      "업무 노하우가 대화방에 흩어져 담당자가 바뀔 때마다 같은 설명이 반복됩니다.",
    image: "/landing/handover-screen.png",
  },
] as const;

const featureRows = [
  {
    label: "근태 기록",
    title: "출퇴근과 예외 근무를 한 흐름에서 확인",
    description:
      "조교의 출퇴근, 지각, 추가근무, 이의신청을 운영 인박스에서 바로 검토합니다.",
    icon: ClipboardCheck,
  },
  {
    label: "급여 정산",
    title: "검토할 항목만 남기는 급여 산정",
    description:
      "승인된 기록을 기준으로 급여 신청과 재확정 항목을 분리해 정산 부담을 줄입니다.",
    icon: CircleDollarSign,
  },
  {
    label: "AI 인수인계",
    title: "운영 노하우를 문서로 남기는 인수인계",
    description:
      "반복 안내, 주의사항, 담당자 변경 이슈를 AI 편집 흐름으로 정리합니다.",
    icon: Bot,
  },
  {
    label: "운영 기준",
    title: "소속 신청부터 시간표 승인까지 연결",
    description:
      "사업장 코드를 발급하고 조교 소속 신청, 시간표 승인, 근무 개설을 같은 기준으로 관리합니다.",
    icon: ShieldCheck,
  },
] as const;

const flowSteps = [
  ["코드 발급", "사업장 정보 입력 후 조교 연결 코드를 발급합니다."],
  ["조교 연결", "조교가 코드를 입력하면 소속 신청이 관리자에게 모입니다."],
  ["시간표 승인", "제출된 시간표를 승인하면 운영 준비가 완료됩니다."],
  ["자동 기록", "출퇴근과 예외 기록이 운영 인박스로 정리됩니다."],
] as const;

const pricingPlans = [
  {
    name: "Starter",
    price: "무료",
    description: "소규모 조교 운영을 시작하는 팀",
    featured: false,
    cta: "시작하기",
    items: ["3명 포함", "근태 및 급여 관리", "이상 건수 자동 표시", "대시보드"],
  },
  {
    name: "Standard",
    price: "월 9,900원",
    description: "정산과 인수인계를 함께 관리하는 팀",
    featured: true,
    cta: "시작하기",
    items: [
      "10명 포함",
      "근태 및 급여 관리",
      "AI 인수인계",
      "AI 이상 패턴 분석",
    ],
  },
  {
    name: "Enterprise",
    price: "문의",
    description: "대규모 운영과 맞춤형 구축이 필요한 팀",
    featured: false,
    cta: "별도 문의하기",
    items: [
      "전담 CSM",
      "도입 지원",
      "AI 인수인계",
      "AI 이상 패턴 분석",
    ],
  },
] as const;

const faqs = [
  [
    "학원이 아니라 강사 개인도 쓸 수 있나요?",
    "네. Wee는 학원 단위뿐 아니라 여러 사업장에 출강하는 강사 중심 운영 구조에도 맞게 설계되었습니다.",
  ],
  ["조교는 뭘 해야 하나요?", "앱에서 소속 코드를 입력하고 시간표와 출퇴근 기록을 제출합니다."],
  [
    "기존 서비스와 뭐가 다른가요?",
    "단순 출퇴근 기록이 아니라 승인, 예외 처리, 급여 정산, 인수인계를 조교 운영 흐름으로 묶습니다.",
  ],
  ["무료로도 충분한가요?", "Starter 플랜으로 소규모 운영의 기본 흐름을 먼저 검증할 수 있습니다."],
  ["조교마다 급여가 달라도 되나요?", "시급, 월급, 보너스와 차감 항목을 조교별로 다르게 관리할 수 있습니다."],
] as const;

export function LandingPage() {
  return (
    <main className="min-h-screen bg-white tracking-normal text-gray-900" data-testid="landing-page">
      <LandingHeader />
      <HeroSection />
      <ProblemSection />
      <FeatureSection />
      <FlowSection />
      <PricingSection />
      <FaqSection />
      <LandingFooter />
    </main>
  );
}

export function LandingHeader({ minimal = false }: { minimal?: boolean }) {
  return (
    <header className="sticky top-0 z-40 bg-white shadow-[0_4px_10px_rgba(0,0,0,0.04)]">
      <div className="mx-auto flex h-[102px] w-full max-w-[1400px] items-start justify-between px-5 pt-10 md:px-8 2xl:px-0">
        <Link href="/" className="flex h-[34px] w-[184px] items-start rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200">
          <Image
            src="/admin-shell/logo.png"
            alt="Wee"
            width={80}
            height={52}
            className="h-[34px] w-auto"
            priority
          />
          <span className="sr-only">Wee</span>
        </Link>

        {minimal ? null : (
          <nav className="hidden items-start gap-20 pb-8 text-[20px] font-medium leading-[1.4] tracking-normal text-gray-600 lg:flex" aria-label="랜딩 메뉴">
            <a href="#features" className="hover:text-green-400">기능</a>
            <a href="#pricing" className="hover:text-green-400">요금제</a>
            <a href="#faq" className="hover:text-green-400">FAQ</a>
          </nav>
        )}

        <div className="flex items-center gap-3 pb-5">
          <Link
            href="/login"
            className="hidden h-[41px] items-center rounded-full bg-green-400 px-4 text-[18px] font-normal leading-[1.4] tracking-normal text-white transition-colors hover:bg-green-450 sm:flex"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className="flex h-[41px] items-center rounded-full border border-green-400 bg-white px-4 text-[18px] font-normal leading-[1.4] tracking-normal text-green-400 transition-colors hover:bg-green-50"
          >
            회원가입
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative h-auto min-h-[720px] overflow-hidden bg-gray-50 lg:h-[929px]">
      <div className="absolute left-[calc(50%-223px)] top-0 hidden h-[876px] w-[1314px] lg:block">
        <Image
          src="/landing/hero-dashboard.png"
          alt="Wee 관리자 대시보드"
          width={1314}
          height={876}
          className="absolute inset-0 size-full max-w-none object-cover"
          priority
        />
        <div className="absolute inset-y-0 left-0 w-[570px] bg-gradient-to-r from-gray-50 to-gray-50/0" />
        <div className="absolute inset-x-0 bottom-0 h-[390px] bg-gradient-to-t from-gray-50 to-gray-50/0" />
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-[1400px] flex-col items-start justify-center gap-8 px-5 py-20 md:px-8 lg:gap-[60px] 2xl:px-0">
        <div className="max-w-[720px]">
          <h1 className="text-[42px] font-bold leading-[1.25] tracking-normal text-gray-800 sm:text-[56px] lg:text-[60px] lg:leading-[1.4]">
            <span className="landing-gradient-text">조교 관리</span>는 더 가볍게,
            <br />
            <span className="landing-gradient-text">운영 통제</span>는 더 정확하게.
          </h1>
        </div>
        <p className="max-w-[694px] text-body-16-regular leading-[1.8] tracking-normal text-gray-600 sm:text-[22px] lg:text-[24px] lg:leading-[1.6]">
          수기 대조, 늦어지는 정산, 반복되는 예외 근무, 휘발되는 인수인계까지.
          <br />
          <strong className="font-semibold">Wee</strong>는 조교 근태 기록, 승인, 급여 정산, AI 인수인계 문서화를
          <br />
          하나로 통합한 <strong className="font-semibold">조교 운영 SaaS</strong>입니다.
        </p>
        <div className="flex flex-wrap gap-5">
          <Link
            href="/signup"
            className="flex h-[66px] w-[188px] items-center justify-center whitespace-nowrap rounded-[10px] bg-gradient-to-r from-[#18cd73] to-[#1ccc36] px-5 text-[24px] font-semibold leading-[1.4] tracking-normal text-white transition-[filter] hover:brightness-95"
          >
            무료로 시작하기
          </Link>
          <Link
            href="/signup"
            className="landing-gradient-text flex h-[66px] w-[188px] items-center justify-center whitespace-nowrap rounded-[10px] border border-[#18cd73] bg-white px-5 text-[24px] font-semibold leading-[1.4] tracking-normal transition-colors hover:bg-green-50"
          >
            데모 요청하기
          </Link>
        </div>
        <div className="overflow-hidden rounded-[18px] border border-gray-200 bg-white shadow-[0_24px_70px_rgba(17,24,39,0.12)] lg:hidden">
          <Image
            src="/landing/hero-dashboard.png"
            alt="Wee 관리자 대시보드"
            width={1314}
            height={876}
            className="w-full"
            priority
          />
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="bg-gradient-to-b from-[#f0fff0] via-green-50 to-green-100 px-5 py-24 md:px-8">
      <div className="mx-auto max-w-[1400px]">
        <SectionIntro
          eyebrow="운영 문제"
          title={
            <>
              <span className="landing-gradient-text">조교 관리</span>, 이런 문제들로 계속 번거로우셨나요?
            </>
          }
          description="운영이 힘든 이유는 업무가 많아서가 아니라 부정확한 기준, 반복되는 예외상황, 사람 손에 달린 검토 때문입니다."
        />

        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {problemCards.map((card) => (
            <article key={card.title} className="overflow-hidden rounded-[10px] border-2 border-green-200 bg-white/75 shadow-[0_16px_40px_rgba(48,193,121,0.12)] backdrop-blur">
              <Image
                src={card.image}
                alt=""
                width={1024}
                height={720}
                className="h-[250px] w-full object-cover"
              />
              <div className="p-7">
                <h3 className="text-h-20 tracking-normal text-green-400">{card.title}</h3>
                <p className="mt-4 text-body-16-regular leading-[1.65] tracking-normal text-gray-700">{card.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-[10px] border-2 border-green-200 bg-white/80 px-6 py-8 text-center shadow-[0_0_40px_rgba(48,193,121,0.16)]">
          <p className="landing-gradient-text text-h-24 tracking-normal">
            Wee는 기록, 승인, 정산, 인수인계를 한 번에 정리합니다.
          </p>
        </div>
      </div>
    </section>
  );
}

function FeatureSection() {
  return (
    <section id="features" className="bg-white px-5 py-24 md:px-8">
      <div className="mx-auto max-w-[1400px]">
        <SectionIntro
          eyebrow="핵심 기능"
          title={
            <>
              <span className="landing-gradient-text">4가지 핵심 기능</span>으로 조교 운영을 단순하게
            </>
          }
          description="관리자는 예외와 승인만 빠르게 확인하고, 반복되는 기록과 정산 흐름은 Wee가 정리합니다."
        />

        <div className="mt-16 grid gap-6">
          {featureRows.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className={cn(
                  "grid gap-8 rounded-[10px] border border-gray-200 bg-white p-7 shadow-[0_12px_36px_rgba(17,24,39,0.06)] lg:grid-cols-[minmax(0,1fr)_460px]",
                  index % 2 === 1 && "lg:grid-cols-[460px_minmax(0,1fr)]",
                )}
              >
                <div className={cn("flex flex-col justify-center", index % 2 === 1 && "lg:order-2")}>
                  <span className="mb-5 flex size-12 items-center justify-center rounded-[10px] bg-green-100 text-green-400">
                    <Icon className="size-6" strokeWidth={2.2} />
                  </span>
                  <div className="text-label-14-medium tracking-normal text-green-400">{feature.label}</div>
                  <h3 className="mt-2 text-h-32 tracking-normal text-gray-800">{feature.title}</h3>
                  <p className="mt-5 max-w-[640px] text-body-16-regular leading-[1.75] tracking-normal text-gray-600">{feature.description}</p>
                </div>
                <FeaturePreview index={index} />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeaturePreview({ index }: { index: number }) {
  const rows = [
    ["소속 신청", "승인 대기", "4건"],
    ["시간표 승인", "검토 필요", "4건"],
    ["급여 재확정", "신청 확인", "4건"],
  ];

  return (
    <div className="rounded-[10px] border border-green-100 bg-gradient-to-br from-green-50 to-white p-5">
      <div className="mb-5 flex items-center justify-between">
        <div className="text-h-18-semibold tracking-normal text-gray-900">운영 인박스</div>
        <span className="rounded-full bg-green-400 px-3 py-1 text-label-12-medium tracking-normal text-white">실시간</span>
      </div>
      <div className="space-y-3">
        {rows.map((row, rowIndex) => (
          <div key={row[0]} className="grid grid-cols-[1fr_112px_48px] items-center gap-3 rounded-[8px] bg-white px-4 py-3 text-body-14-medium tracking-normal shadow-[0_6px_18px_rgba(17,24,39,0.05)]">
            <span className={cn(rowIndex === index % rows.length ? "text-green-400" : "text-gray-700")}>{row[0]}</span>
            <span className="text-gray-500">{row[1]}</span>
            <span className="text-right text-gray-900">{row[2]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlowSection() {
  return (
    <section className="bg-gradient-to-b from-green-50 to-white px-5 py-24 md:px-8">
      <div className="mx-auto max-w-[1400px]">
        <SectionIntro
          eyebrow="작동 방식"
          title={
            <>
              기록은 남기고 <span className="landing-gradient-text">검토는 줄이는</span> 운영 흐름
            </>
          }
          description="복잡한 설정 없이 사업장 코드부터 출퇴근 기록까지 이어집니다."
        />
        <div className="mt-16 grid gap-5 lg:grid-cols-4">
          {flowSteps.map(([title, description], index) => (
            <div key={title} className="rounded-[999px] bg-gradient-to-br from-green-400 to-[#66ae00] p-1 shadow-[0_18px_42px_rgba(48,193,121,0.24)]">
              <div className="flex aspect-square flex-col items-center justify-center rounded-full bg-green-400 px-8 text-center text-white">
                <div className="text-label-14-medium tracking-normal opacity-90">0{index + 1}</div>
                <h3 className="mt-2 text-h-20 tracking-normal text-white">{title}</h3>
                <p className="mt-3 text-body-14-regular leading-[1.5] tracking-normal text-white/90">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="bg-white px-5 py-24 md:px-8">
      <div className="mx-auto max-w-[1400px]">
        <SectionIntro
          eyebrow="요금제"
          title="운영 규모에 맞는 플랜"
          description="무료로 시작하고, AI 인수인계와 이상 패턴 분석이 필요할 때 Standard로 확장합니다."
        />
        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                "relative rounded-[10px] border bg-white p-7 shadow-[0_12px_36px_rgba(17,24,39,0.06)]",
                plan.featured ? "border-green-400" : "border-gray-200",
              )}
            >
              {plan.featured ? (
                <span className="absolute right-7 top-7 rounded-full bg-green-400 px-4 py-2 text-label-14-medium tracking-normal text-white">추천</span>
              ) : null}
              <div className="text-label-14-medium tracking-normal text-green-400">{plan.name}</div>
              <div className="mt-3 text-h-32 tracking-normal text-gray-900">{plan.price}</div>
              <p className="mt-3 min-h-[56px] text-body-16-regular leading-[1.6] tracking-normal text-gray-600">{plan.description}</p>
              <div className="my-6 h-px bg-gray-100" />
              <ul className="space-y-3">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-body-16-regular tracking-normal text-gray-800">
                    <Check className="size-5 text-green-400" strokeWidth={2.3} />
                    {item}
                  </li>
                ))}
              </ul>
              <LandingCta href="/signup" variant={plan.featured ? "primary" : "secondary"} className="mt-8 w-full">
                {plan.cta}
              </LandingCta>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="bg-gray-50 px-5 py-24 md:px-8">
      <div className="mx-auto max-w-[1400px]">
        <h2 className="text-center text-h-32 tracking-normal text-gray-900">자주 묻는 질문</h2>
        <div className="mt-14 divide-y divide-gray-200">
          {faqs.map(([question, answer], index) => (
            <details key={question} className="group py-7" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-h-20 tracking-normal text-gray-900">
                <span className="flex min-w-0 items-center gap-3">
                  <HelpCircle className="size-6 shrink-0 text-green-400" strokeWidth={2.2} />
                  {question}
                </span>
                <ChevronDown className="size-6 shrink-0 text-gray-500 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-4 text-body-16-regular leading-[1.7] tracking-normal text-gray-600">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="bg-gray-100 px-5 py-10 md:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Image
            src="/admin-shell/logo.png"
            alt=""
            width={80}
            height={52}
            className="h-8 w-auto"
          />
          <span className="text-h-16-semibold tracking-normal text-gray-600">(주) EduU Learning</span>
        </div>
        <div className="flex gap-6 text-body-14-regular tracking-normal text-gray-600">
          <a href="#">이용약관</a>
          <a href="#">개인정보처리방침</a>
        </div>
      </div>
    </footer>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-[980px] text-center">
      <div className="mb-4 text-label-14-medium tracking-normal text-green-400">{eyebrow}</div>
      <h2 className="text-[34px] font-semibold leading-[1.35] tracking-normal text-gray-800 sm:text-[44px]">{title}</h2>
      <p className="mt-6 text-body-16-regular leading-[1.7] tracking-normal text-gray-600 sm:text-[20px]">{description}</p>
    </div>
  );
}

export function LandingCta({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-[58px] items-center justify-center gap-2 rounded-[10px] px-6 text-h-18-semibold tracking-normal transition-colors",
        variant === "primary"
          ? "bg-gradient-to-r from-[#18cd73] to-[#1ccc36] text-white hover:brightness-95"
          : "bg-green-100 text-green-400 hover:bg-green-200",
        className,
      )}
    >
      {children}
      <ArrowRight className="size-5" strokeWidth={2.2} />
    </Link>
  );
}
