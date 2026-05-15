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
  FileText,
  HelpCircle,
  PencilLine,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

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
    preview: "attendance",
  },
  {
    label: "급여 정산",
    title: "검토할 항목만 남기는 급여 산정",
    description:
      "승인된 기록을 기준으로 급여 신청과 재확정 항목을 분리해 정산 부담을 줄입니다.",
    icon: CircleDollarSign,
    preview: "payroll",
  },
  {
    label: "AI 인수인계",
    title: "운영 노하우를 문서로 남기는 인수인계",
    description:
      "반복 안내, 주의사항, 담당자 변경 이슈를 AI 편집 흐름으로 정리합니다.",
    icon: Bot,
    preview: "handover",
  },
  {
    label: "운영 기준",
    title: "소속 신청부터 시간표 승인까지 연결",
    description:
      "사업장 코드를 발급하고 조교 소속 신청, 시간표 승인, 근무 개설을 같은 기준으로 관리합니다.",
    icon: ShieldCheck,
    preview: "workspace",
  },
] as const;

const benefitCards = [
  {
    title: "자유롭게 입력한 내용을\n항목별로 자동 정리",
    image: "/landing/problem-variables.png",
  },
  {
    title: "근무지, 업무 유형,\n수업 기준으로 검색 가능",
    image: "/landing/payroll-screen.png",
  },
  {
    title: "반복 설명 없이\n신규 인력 온보딩 지원",
    image: "/landing/problem-handover.png",
  },
] as const;

const setupSteps = [
  ["01", "코드 발급", "관리자가 사업장을 개설하고 조교 초대 코드를 발급합니다."],
  ["02", "조교 연결", "조교가 코드를 입력하면 소속 신청이 관리자에게 모입니다."],
  ["03", "시간표·근무 승인", "제출된 시간표와 근무 기준을 검토하고 승인합니다."],
  ["04", "자동 기록·정산", "출퇴근 기록과 정산 항목이 운영 인박스로 정리됩니다."],
] as const;

const helpCards = [
  {
    title: "기준이 생깁니다",
    description: "대타, 추가 근무, 수정 요청을 사전 승인 흐름으로 관리할 수 있습니다.",
    icon: PencilLine,
  },
  {
    title: "검토가 줄어듭니다",
    description: "전체 기록을 하나씩 보는 대신 예외 항목만 빠르게 확인하면 됩니다.",
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
    featured: false,
    cta: "시작하기",
    items: [
      "포함 인원  3명",
      "추가 인원  인당 2,990원 /월",
      "근태 및 급여 관리",
      "이상 건수 자동 표시",
      "대시보드 및 엑셀 내보내기",
      "AI 인수인계",
      "AI 이상 패턴 분석",
      "전담 CSM 및 도입 지원",
    ],
  },
  {
    name: "Standard",
    price: "19,000원",
    suffix: "/월",
    description: "고급 기능과 AI 기능까지 확장한 운영 고도화 플랜",
    featured: true,
    cta: "시작하기",
    items: [
      "포함 인원  3명",
      "추가 인원  인당 2,990원 /월",
      "근태 및 급여 관리",
      "이상 건수 자동 표시",
      "대시보드 및 엑셀 내보내기",
      "AI 인수인계",
      "AI 이상 패턴 분석",
      "전담 CSM 및 도입 지원",
    ],
  },
  {
    name: "Enterprise",
    price: "문의",
    description: "대규모 운영과 맞춤형 구축이 필요한 팀을 위한 맞춤 제안 플랜",
    featured: false,
    cta: "별도 문의하기",
    items: [
      "포함 인원  3명",
      "추가 인원  인당 2,990원 /월",
      "근태 및 급여 관리",
      "이상 건수 자동 표시",
      "대시보드 및 엑셀 내보내기",
      "AI 인수인계",
      "AI 이상 패턴 분석",
      "전담 CSM 및 도입 지원",
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
    <section className="relative overflow-hidden bg-[#effff0] px-5 py-24 md:px-8 lg:min-h-[1232px] lg:py-[100px]">
      <GreenGlow className="-left-[220px] top-[150px] h-[560px] w-[560px]" />
      <GreenGlow className="right-[-180px] top-[430px] h-[620px] w-[620px]" />
      <div className="relative mx-auto max-w-[1400px]">
        <SectionIntro
          eyebrow="운영 문제"
          title={
            <>
              <span className="landing-gradient-text">조교 관리</span>,
              <br />
              이런 문제들로 계속 번거로우셨나요?
            </>
          }
          description="운영이 힘든 이유는 업무가 많아서가 아니라 부정확한 기준, 반복되는 예외상황, 사람 손에 달린 검토 때문입니다."
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-3 lg:gap-5">
          {problemCards.map((card) => (
            <article key={card.title} className="overflow-hidden rounded-[10px] border-2 border-[#bdf3d3] bg-white/80 shadow-[0_20px_54px_rgba(24,205,115,0.16)] backdrop-blur">
              <Image
                src={card.image}
                alt=""
                width={448}
                height={295}
                className="h-[240px] w-full object-cover sm:h-[295px]"
              />
              <div className="flex min-h-[217px] flex-col justify-center px-9 py-8">
                <h3 className="text-[28px] font-semibold leading-[1.35] tracking-normal text-green-500">{card.title}</h3>
                <p className="mt-5 text-[18px] font-normal leading-[1.65] tracking-normal text-gray-700">{card.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-[1040px] rounded-[10px] border-2 border-[#bdf3d3] bg-white/82 px-8 py-10 text-center shadow-[0_0_48px_rgba(24,205,115,0.18)]">
          <p className="landing-gradient-text text-[30px] font-semibold leading-[1.4] tracking-normal">
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
    <section id="features" className="relative overflow-hidden bg-white px-5 py-24 md:px-8 lg:min-h-[3214px] lg:py-[168px]">
      <GreenGlow className="left-[-260px] top-[620px] h-[620px] w-[620px]" />
      <GreenGlow className="right-[-260px] top-[1760px] h-[640px] w-[640px]" />
      <div className="relative mx-auto max-w-[1400px]">
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

        <div className="mt-24 space-y-16 lg:space-y-[92px]">
          {featureRows.map((feature, index) => {
            const Icon = feature.icon;
            const reversed = index % 2 === 1;

            return (
              <article
                key={feature.title}
                className="grid min-h-[562px] gap-8 rounded-[10px] border border-[#d8f6e4] bg-white p-6 shadow-[0_24px_64px_rgba(17,24,39,0.08)] lg:grid-cols-2 lg:gap-14 lg:p-10"
              >
                <div className={cn("flex flex-col justify-center px-2 py-6 lg:px-10", reversed && "lg:order-2")}>
                  <span className="mb-8 flex size-[74px] items-center justify-center rounded-[18px] bg-green-100 text-green-500">
                    <Icon className="size-9" strokeWidth={2.1} />
                  </span>
                  <div className="text-[18px] font-semibold leading-[1.4] tracking-normal text-green-500">{feature.label}</div>
                  <h3 className="mt-4 text-[38px] font-semibold leading-[1.35] tracking-normal text-gray-900">{feature.title}</h3>
                  <p className="mt-7 max-w-[560px] text-[20px] font-normal leading-[1.75] tracking-normal text-gray-600">{feature.description}</p>
                </div>
                <FeaturePreview type={feature.preview} reversed={reversed} />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeaturePreview({
  type,
  reversed,
}: {
  type: (typeof featureRows)[number]["preview"];
  reversed: boolean;
}) {
  if (type === "payroll") {
    return (
      <PreviewShell className={cn(reversed && "lg:order-1")}>
        <Image
          src="/landing/payroll-screen.png"
          alt=""
          width={620}
          height={392}
          className="w-full rounded-[12px] border border-gray-200 shadow-[0_18px_44px_rgba(17,24,39,0.12)]"
        />
      </PreviewShell>
    );
  }

  if (type === "handover") {
    return (
      <PreviewShell className={cn(reversed && "lg:order-1")}>
        <Image
          src="/landing/handover-screen.png"
          alt=""
          width={620}
          height={392}
          className="w-full rounded-[12px] border border-gray-200 shadow-[0_18px_44px_rgba(17,24,39,0.12)]"
        />
      </PreviewShell>
    );
  }

  const rows =
    type === "attendance"
      ? [
          ["소속 신청", "승인 대기", "4건"],
          ["시간표 승인", "검토 필요", "4건"],
          ["급여 재확정", "신청 확인", "4건"],
        ]
      : [
          ["잠실 본원", "사업장 코드", "WEE-014"],
          ["조교 소속", "승인 대기", "7명"],
          ["근무지", "활성", "5곳"],
        ];

  return (
    <PreviewShell className={cn(reversed && "lg:order-1")}>
      <div className="rounded-[14px] border border-green-100 bg-white p-6 shadow-[0_18px_44px_rgba(17,24,39,0.11)]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-[22px] font-semibold leading-[1.4] tracking-normal text-gray-900">운영 인박스</div>
            <div className="mt-1 text-[14px] font-normal leading-[1.4] tracking-normal text-gray-500">오늘 검토할 항목</div>
          </div>
          <span className="rounded-full bg-green-500 px-4 py-2 text-[14px] font-semibold leading-none tracking-normal text-white">실시간</span>
        </div>
        <div className="space-y-4">
          {rows.map((row, rowIndex) => (
            <div key={row[0]} className="grid min-h-[72px] grid-cols-[1fr_128px_82px] items-center gap-4 rounded-[10px] bg-[#f7fbf8] px-5 text-[16px] font-medium leading-[1.4] tracking-normal shadow-[inset_0_0_0_1px_rgba(24,205,115,0.08)]">
              <span className={cn(rowIndex === 0 ? "text-green-500" : "text-gray-800")}>{row[0]}</span>
              <span className="text-gray-500">{row[1]}</span>
              <span className="text-right text-gray-900">{row[2]}</span>
            </div>
          ))}
        </div>
      </div>
    </PreviewShell>
  );
}

function PreviewShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-h-[430px] items-center justify-center rounded-[10px] bg-gradient-to-br from-[#e9fff0] via-white to-[#f5fbf7] p-7", className)}>
      {children}
    </div>
  );
}

function BenefitSection() {
  return (
    <section className="relative overflow-hidden bg-[#f2fff4] px-5 py-24 md:px-8 lg:min-h-[1150px] lg:py-0 lg:pt-[100px]">
      <GreenGlow className="left-[calc(50%-730px)] top-[230px] h-[520px] w-[520px]" />
      <GreenGlow className="right-[calc(50%-760px)] top-[520px] h-[520px] w-[520px]" />
      <div className="relative mx-auto max-w-[1400px]">
        <SectionIntro
          eyebrow=""
          title={
            <>
              기록을 넘어서
              <br />
              <span className="landing-gradient-text">운영 노하우까지 쌓이는 AI 시스템</span>
            </>
          }
          description="Wee의 AI 에이전트는 현장에서 오는 인수인계와 업무 정보를 구조화해 다음 담당자가 바로 활용할 수 있는 운영 자산으로 전환합니다."
        />
        <div className="relative mx-auto mt-[58px] max-w-[1150px] pb-[160px]">
          <div className="grid justify-items-center gap-10 lg:grid-cols-3 lg:gap-[46px]">
            {benefitCards.map((card) => (
              <article
                key={card.title}
                className="relative flex size-[360px] items-center justify-center overflow-hidden rounded-full bg-green-500 text-center shadow-[0_28px_64px_rgba(24,205,115,0.28)]"
              >
                <Image
                  src={card.image}
                  alt=""
                  width={360}
                  height={360}
                  className="absolute inset-0 size-full object-cover opacity-40 mix-blend-luminosity"
                />
                <div className="absolute inset-0 bg-[#18cd73]/76" />
                <h3 className="relative whitespace-pre-line px-12 text-[27px] font-semibold leading-[1.45] tracking-normal text-white">
                  {card.title}
                </h3>
              </article>
            ))}
          </div>
          <svg
            aria-hidden="true"
            className="absolute left-1/2 top-[370px] hidden h-[120px] w-[830px] -translate-x-1/2 lg:block"
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
          <div className="absolute inset-x-0 bottom-0 mx-auto flex h-[94px] max-w-[1040px] items-center justify-center rounded-[8px] border border-[#bdf3d3] bg-white/90 px-8 text-center shadow-[0_16px_42px_rgba(24,205,115,0.14)]">
            <p className="text-[26px] font-semibold leading-[1.4] tracking-normal text-green-500">
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
    <section className="bg-white px-5 py-24 md:px-8 lg:min-h-[924px] lg:py-0 lg:pt-[100px]">
      <div className="mx-auto max-w-[1400px]">
        <SectionIntro
          eyebrow=""
          title={
            <>
              복잡한 설정 없이
              <br />
              <span className="landing-gradient-text">바로 시작하는 운영 플로우</span>
            </>
          }
          description=""
        />
      </div>
      <div className="mx-auto mt-[46px] grid max-w-[1400px] gap-12 lg:grid-cols-[549px_820px] lg:items-center lg:justify-between">
        <div>
          <div className="divide-y divide-gray-200 bg-white">
            {setupSteps.map(([number, title, description], index) => (
              <details key={title} className="group py-[23px]" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5">
                  <span className="flex min-w-0 items-center gap-5">
                    <span className="w-9 shrink-0 text-[28px] font-normal leading-[1.4] tracking-normal text-green-500">
                      {number}
                    </span>
                    <span className="text-[28px] font-semibold leading-[1.4] tracking-normal text-gray-900">{title}</span>
                  </span>
                  <ChevronDown className="size-6 shrink-0 text-gray-500 transition-transform group-open:rotate-180" />
                </summary>
                <p className="ml-14 mt-3 text-[18px] font-normal leading-[1.65] tracking-normal text-gray-700">{description}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="h-[520px] w-full rounded-[8px] bg-[#f2f3f6]" />
      </div>
    </section>
  );
}

function HelpSection() {
  return (
    <section className="relative overflow-hidden bg-[#effff0] px-5 py-24 md:px-8 lg:min-h-[715px] lg:py-[108px]">
      <GreenGlow className="left-[-180px] top-[60px] h-[420px] w-[420px]" />
      <div className="relative mx-auto max-w-[1400px]">
        <SectionIntro
          eyebrow=""
          title={
            <>
              Wee를 도입하면
              <br />
              <span className="landing-gradient-text">조교 운영이</span> 이렇게 달라집니다
            </>
          }
          description=""
        />
        <div className="mt-[74px] grid gap-6 lg:grid-cols-3">
          {helpCards.map((card) => {
            const Icon = card.icon;

            return (
              <article key={card.title} className="min-h-[306px] rounded-[8px] bg-gradient-to-br from-[#18cd73] to-[#66ae00] p-8 text-white shadow-[0_24px_60px_rgba(24,205,115,0.22)]">
                <Icon className="size-12" strokeWidth={2.1} />
                <h3 className="mt-9 text-[26px] font-semibold leading-[1.4] tracking-normal text-white">{card.title}</h3>
                <p className="mt-12 text-[18px] font-normal leading-[1.65] tracking-normal text-white/90">{card.description}</p>
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
    <section id="pricing" className="bg-white px-5 py-24 md:px-8 lg:min-h-[1178px] lg:py-0 lg:pt-[112px]">
      <div className="mx-auto max-w-[1400px]">
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
        <div className="mt-[56px] grid gap-6 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                "relative flex min-h-[708px] flex-col rounded-[8px] border bg-white px-8 py-7 shadow-[0_20px_56px_rgba(17,24,39,0.08)]",
                plan.featured ? "border-green-500 shadow-[0_24px_68px_rgba(24,205,115,0.18)]" : "border-gray-200",
              )}
            >
              {plan.featured ? (
                <span className="absolute right-9 top-9 rounded-full bg-green-500 px-4 py-2 text-[14px] font-semibold leading-none tracking-normal text-white">추천</span>
              ) : null}
              <div className="inline-flex h-8 w-fit items-center rounded-full bg-green-100 px-4 text-[14px] font-medium leading-none tracking-normal text-green-500">{plan.name}</div>
              <div className="mt-4 flex items-end gap-2 text-gray-900">
                <span className="text-[44px] font-semibold leading-[1.1] tracking-normal">{plan.price}</span>
                {"suffix" in plan ? <span className="pb-1 text-[22px] font-semibold leading-[1.2] tracking-normal">{plan.suffix}</span> : null}
              </div>
              <p className="mt-4 min-h-[60px] text-[18px] font-normal leading-[1.45] tracking-normal text-gray-600">{plan.description}</p>
              <div className="mb-5 mt-4 h-px bg-gray-100" />
              <ul className="space-y-[11px]">
                {plan.items.map((item, index) => (
                  <li key={item} className="flex items-center gap-3 text-[20px] font-normal leading-[1.45] tracking-normal text-gray-800">
                    {index < 2 ? (
                      <Users className="size-5 shrink-0 text-green-500" strokeWidth={2.1} />
                    ) : !plan.featured && plan.name === "Starter" && index >= 5 ? (
                      <X className="size-5 shrink-0 text-red-500" strokeWidth={2.4} />
                    ) : (
                      <Check className="size-5 shrink-0 text-green-500" strokeWidth={2.4} />
                    )}
                    <span className={cn(!plan.featured && plan.name === "Starter" && index >= 5 && "text-gray-400 line-through")}>{item}</span>
                  </li>
                ))}
              </ul>
              <LandingCta href="/signup" variant={plan.featured ? "primary" : "secondary"} className="mt-auto w-full">
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
    <section id="faq" className="bg-white px-5 py-24 md:px-8 lg:min-h-[1056px] lg:py-[142px]">
      <div className="mx-auto max-w-[1401px]">
        <h2 className="text-center text-[44px] font-semibold leading-[1.35] tracking-normal text-gray-900">자주 묻는 질문</h2>
        <div className="mt-20 divide-y divide-gray-200">
          {faqs.map(([question, answer], index) => (
            <details key={question} className="group py-8" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-[28px] font-semibold leading-[1.45] tracking-normal text-gray-900">
                <span className="flex min-w-0 items-center gap-4">
                  <HelpCircle className="size-7 shrink-0 text-green-500" strokeWidth={2.1} />
                  {question}
                </span>
                <ChevronDown className="size-6 shrink-0 text-gray-500 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 pl-11 text-[18px] font-normal leading-[1.75] tracking-normal text-gray-600">{answer}</p>
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
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 text-body-14-regular tracking-normal text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[560px] leading-[1.7]">
          Wee는 조교 운영과 근태·정산 흐름을 더 정확하게 관리할 수 있도록 돕는 운영 SaaS입니다.
        </p>
        <div className="flex gap-6 text-gray-600">
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
    <div className={cn("max-w-[980px]", align === "center" ? "mx-auto text-center" : "text-left")}>
      {eyebrow ? (
        <div className="mb-5 text-[18px] font-semibold leading-[1.4] tracking-normal text-green-500">{eyebrow}</div>
      ) : null}
      <h2 className="text-[34px] font-semibold leading-[1.35] tracking-normal text-gray-800 sm:text-[44px]">{title}</h2>
      {description ? (
        <p className="mt-7 text-[18px] font-normal leading-[1.7] tracking-normal text-gray-600 sm:text-[24px]">{description}</p>
      ) : null}
    </div>
  );
}

function GreenGlow({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute rounded-full bg-[radial-gradient(circle,rgba(24,205,115,0.22)_0%,rgba(24,205,115,0.12)_38%,rgba(24,205,115,0)_70%)] blur-[2px]", className)}
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
        "flex h-[58px] items-center justify-center gap-2 rounded-[10px] px-6 text-h-18-semibold tracking-normal transition-colors",
        variant === "primary"
          ? "bg-gradient-to-r from-[#18cd73] to-[#1ccc36] text-white hover:brightness-95"
          : "bg-green-100 text-green-500 hover:bg-green-200",
        className,
      )}
    >
      {children}
      <ArrowRight className="size-5" strokeWidth={2.2} />
    </Link>
  );
}
