import type * as React from "react";

import { cn } from "@/lib/utils";

type SlidingTabOption<T extends string> = {
  value: T;
  label: React.ReactNode;
};

type SlidingTabTextMaskProps<T extends string> = {
  className?: string;
  indicatorStyle: { width: number; x: number } | null;
  options: SlidingTabOption<T>[];
  variant: "filter" | "line" | "segment";
};

function SlidingTabTextMask<T extends string>({
  className,
  indicatorStyle,
  options,
  variant,
}: SlidingTabTextMaskProps<T>) {
  const clipPath = indicatorStyle
    ? `inset(0 calc(100% - ${indicatorStyle.x + indicatorStyle.width}px) 0 ${indicatorStyle.x}px)`
    : "inset(0 100% 0 0)";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 z-20 inline-flex items-center text-white transition-[clip-path,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        indicatorStyle ? "opacity-100" : "opacity-0",
        variant === "filter" && "gap-1.5 p-1",
        variant === "line" && "items-start gap-8 text-green-400",
        variant === "segment" && "p-1",
        className,
      )}
      style={{ clipPath }}
    >
      {options.map((option) => (
        <span
          key={option.value}
          className={cn(
            "inline-flex shrink-0 items-center justify-center whitespace-nowrap",
            variant === "filter" && "rounded-full px-2.5 py-1 text-label-18",
            variant === "line" &&
              "flex h-[34px] items-start border-b-2 border-transparent text-h-18-semibold",
            variant === "segment" &&
              "flex-1 rounded-[10px] px-4 py-3 text-h-18-semibold",
          )}
        >
          {option.label}
        </span>
      ))}
    </div>
  );
}

export { SlidingTabTextMask };
