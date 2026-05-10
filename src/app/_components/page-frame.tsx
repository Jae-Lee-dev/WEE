import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PageFrameProps = {
  children: ReactNode;
  className?: string;
};

export function PageFrame({ children, className }: PageFrameProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1580px] flex-col gap-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

type PageFrameHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageFrameHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageFrameHeaderProps) {
  return (
    <header
      className={cn(
        "flex min-h-[52px] items-start justify-between gap-6",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1 text-label-12-medium text-gray-400">
            {eyebrow}
          </div>
        ) : null}
        <h2 className="truncate text-h-24 text-gray-900">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-[720px] text-body-14-regular text-gray-500">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}

export type MetricItem = {
  label: string;
  value: string;
  unit?: string;
  tag?: string;
  tone?: "green" | "orange" | "red" | "blue" | "grey";
};

export function MetricStrip({
  metrics,
  className,
}: {
  metrics: readonly MetricItem[];
  className?: string;
}) {
  return (
    <section
      className={cn("grid grid-cols-3 gap-4 xl:grid-cols-6", className)}
      aria-label="요약 지표"
    >
      {metrics.map((metric) => (
        <MetricCard key={metric.label} metric={metric} />
      ))}
    </section>
  );
}

export function MetricCard({ metric }: { metric: MetricItem }) {
  return (
    <div className="min-h-[111px] rounded-[8px] border border-gray-200 bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="truncate text-label-18 text-gray-800">
          {metric.label}
        </div>
        {metric.tag ? (
          <Badge variant={metric.tone ?? "green"} size="M">
            {metric.tag}
          </Badge>
        ) : null}
      </div>
      <div className="mt-1 flex items-baseline gap-1 text-green-400">
        <span className="text-[36px] font-semibold leading-[45px] tracking-tight">
          {metric.value}
        </span>
        {metric.unit ? (
          <span className="text-h-20 text-green-400">{metric.unit}</span>
        ) : null}
      </div>
    </div>
  );
}

export function ToolbarRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[45px] items-center justify-between gap-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  count,
  className,
}: {
  title: string;
  count?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <h3 className="text-h-20 text-gray-900">{title}</h3>
      {count ? (
        <Badge variant="green" size="M">
          {count}
        </Badge>
      ) : null}
    </div>
  );
}

