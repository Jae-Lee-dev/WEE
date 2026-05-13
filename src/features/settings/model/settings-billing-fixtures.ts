export type BillingFeature = {
  id: string;
  label: string;
  enabled: boolean;
};

export type BillingPlan = {
  id: "starter" | "standard";
  badge: string;
  title: string;
  period?: string;
  description: readonly string[];
  includedUsers: string;
  extraUsers: string;
  features: readonly BillingFeature[];
  actionLabel: string;
  current?: boolean;
  highlighted?: boolean;
};

export type SettingsBillingFixture = {
  plans: readonly BillingPlan[];
  cancelSubscriptionLabel: string;
};

const starterFeatures = [
  { id: "attendance-payroll", label: "근태 및 급여 관리", enabled: true },
  { id: "anomaly-count", label: "이상 건수 자동 표시", enabled: true },
  { id: "dashboard-export", label: "대시보드 및 엑셀 내보내기", enabled: true },
  { id: "ai-handover", label: "AI 인수인계", enabled: false },
  { id: "ai-anomaly", label: "AI 이상 패턴 분석", enabled: false },
  { id: "csm", label: "전담 CSM 및 도입 지원", enabled: false },
] as const satisfies readonly BillingFeature[];

export const settingsBillingFixture = {
  plans: [
    {
      id: "starter",
      badge: "Starter",
      title: "무료",
      description: [
        "대부분의 핵심 기능을 바로 사용할 수 있는",
        "실무 중심 기본 플랜",
      ],
      includedUsers: "3명",
      extraUsers: "인당 2,990원 /월",
      features: starterFeatures,
      actionLabel: "다운그레이드",
    },
    {
      id: "standard",
      badge: "Standard",
      title: "19,000원",
      period: "/월",
      description: ["고급 기능과 AI 기능까지 확장한", "운영 고도화 플랜"],
      includedUsers: "3명",
      extraUsers: "인당 2,990원 /월",
      features: [
        ...starterFeatures.slice(0, 5).map((feature) => ({
          ...feature,
          enabled: true,
        })),
        { id: "csm", label: "전담 CSM 및 도입 지원", enabled: false },
      ],
      actionLabel: "현재 플랜",
      current: true,
      highlighted: true,
    },
  ],
  cancelSubscriptionLabel: "구독 해지",
} as const satisfies SettingsBillingFixture;
