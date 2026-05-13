import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

export type TrendChartTone = "green" | "orange" | "blue" | "red" | "grey";

export type TrendChartDatum = {
  id: string;
  label: string;
  value: number;
  valueLabel?: string;
};

const trendToneClassNames: Record<
  TrendChartTone,
  {
    value: string;
    bar: string;
  }
> = {
  green: {
    value: "text-green-400",
    bar: "bg-green-400",
  },
  orange: {
    value: "text-orange-400",
    bar: "bg-orange-400",
  },
  blue: {
    value: "text-blue-500",
    bar: "bg-blue-500",
  },
  red: {
    value: "text-red-500",
    bar: "bg-red-500",
  },
  grey: {
    value: "text-gray-700",
    bar: "bg-gray-400",
  },
};

export function TrendChartCard({
  className,
  data,
  footer,
  title,
  tone = "green",
  valueFormatter = String,
}: {
  className?: string;
  data: readonly TrendChartDatum[];
  footer?: ReactNode;
  title: string;
  tone?: TrendChartTone;
  valueFormatter?: (value: number) => string;
}) {
  return (
    <section
      aria-label={title}
      className={cn("rounded-[8px] border border-gray-200 bg-white p-5", className)}
    >
      <h2 className="text-h-20 text-gray-900">{title}</h2>
      <TrendChart data={data} tone={tone} valueFormatter={valueFormatter} />
      {footer ? <div className="mt-4">{footer}</div> : null}
    </section>
  );
}

export function TrendChart({
  className,
  data,
  highlightLast = true,
  tone = "green",
  valueFormatter = String,
}: {
  className?: string;
  data: readonly TrendChartDatum[];
  highlightLast?: boolean;
  tone?: TrendChartTone;
  valueFormatter?: (value: number) => string;
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const toneClassNames = trendToneClassNames[tone];

  return (
    <div
      className={cn("mt-4 flex h-[150px] items-end gap-2.5", className)}
      role="list"
    >
      {data.map((item, index) => {
        const ratio = item.value / maxValue;
        const height = `${Math.max(10, ratio * 96)}px`;
        const valueLabel = item.valueLabel ?? valueFormatter(item.value);
        const highlighted = !highlightLast || index === data.length - 1;

        return (
          <div
            key={item.id}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
            role="listitem"
            aria-label={`${item.label} ${valueLabel}`}
          >
            <div
              className={cn(
                "max-w-full truncate text-center text-detail-12",
                highlighted ? toneClassNames.value : "text-gray-600",
                highlighted && "font-semibold",
              )}
              title={valueLabel}
            >
              {valueLabel}
            </div>
            <div
              className={cn(
                "w-full rounded-t-[4px]",
                highlighted ? toneClassNames.bar : "bg-gray-200",
              )}
              style={{ height }}
            />
            <div
              className={cn(
                "max-w-full truncate text-center text-label-12-regular",
                highlighted ? "font-semibold text-gray-900" : "text-gray-500",
              )}
            >
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
