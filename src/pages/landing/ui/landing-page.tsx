import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  AlarmClock,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCheck,
  FileText,
  HelpCircle,
  MessageCircleHeart,
  PencilLine,
  PieChart,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

const problemCards = [
  {
    title: "잦은 변수로 관리가 어렵습니다",
    description:
      "대타, 추가 근무, 지각, 수정 요청처럼 예외 상황이 자주 발생하지만 매번 수기로 확인하다 보니 관리 기준이 흔들립니다.",
    image: "/landing/figma-problem-card-variables.png",
    imageClassName: "object-cover",
  },
  {
    title: "정산보다 검토가 더 오래 걸립니다",
    description:
      "근무시간, 승인 여부, 수정 이력 등을 엑셀과 메신저로 하나씩 대조하다 보면 정산 일정 전체가 쉽게 밀리게 됩니다.",
    image: "/landing/figma-problem-card-payroll.png",
    imageClassName: "object-cover",
  },
  {
    title: "인수인계가 사람마다 달라집니다",
    description:
      "업무 노하우 및 주의사항이 구두와 메신저 등에 흩어져 있어 담당자가 바뀔 때마다 반복하여 설명해야 합니다.",
    image: "/landing/figma-problem-card-handover.png",
    imageClassName: "object-cover",
  },
] as const;

const featureRows = [
  {
    label: "Feature #1",
    title: "시간표 연동 자동 근무 기록",
    description:
      "수업 시간표와 연결된 기준으로 근무지, 수업 정보, 기본 근무 시간이 자동 반영되어 기록 누락과 수기 입력 부담을 줄입니다.",
    tags: ["# 시간표/비시간표 근무 구분 관리", "# 태그 기반 근무 이력 조회"],
    mockupIcon: CalendarDays,
    mockupAccent: "left",
    image: "/landing/admin-dashboard.png",
    imageAlt: "시간표 연동 자동 근무 기록 화면",
  },
  {
    label: "Feature #2",
    title: "예외만 빠르게 확인하는 승인 워크플로우",
    description:
      "사전 승인 없는 연장근무, 수정 요청, 비정상 기록 등 검토가 필요한 항목만 선별해 관리자는 예외 중심으로 빠르게 승인할 수 있습니다.",
    tags: [
      "# 승인/반려/정정 이력 자동 관리",
      "# 전체 기록이 아닌 검토 필요 항목만",
    ],
    mockupIcon: AlarmClock,
    mockupAccent: "left",
    image: "/landing/work-timeline-screen.png",
    imageAlt: "근무 타임라인 승인 워크플로우 화면",
  },
  {
    label: "Feature #3",
    title: "승인된 기록 기반 급여 자동 산정",
    description:
      "근무기록과 개인 급여 기준을 바탕으로 시급제와 월급제, 추가 수당까지 자동 반영해 월별 정산 업무를 빠르게 마무리할 수 있습니다.",
    tags: ["# 개인 단위 급여 기준 설정", "# 추가 수당/보너스 항목 자유 생성"],
    mockupIcon: PieChart,
    mockupAccent: "right",
    image: "/landing/payroll-screen.png",
    imageAlt: "급여 자동 산정 화면",
  },
  {
    label: "Feature #4",
    title: "AI 인수인계 자동 문서화",
    description:
      "현장에서 자유롭게 작성한 인수인계 내용을 AI가 업무 유형과 근무지에 맞춰 구조화해 담당자가 바뀌어도 운영 정보가 끊기지 않게 만듭니다.",
    tags: [
      "# 구두 기반 인수인계 정보 유실 최소화",
      "# 신규 관리자/조교 온보딩 효율 향상",
    ],
    mockupIcon: MessageCircleHeart,
    mockupAccent: "right",
    image: "/landing/handover-screen.png",
    imageAlt: "AI 인수인계 자동 문서화 화면",
  },
] as const;

const benefitCards = [
  {
    title: "자유롭게 입력한 내용을\n항목별로 자동 정리",
    image: "/landing/figma-ai-auto-organize.jpg",
    imageOpacity: "opacity-[0.5]",
  },
  {
    title: "근무지, 업무 유형,\n수업 기준으로 검색 가능",
    image: "/landing/figma-ai-search.jpg",
    imageOpacity: "opacity-[0.42]",
  },
  {
    title: "반복 설명 없이\n신규 인력 온보딩 지원",
    image: "/landing/figma-ai-onboarding.jpg",
    imageOpacity: "opacity-[0.42]",
  },
] as const;

const setupSteps = [
  [
    "01",
    "코드 발급",
    "관리자가 사업장을 개설하고 조교 초대 코드를 발급합니다.",
  ],
  [
    "02",
    "조교 연결",
    "조교가 코드를 입력하면 소속 신청이 관리자에게 모입니다.",
  ],
  [
    "03",
    "시간표·근무 승인",
    "제출된 시간표와 근무 기준을 검토하고 승인합니다.",
  ],
  [
    "04",
    "자동 기록·정산",
    "출퇴근 기록과 정산 항목이 운영 인박스로 정리됩니다.",
  ],
] as const;

const helpCards = [
  {
    title: "기준이 생깁니다",
    description:
      "대타, 추가 근무, 수정 요청을 사전 승인 흐름으로 관리할 수 있습니다.",
    icon: PencilLine,
  },
  {
    title: "검토가 줄어듭니다",
    description:
      "전체 기록을 하나씩 보는 대신 예외 항목만 빠르게 확인하면 됩니다.",
    icon: ClipboardCheck,
  },
  {
    title: "운영이 남습니다",
    description: "AI 인수인계 문서화로 담당자가 바뀌어도 정보가 이어집니다.",
    icon: FileText,
  },
] as const;

const pricingPlans = [
  {
    name: "Starter",
    price: "무료",
    description: "대부분의 핵심 기능을 바로 사용할 수 있는 실무 중심 기본 플랜",
    highlighted: true,
    cta: "시작하기",
    capacity: [
      ["포함 인원", "3명"],
      ["추가 인원", "인당 2,990원 /월"],
    ],
    features: [
      ["근태 및 급여 관리", true],
      ["이상 건수 자동 표시", true],
      ["대시보드 및 엑셀 내보내기", true],
      ["AI 인수인계", false],
      ["AI 이상 패턴 분석", false],
      ["전담 CSM 및 도입 지원", false],
    ],
  },
  {
    name: "Standard",
    price: "19,000원",
    suffix: "/월",
    description: "고급 기능과 AI 기능까지 확장한 운영 고도화 플랜",
    highlighted: false,
    cta: "시작하기",
    capacity: [
      ["포함 인원", "3명"],
      ["추가 인원", "인당 2,990원 /월"],
    ],
    features: [
      ["근태 및 급여 관리", true],
      ["이상 건수 자동 표시", true],
      ["대시보드 및 엑셀 내보내기", true],
      ["AI 인수인계", true],
      ["AI 이상 패턴 분석", true],
      ["전담 CSM 및 도입 지원", false],
    ],
  },
  {
    name: "Enterprise",
    price: "문의",
    description: "대규모 운영과 맞춤형 구축이 필요한 팀을 위한 맞춤 제안 플랜",
    highlighted: false,
    cta: "별도 문의하기",
    capacity: [
      ["포함 인원", "3명"],
      ["추가 인원", "인당 2,990원 /월"],
    ],
    features: [
      ["근태 및 급여 관리", true],
      ["이상 건수 자동 표시", true],
      ["대시보드 및 엑셀 내보내기", true],
      ["AI 인수인계", true],
      ["AI 이상 패턴 분석", true],
      ["전담 CSM 및 도입 지원", true],
    ],
  },
] as const;

const faqs = [
  [
    "학원이 아니라 강사 개인도 쓸 수 있나요?",
    "네. Wee는 학원 단위뿐 아니라 여러 사업장에 출강하는 강사 중심 운영 구조에도 맞게 설계되었습니다.",
  ],
  [
    "조교는 뭘 해야 하나요?",
    "앱에서 소속 코드를 입력하고 시간표와 출퇴근 기록을 제출합니다.",
  ],
  [
    "기존 서비스(시프티, 알밤)와 뭐가 다른가요?",
    "단순 출퇴근 기록이 아니라 승인, 예외 처리, 급여 정산, 인수인계를 조교 운영 흐름으로 묶습니다.",
  ],
  [
    "무료로도 충분한가요?",
    "Starter 플랜으로 소규모 운영의 기본 흐름을 먼저 검증할 수 있습니다.",
  ],
  [
    "조교마다 급여가 달라도 되나요?",
    "시급, 월급, 보너스와 차감 항목을 조교별로 다르게 관리할 수 있습니다.",
  ],
  [
    "출강 학원이 여러 개여도 되나요?",
    "여러 사업장과 근무지를 분리해 운영 흐름과 정산 기준을 관리할 수 있습니다.",
  ],
] as const;

export function LandingPage() {
  return (
    <main
      className="min-h-screen bg-white tracking-normal text-gray-900"
      data-testid="landing-page"
    >
      <LandingHeader />
      <HeroSection />
      <ProblemSection />
      <FeatureSection />
      <BenefitSection />
      <SetupSection />
      <HelpSection />
      <PricingSection />
      <FaqSection />
      <LandingFooter />
    </main>
  );
}

export function LandingHeader({ minimal = false }: { minimal?: boolean }) {
  return (
    <header className="sticky top-0 z-40 bg-white shadow-[0_4px_10px_rgba(0,0,0,0.04)]">
      <div className="mx-auto flex h-[88px] w-full max-w-[1120px] items-start justify-between px-5 pt-8 md:px-8 xl:px-0">
        <Link
          href="/"
          className="flex h-[34px] w-[184px] items-start rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
        >
          <Image
            src="/admin-shell/logo.png"
            alt="Wee"
            width={80}
            height={52}
            className="h-[30px] w-auto"
            priority
          />
          <span className="sr-only">Wee</span>
        </Link>

        {minimal ? null : (
          <nav
            className="hidden items-start gap-16 pb-7 text-[18px] font-medium leading-[1.4] tracking-normal text-gray-600 lg:flex"
            aria-label="랜딩 메뉴"
          >
            <a href="#features" className="hover:text-green-400">
              기능
            </a>
            <a href="#pricing" className="hover:text-green-400">
              요금제
            </a>
            <a href="#faq" className="hover:text-green-400">
              FAQ
            </a>
          </nav>
        )}

        <div className="flex items-center gap-2.5 pb-4">
          <Link
            href="/login"
            className="hidden h-9 items-center rounded-full bg-green-400 px-3.5 text-[16px] font-normal leading-[1.4] tracking-normal text-white transition-colors hover:bg-green-450 sm:flex"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className="flex h-9 items-center rounded-full border border-green-400 bg-white px-3.5 text-[16px] font-normal leading-[1.4] tracking-normal text-green-400 transition-colors hover:bg-green-50"
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
    <section
      className="relative h-auto min-h-[640px] overflow-hidden bg-gray-50 lg:h-[820px]"
      data-testid="landing-section-hero"
    >
      <div className="absolute left-[calc(50%+20px)] top-[140px] hidden h-[520px] w-[820px] lg:block">
        <div className="absolute inset-0 rotate-[5deg] rounded-[28px] border border-gray-200 bg-white p-3 shadow-[0_30px_90px_rgba(17,24,39,0.16)]">
          <div className="relative size-full overflow-hidden rounded-[20px] bg-gray-50">
            <div className="absolute inset-4 overflow-hidden rounded-[14px] bg-white">
              <Image
                src="/landing/admin-dashboard.png"
                alt="Wee 관리자 대시보드"
                fill
                sizes="790px"
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>
        <div className="absolute inset-y-[-120px] left-[-180px] w-[380px] bg-gradient-to-r from-gray-50 via-gray-50/82 to-gray-50/0" />
        <div className="absolute inset-x-[-80px] bottom-[-180px] h-[260px] bg-gradient-to-t from-gray-50 to-gray-50/0" />
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-[1120px] flex-col items-start justify-center gap-7 px-5 py-16 md:px-8 lg:gap-12 xl:px-0">
        <div className="max-w-[640px]">
          <h1 className="text-[36px] font-bold leading-[1.25] tracking-normal text-gray-800 sm:text-[48px] lg:text-[52px] lg:leading-[1.35]">
            <span className="landing-gradient-text">조교 관리</span>는 더
            가볍게,
            <br />
            <span className="landing-gradient-text">운영 통제</span>는 더
            정확하게.
          </h1>
        </div>
        <p className="max-w-[620px] text-[15px] font-normal leading-[1.8] tracking-normal text-gray-600 sm:text-[20px] lg:text-[20px] lg:leading-[1.65]">
          수기 대조, 늦어지는 정산, 반복되는 예외 근무, 휘발되는 인수인계까지.
          <br />
          <strong className="font-semibold">Wee</strong>는 조교 근태 기록, 승인,
          급여 정산, AI 인수인계 문서화를
          <br />
          하나로 통합한{" "}
          <strong className="font-semibold">조교 운영 SaaS</strong>입니다.
        </p>
        <div className="flex flex-wrap gap-5">
          <Link
            href="/signup"
            className="flex h-14 w-40 items-center justify-center whitespace-nowrap rounded-[10px] bg-gradient-to-r from-[#18cd73] to-[#1ccc36] px-4 text-[20px] font-semibold leading-[1.4] tracking-normal text-white transition-[filter] hover:brightness-95"
          >
            무료로 시작하기
          </Link>
          <Link
            href="/signup"
            className="landing-gradient-text flex h-14 w-40 items-center justify-center whitespace-nowrap rounded-[10px] border border-[#18cd73] bg-white px-4 text-[20px] font-semibold leading-[1.4] tracking-normal transition-colors hover:bg-green-50"
          >
            데모 요청하기
          </Link>
        </div>
        <div className="overflow-hidden rounded-[18px] border border-gray-200 bg-white shadow-[0_24px_70px_rgba(17,24,39,0.12)] lg:hidden">
          <Image
            src="/landing/admin-dashboard.png"
            alt="Wee 관리자 대시보드"
            width={1920}
            height={1080}
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
    <section
      className="relative overflow-hidden bg-[#f2fff4] px-5 py-20 md:px-8 lg:min-h-[1060px] lg:py-[84px]"
      data-testid="landing-section-problem"
    >
      <Image
        src="/landing/figma-problem-bg.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-30"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-[rgba(46,205,142,0.24)]" />
      <div className="relative mx-auto max-w-[1120px]">
        <div className="mx-auto max-w-[980px] text-center">
          <div className="mb-4 text-[16px] font-semibold leading-[1.4] tracking-normal text-[#30c179]">
            운영 문제
          </div>
          <h2 className="text-[30px] font-semibold leading-[1.35] tracking-normal text-[#1e293b] sm:text-[38px]">
            <span className="landing-gradient-text">조교 관리</span>,
            <br />
            이런 문제들로 계속{" "}
            <span className="landing-gradient-text">번거로우셨나요?</span>
          </h2>
          <p className="mx-auto mt-5 max-w-[980px] text-[16px] font-normal leading-[1.7] tracking-normal text-[#374151] sm:text-[20px]">
            조교 운영이 힘든 이유는 업무가 많아서가 아닌 부정확한 기준과
            예외상황, 그리고 검토가 전부 사람 손에 달려 있기 때문입니다.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {problemCards.map((card) => (
            <article
              key={card.title}
              className="overflow-hidden rounded-[10px] border-2 border-green-200 bg-white/70 shadow-[0_0_10px_rgba(0,0,0,0.08)] backdrop-blur-[10px]"
            >
              <div className="relative h-[210px] w-full bg-white/60 sm:h-[250px]">
                <div className="absolute inset-0 overflow-hidden bg-white">
                  <Image
                    src={card.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 360px, calc(100vw - 44px)"
                    className={card.imageClassName}
                    data-testid="problem-card-image"
                  />
                </div>
              </div>
              <div className="flex min-h-[184px] flex-col justify-center gap-4 border-t-2 border-green-200 px-7 py-7">
                <h3 className="text-[22px] font-semibold leading-[1.4] tracking-normal text-[#30c179]">
                  {card.title}
                </h3>
                <p className="break-keep text-[16px] font-normal leading-[1.6] tracking-normal text-[#374151]">
                  {card.description}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mx-auto mt-9 max-w-[960px] rounded-[10px] border-2 border-[#bdf3d3] bg-white/82 px-7 py-8 text-center shadow-[0_0_48px_rgba(24,205,115,0.18)]">
          <p className="landing-gradient-text text-[26px] font-semibold leading-[1.4] tracking-normal">
            Wee는 조교 운영의 핵심 문제를
            <br />
            기록, 승인, 정산, 인수인계까지 한 번에 정리합니다
          </p>
        </div>
      </div>
    </section>
  );
}

function FeatureSection() {
  return (
    <section
      id="features"
      className="relative overflow-hidden bg-[linear-gradient(115deg,#f9fefb_0%,#ffffff_48%,#fffaf0_100%)] px-5 py-20 md:px-8 lg:min-h-[2460px] lg:py-[132px]"
      data-testid="landing-section-features"
    >
      <GreenGlow className="left-[-250px] top-[560px] h-[620px] w-[620px]" />
      <GreenGlow className="right-[-260px] top-[1660px] h-[640px] w-[640px]" />
      <div className="relative mx-auto max-w-[1120px]">
        <SectionIntro
          eyebrow="핵심 기능"
          title={
            <>
              <span className="landing-gradient-text">4가지 핵심 기능으로</span>
              <br />
              복잡한 조교 운영을 자동화하세요
            </>
          }
          description="기록은 더 정확하게, 검토는 더 빠르게, 운영 정보는 AI로 계속 축적되도록 설계했습니다."
        />

        <div className="mt-20 space-y-14 lg:space-y-20">
          {featureRows.map((feature, index) => {
            const mockupOnRight = index >= 2;

            return (
              <article
                key={feature.title}
                className={cn(
                  "grid min-h-[430px] gap-8 rounded-[20px] border-2 border-white bg-white/70 p-6 shadow-[0_0_20px_rgba(0,0,0,0.08)] backdrop-blur-[10px] md:p-8 lg:gap-12 lg:p-10",
                  mockupOnRight
                    ? "lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]"
                    : "lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]",
                )}
              >
                <FeatureMockup
                  feature={feature}
                  className={cn(mockupOnRight && "lg:order-2")}
                />
                <FeatureCopy
                  feature={feature}
                  className={cn(mockupOnRight && "lg:order-1")}
                />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeatureMockup({
  feature,
  className,
}: {
  feature: (typeof featureRows)[number];
  className?: string;
}) {
  const MockupIcon = feature.mockupIcon;

  return (
    <div
      className={cn(
        "relative h-[260px] overflow-visible rounded-[10px] bg-gray-100 md:h-[320px] lg:h-[360px]",
        className,
      )}
      data-testid="feature-mockup"
    >
      <div
        className="absolute inset-4 overflow-hidden rounded-[8px] bg-white shadow-[0_12px_28px_rgba(17,24,39,0.08)]"
        data-testid="feature-mockup-image-frame"
      >
        <Image
          src={feature.image}
          alt={feature.imageAlt}
          fill
          sizes="(min-width: 1024px) 528px, calc(100vw - 112px)"
          className="object-contain opacity-95"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-green-100/30" />
      <div
        aria-hidden="true"
        className={cn(
          "absolute grid size-[70px] place-items-center rounded-[18px] bg-gradient-to-br from-[#99ff7a] to-[#3edc91] text-white opacity-95 shadow-[0_18px_42px_rgba(48,193,121,0.28)]",
          feature.mockupAccent === "left"
            ? "-bottom-8 -left-7 rotate-[6deg]"
            : "-bottom-8 -right-7 rotate-[-6deg]",
        )}
      >
        <MockupIcon className="size-9" strokeWidth={2.1} />
      </div>
    </div>
  );
}

function FeatureCopy({
  feature,
  className,
}: {
  feature: (typeof featureRows)[number];
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col justify-center py-2 lg:min-w-0", className)}
    >
      <div className="w-fit rounded-full bg-green-100 px-3 py-1.5 text-[12px] font-semibold leading-[1.4] tracking-normal text-green-400">
        {feature.label}
      </div>
      <h3 className="mt-4 break-keep text-[28px] font-semibold leading-[1.35] tracking-normal text-gray-900">
        {feature.title}
      </h3>
      <p className="mt-5 max-w-[460px] break-keep text-[18px] font-normal leading-[1.6] tracking-normal text-gray-700">
        {feature.description}
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {feature.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-[8px] bg-gray-100 px-3 py-1.5 text-[13px] font-semibold leading-[1.4] tracking-normal text-gray-600"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function BenefitSection() {
  return (
    <section
      className="relative overflow-hidden bg-[#f2fff4] px-5 py-20 md:px-8 lg:min-h-[990px] lg:py-0 lg:pt-[84px]"
      data-testid="landing-section-ai"
    >
      <Image
        src="/landing/figma-ai-bg.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-30"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-[rgba(46,205,142,0.24)]" />
      <div className="relative mx-auto max-w-[1120px]">
        <SectionIntro
          eyebrow=""
          title={
            <>
              기록을 넘어서
              <br />
              <span className="landing-gradient-text">운영 노하우</span>까지
              쌓이는 <span className="landing-gradient-text">AI 시스템</span>
            </>
          }
          description="Wee의 AI 에이전트는 현장에서 오가는 인수인계와 업무 정보를 구조화해 다음 담당자가 바로 활용할 수 있는 운영 자산으로 전환합니다."
        />
        <div className="relative mx-auto mt-12 max-w-[1040px] pb-[130px]">
          <div className="grid justify-items-center gap-9 lg:grid-cols-3 lg:gap-10">
            {benefitCards.map((card) => (
              <article
                key={card.title}
                className="relative flex size-[310px] items-center justify-center overflow-hidden rounded-full border-2 border-green-200 bg-green-400 text-center shadow-[0_28px_64px_rgba(24,205,115,0.18)]"
              >
                <Image
                  src={card.image}
                  alt=""
                  fill
                  sizes="310px"
                  className={cn("object-cover", card.imageOpacity)}
                  data-testid="ai-benefit-image"
                />
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[rgba(24,205,115,0.58)] to-[rgba(85,223,154,0.58)] mix-blend-multiply" />
                <h3 className="relative whitespace-pre-line px-10 text-[23px] font-semibold leading-[1.45] tracking-normal text-white">
                  {card.title}
                </h3>
              </article>
            ))}
          </div>
          <svg
            aria-hidden="true"
            className="absolute left-1/2 top-[318px] hidden h-[104px] w-[720px] -translate-x-1/2 lg:block"
            viewBox="0 0 830 120"
            fill="none"
          >
            <path
              d="M12 18C179 70 315 14 415 105C516 14 651 70 818 18"
              stroke="#18CD73"
              strokeDasharray="8 10"
              strokeLinecap="round"
              strokeOpacity="0.42"
              strokeWidth="2"
            />
            <circle cx="415" cy="105" r="8" fill="#18CD73" />
          </svg>
          <div className="absolute inset-x-0 bottom-0 mx-auto flex h-[78px] max-w-[940px] items-center justify-center rounded-[8px] border border-[#bdf3d3] bg-white/90 px-7 text-center shadow-[0_16px_42px_rgba(24,205,115,0.14)]">
            <p className="text-[22px] font-semibold leading-[1.4] tracking-normal text-green-500">
              메신저에 흩어진 운영 노하우를 조직의 자산으로 바꿉니다
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SetupSection() {
  return (
    <section
      className="bg-white px-5 py-20 md:px-8 lg:min-h-[800px] lg:py-0 lg:pt-[84px]"
      data-testid="landing-section-setup"
    >
      <div className="mx-auto max-w-[1120px]">
        <SectionIntro
          eyebrow=""
          title={
            <>
              복잡한 설정 없이
              <br />
              <span className="landing-gradient-text">
                바로 시작하는 운영 플로우
              </span>
            </>
          }
          description=""
        />
      </div>
      <div className="mx-auto mt-10 grid max-w-[1120px] gap-10 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-center">
        <div>
          <div className="divide-y divide-gray-200 bg-white">
            {setupSteps.map(([number, title, description], index) => (
              <details key={title} className="group py-5" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5">
                  <span className="flex min-w-0 items-center gap-5">
                    <span className="w-8 shrink-0 text-[24px] font-normal leading-[1.4] tracking-normal text-green-500">
                      {number}
                    </span>
                    <span className="text-[24px] font-semibold leading-[1.4] tracking-normal text-gray-900">
                      {title}
                    </span>
                  </span>
                  <ChevronDown className="size-6 shrink-0 text-gray-500 transition-transform group-open:rotate-180" />
                </summary>
                <p className="ml-[52px] mt-3 text-[16px] font-normal leading-[1.65] tracking-normal text-gray-700">
                  {description}
                </p>
              </details>
            ))}
          </div>
        </div>

        <SetupPreview />
      </div>
    </section>
  );
}

function SetupPreview() {
  return (
    <div className="relative h-[440px] w-full overflow-hidden rounded-[10px] bg-gray-100 shadow-[0_20px_56px_rgba(17,24,39,0.08)]">
      <div className="absolute inset-x-5 top-5 bottom-24 overflow-hidden rounded-[8px] bg-white shadow-[0_12px_28px_rgba(17,24,39,0.08)]">
        <Image
          src="/landing/admin-dashboard.png"
          alt="운영 플로우 미리보기 화면"
          fill
          sizes="(min-width: 1024px) 650px, calc(100vw - 80px)"
          className="object-contain opacity-95"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-green-100/35" />
      <div className="absolute bottom-6 left-6 right-6 grid gap-3 sm:grid-cols-4">
        {setupSteps.map(([number, title]) => (
          <div
            key={number}
            className="rounded-[8px] border border-green-200 bg-white/88 px-3 py-2 text-left shadow-[0_10px_26px_rgba(17,24,39,0.08)] backdrop-blur"
          >
            <div className="text-[12px] font-semibold leading-[1.4] tracking-normal text-green-400">
              {number}
            </div>
            <div className="mt-1 text-[13px] font-semibold leading-[1.35] tracking-normal text-gray-800">
              {title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HelpSection() {
  return (
    <section
      className="relative overflow-hidden bg-[#effff0] px-5 py-20 md:px-8 lg:min-h-[620px] lg:py-[88px]"
      data-testid="landing-section-help"
    >
      <Image
        src="/landing/figma-problem-bg.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-25"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/55 to-[rgba(46,205,142,0.22)]" />
      <div className="relative mx-auto max-w-[1120px]">
        <SectionIntro
          eyebrow=""
          title={
            <>
              Wee를 도입하면
              <br />
              <span className="landing-gradient-text">조교 운영이</span> 이렇게
              달라집니다
            </>
          }
          description=""
        />
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {helpCards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.title}
                className="min-h-[260px] rounded-[8px] bg-gradient-to-br from-[#18cd73] to-[#66ae00] p-7 text-white shadow-[0_24px_60px_rgba(24,205,115,0.22)]"
              >
                <Icon className="size-10" strokeWidth={2.1} />
                <h3 className="mt-7 text-[23px] font-semibold leading-[1.4] tracking-normal text-white">
                  {card.title}
                </h3>
                <p className="mt-9 text-[16px] font-normal leading-[1.65] tracking-normal text-white/90">
                  {card.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section
      id="pricing"
      className="bg-white px-5 py-20 md:px-8 lg:min-h-[1020px] lg:py-0 lg:pt-[92px]"
      data-testid="landing-section-pricing"
    >
      <div className="mx-auto max-w-[1120px]">
        <SectionIntro
          eyebrow=""
          title={
            <>
              운영 규모에 맞게 선택하는
              <br />
              <span className="landing-gradient-text">유연한 요금제</span>
            </>
          }
          description="소규모 강사 운영부터 다수 조교와 여러 근무지를 함께 관리하는 팀까지 필요한 범위에 맞춰 시작할 수 있습니다."
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                "relative flex min-h-[620px] flex-col rounded-[8px] border bg-white px-7 py-6 shadow-[0_20px_56px_rgba(17,24,39,0.08)]",
                plan.highlighted
                  ? "border-green-500 shadow-[0_24px_68px_rgba(24,205,115,0.18)]"
                  : "border-gray-200",
              )}
            >
              <div className="inline-flex h-8 w-fit items-center rounded-full bg-green-100 px-4 text-[14px] font-medium leading-none tracking-normal text-green-500">
                {plan.name}
              </div>
              <div className="mt-4 flex items-end gap-2 text-gray-900">
                <span className="text-[38px] font-semibold leading-[1.1] tracking-normal">
                  {plan.price}
                </span>
                {"suffix" in plan ? (
                  <span className="pb-1 text-[20px] font-semibold leading-[1.2] tracking-normal">
                    {plan.suffix}
                  </span>
                ) : null}
              </div>
              <p className="mt-4 min-h-[52px] text-[16px] font-normal leading-[1.45] tracking-normal text-gray-600">
                {plan.description}
              </p>
              <div className="mb-5 mt-4 h-px bg-gray-100" />
              <ul className="space-y-[11px]">
                {plan.capacity.map(([label, value]) => (
                  <li
                    key={label}
                    className="flex items-center gap-3 text-[17px] font-normal leading-[1.45] tracking-normal text-gray-800"
                  >
                    <Users
                      className="size-5 shrink-0 text-green-500"
                      strokeWidth={2.1}
                    />
                    <span className="text-gray-500">{label}</span>
                    <span>{value}</span>
                  </li>
                ))}
              </ul>
              <div className="my-5 h-px bg-gray-100" />
              <ul className="space-y-[11px]">
                {plan.features.map(([item, included]) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-[17px] font-normal leading-[1.45] tracking-normal text-gray-800"
                  >
                    {included ? (
                      <Check
                        className="size-5 shrink-0 text-green-500"
                        strokeWidth={2.4}
                      />
                    ) : (
                      <X
                        className="size-5 shrink-0 text-red-500"
                        strokeWidth={2.4}
                      />
                    )}
                    <span
                      className={cn(!included && "text-gray-400 line-through")}
                    >
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
              <LandingCta
                href="/signup"
                variant={plan.highlighted ? "primary" : "secondary"}
                className="mt-auto w-full"
              >
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
    <section
      id="faq"
      className="bg-white px-5 py-20 md:px-8 lg:min-h-[920px] lg:py-28"
      data-testid="landing-section-faq"
    >
      <div className="mx-auto max-w-[1120px]">
        <h2 className="text-center text-[38px] font-semibold leading-[1.35] tracking-normal text-gray-900">
          자주 묻는 질문
        </h2>
        <div className="mt-16 divide-y divide-gray-200">
          {faqs.map(([question, answer], index) => (
            <details key={question} className="group py-6" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-[24px] font-semibold leading-[1.45] tracking-normal text-gray-900">
                <span className="flex min-w-0 items-center gap-4">
                  <HelpCircle
                    className="size-6 shrink-0 text-green-500"
                    strokeWidth={2.1}
                  />
                  {question}
                </span>
                <ChevronDown className="size-6 shrink-0 text-gray-500 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 pl-10 text-[16px] font-normal leading-[1.75] tracking-normal text-gray-600">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer
      className="border-t border-gray-200 bg-gray-50 px-5 py-8 md:px-8 lg:mt-4"
      data-testid="landing-footer"
    >
      <div
        className="mx-auto flex w-fit max-w-full flex-col items-center justify-center gap-4 text-center text-body-14-regular tracking-normal text-gray-500 sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-3 sm:text-left"
        data-testid="landing-footer-content"
      >
        <p className="max-w-[560px] leading-[1.7]">
          Wee는 조교 운영과 근태·정산 흐름을 더 정확하게 관리할 수 있도록 돕는
          운영 SaaS입니다.
        </p>
        <div className="flex shrink-0 gap-6 text-gray-600">
          <a href="#" className="transition-colors hover:text-green-500">
            이용약관
          </a>
          <a href="#" className="transition-colors hover:text-green-500">
            개인정보처리방침
          </a>
        </div>
      </div>
    </footer>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  align?: "center" | "left";
}) {
  return (
    <div
      className={cn(
        "max-w-[980px]",
        align === "center" ? "mx-auto text-center" : "text-left",
      )}
    >
      {eyebrow ? (
        <div className="mb-4 text-[16px] font-semibold leading-[1.4] tracking-normal text-green-500">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="text-[30px] font-semibold leading-[1.35] tracking-normal text-gray-800 sm:text-[38px]">
        {title}
      </h2>
      {description ? (
        <p className="mt-5 text-[16px] font-normal leading-[1.7] tracking-normal text-gray-600 sm:text-[20px]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function GreenGlow({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute rounded-full bg-[radial-gradient(circle,rgba(24,205,115,0.22)_0%,rgba(24,205,115,0.12)_38%,rgba(24,205,115,0)_70%)] blur-[2px]",
        className,
      )}
    />
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
        "flex h-[50px] items-center justify-center gap-2 rounded-[10px] px-5 text-[16px] font-semibold leading-[1.4] tracking-normal transition-colors",
        variant === "primary"
          ? "bg-gradient-to-r from-[#18cd73] to-[#1ccc36] text-white hover:brightness-95"
          : "bg-green-100 text-green-500 hover:bg-green-200",
        className,
      )}
    >
      {children}
      <ArrowRight className="size-4" strokeWidth={2.2} />
    </Link>
  );
}
