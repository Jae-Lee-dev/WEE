"use client";

import { type ReactNode } from "react";
import { Badge } from "@/shared/ui/badge";
import { OptionSelect } from "@/shared/ui/select";
import { cn } from "@/shared/lib/utils";
import {
  type DashboardMetricTone,
  type DashboardOperationalMetric,
  type DashboardSelectOption,
} from "../model/dashboard-fixtures";

export const metricToneClassNames: Record<
  DashboardMetricTone,
  {
    value: string;
    badge: "green" | "blue" | "orange" | "red" | "grey";
    border: string;
    background: string;
  }
> = {
  green: {
    value: "text-green-400",
    badge: "green",
    border: "border-green-200",
    background: "bg-green-100",
  },
  blue: {
    value: "text-blue-500",
    badge: "blue",
    border: "border-blue-50",
    background: "bg-blue-50",
  },
  orange: {
    value: "text-orange-400",
    badge: "orange",
    border: "border-orange-100",
    background: "bg-orange-100",
  },
  red: {
    value: "text-red-500",
    badge: "red",
    border: "border-red-100",
    background: "bg-red-50",
  },
  grey: {
    value: "text-gray-900",
    badge: "grey",
    border: "border-gray-200",
    background: "bg-gray-100",
  },
};

const dashboardBadgeClassName =
  "text-detail-16-semibold tracking-normal";

export function ToolbarShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[38px] items-center justify-between gap-4">
      {children}
    </div>
  );
}

export function downloadCsv(
  filename: string,
  rows: readonly (readonly string[])[],
) {
  if (rows.length <= 1) {
    return;
  }

  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${cell.replaceAll("\"", "\"\"")}"`)
        .join(","),
    )
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function DashboardSelectField<T extends string>({
  ariaLabel,
  disabled = false,
  onChange,
  options,
  testId,
  value,
}: {
  ariaLabel: string;
  disabled?: boolean;
  onChange: (value: T) => void;
  options: readonly DashboardSelectOption<T>[];
  testId?: string;
  value: T;
}) {
  const hasOptions = options.length > 0;
  const selectOptions = hasOptions
    ? options.map((option) => ({
        label: option.label,
        value: option.id,
      }))
    : [{ disabled: true, label: "선택 가능한 항목 없음", value: "__empty__" }];

  return (
    <OptionSelect
      disabled={disabled || !hasOptions}
      onValueChange={(nextValue) => onChange(nextValue as T)}
      options={selectOptions}
      triggerAriaLabel={ariaLabel}
      triggerClassName="h-10 min-w-[150px] rounded-[6px] border-gray-200 px-3 text-h-18-regular font-normal tracking-normal text-gray-800 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] focus-visible:ring-green-200"
      triggerDataTestId={testId}
      value={hasOptions ? value : "__empty__"}
    />
  );
}

export function DashboardSectionState({
  label,
  role = "status",
}: {
  label: string;
  role?: "alert" | "status";
}) {
  return (
    <div
      className="flex min-h-[360px] items-center justify-center rounded-[8px] bg-white px-4 text-center text-h-18-regular text-gray-500"
      role={role}
    >
      {label}
    </div>
  );
}

export function OperationalMetricGrid({
  metrics,
}: {
  metrics: readonly DashboardOperationalMetric[];
}) {
  return (
    <div className="grid grid-cols-4 gap-4" aria-label="운영 요약">
      {metrics.map((metric) => (
        <OperationalMetricCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
}

export function MetricToneBadge({
  children,
  tone,
}: {
  children: string;
  tone: DashboardMetricTone;
}) {
  return (
    <Badge
      variant={metricToneClassNames[tone].badge}
      size="M"
      className={dashboardBadgeClassName}
    >
      {children}
    </Badge>
  );
}

export function EmptyPanel({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center text-center text-body-14-regular text-gray-500",
        compact ? "min-h-[180px] px-4" : "min-h-[320px] rounded-[8px] bg-white",
      )}
    >
      {children}
    </div>
  );
}

export function getOptionLabel<T extends string>(
  options: readonly DashboardSelectOption<T>[],
  value: T,
) {
  return options.find((option) => option.id === value)?.label ?? value;
}

export function formatCurrency(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function OperationalMetricCard({
  metric,
}: {
  metric: DashboardOperationalMetric;
}) {
  const tone = metricToneClassNames[metric.tone ?? "green"];
  const compactValue = !metric.unit && metric.value.length >= 7;

  return (
    <div className="min-h-[92px] rounded-[8px] border border-gray-200 bg-white px-4 py-4">
      <div className="truncate text-label-18 text-gray-800">{metric.label}</div>
      <div className={cn("mt-1 flex items-baseline gap-1", tone.value)}>
        <span
          className={cn(
            "tracking-normal",
            compactValue ? "text-h-24 font-semibold" : "text-h-32",
          )}
        >
          {metric.value}
        </span>
        {metric.unit ? <span className="text-h-20">{metric.unit}</span> : null}
      </div>
      {metric.subLabel ? (
        <p className="mt-1 truncate text-body-14-regular text-gray-500">
          {metric.subLabel}
        </p>
      ) : null}
    </div>
  );
}
