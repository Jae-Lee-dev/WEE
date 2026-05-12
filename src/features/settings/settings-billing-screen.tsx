"use client";

import { Check, UserPlus, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createSettingsSupportDataSource } from "./settings-support-data-source";
import {
  settingsBillingFixture,
  type BillingFeature,
  type BillingPlan,
  type SettingsBillingFixture,
} from "./settings-billing-fixtures";

export function SettingsBillingScreen() {
  const dataSource = useMemo(() => createSettingsSupportDataSource(), []);
  const [fixture, setFixture] =
    useState<SettingsBillingFixture>(settingsBillingFixture);
  const [loading, setLoading] = useState(dataSource.mode !== "fixture");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    dataSource
      .getBilling()
      .then((nextFixture) => {
        if (!cancelled) {
          setFixture(nextFixture);
          setErrorMessage("");
          setLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "요금제 정보를 불러오지 못했습니다.",
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dataSource]);

  return (
    <section
      aria-label="요금제"
      className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 tracking-normal"
      data-testid="settings-billing-screen"
    >
      {loading || errorMessage ? (
        <SettingsBillingState
          label={errorMessage || "요금제 정보를 불러오는 중입니다."}
          role={errorMessage ? "alert" : "status"}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            {fixture.plans.map((plan) => (
              <BillingPlanCard key={plan.id} plan={plan} />
            ))}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              className="flex h-9 items-center justify-center rounded-full border border-red-100 bg-white px-4 text-h-18-regular font-medium text-red-500 transition-colors duration-150 ease-out hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-100"
            >
              {fixture.cancelSubscriptionLabel}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function SettingsBillingState({
  label,
  role,
}: {
  label: string;
  role: "alert" | "status";
}) {
  return (
    <div
      className="flex min-h-[420px] items-center justify-center rounded-[8px] bg-white px-4 text-center text-h-18-regular text-gray-500"
      role={role}
    >
      {label}
    </div>
  );
}

function BillingPlanCard({ plan }: { plan: BillingPlan }) {
  return (
    <article
      className={cn(
        "flex min-h-[420px] flex-col gap-4 rounded-[10px] bg-white p-5",
        plan.highlighted ? "border border-green-400" : "border border-white",
      )}
      data-testid={`settings-billing-plan-${plan.id}`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col items-start gap-1">
          <span className="rounded-full bg-green-100 px-3 py-2 text-detail-16-semibold text-green-400">
            {plan.badge}
          </span>
          <h2 className="text-h-24 font-semibold tracking-normal text-gray-700">
            {plan.title}
            {plan.period ? (
              <span className="ml-1 align-baseline text-h-20 text-gray-700">
                {plan.period}
              </span>
            ) : null}
          </h2>
        </div>
        <p className="text-h-18-regular text-gray-600">
          {plan.description.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
      </div>

      <div className="h-px bg-gray-200" />

      <div className="flex flex-col gap-1.5">
        <PlanMetaRow
          icon={<Users className="size-5 text-green-400" />}
          label="포함 인원"
          value={plan.includedUsers}
        />
        <PlanMetaRow
          icon={<UserPlus className="size-5 text-green-400" />}
          label="추가 인원"
          value={plan.extraUsers}
        />
      </div>

      <div className="h-px bg-gray-200" />

      <div className="flex flex-col gap-1.5">
        {plan.features.map((feature) => (
          <BillingFeatureRow key={feature.id} feature={feature} />
        ))}
      </div>

      <Button
        type="button"
        variant="secondary"
        disabled={plan.current}
        className={cn(
          "mt-auto h-[40px] w-full rounded-[8px] px-4 text-h-18-semibold tracking-normal disabled:opacity-100",
          plan.current
            ? "border-gray-200 bg-gray-100 text-gray-300"
            : "border-gray-200 bg-white text-gray-900",
        )}
      >
        {plan.actionLabel}
      </Button>
    </article>
  );
}

function PlanMetaRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 text-h-18-regular">
      <span className="flex items-center gap-2 text-gray-500">
        {icon}
        <span>{label}</span>
      </span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}

function BillingFeatureRow({ feature }: { feature: BillingFeature }) {
  return (
    <div className="flex items-center gap-3 text-h-18-regular">
      {feature.enabled ? (
        <Check className="size-5 text-green-400" />
      ) : (
        <X className="size-5 text-red-500" />
      )}
      <span
        className={cn(
          feature.enabled
            ? "text-gray-900"
            : "text-gray-500 line-through decoration-gray-500",
        )}
      >
        {feature.label}
      </span>
    </div>
  );
}
