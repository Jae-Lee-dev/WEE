"use client";

import { SlidingTabTextMask } from "@/shared/ui/sliding-tab-text-mask";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useSlidingTabIndicator } from "@/shared/ui/use-sliding-tab-indicator";
import { cn } from "@/shared/lib/utils";
import type { ControlSize } from "@/shared/ui/control-size";

type Option<T extends string> = { value: T; label: string; testId?: string };

type SegmentProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  disabled?: boolean;
  size?: ControlSize;
};

function Segment<T extends string>({
  disabled = false,
  options,
  size = "default",
  value,
  onChange,
  className,
}: SegmentProps<T>) {
  const { indicatorStyle, itemStyles, listRef, slidingTabValueAttribute } =
    useSlidingTabIndicator({ options, value });

  return (
    <Tabs
      value={value}
      onValueChange={disabled ? undefined : (next) => onChange(next as T)}
    >
      <TabsList
        ref={listRef}
        variant="segment"
        className={cn(
          "relative isolate inline-flex items-center overflow-hidden",
          segmentSizeClassName[size],
          disabled && "opacity-60",
          className,
        )}
        data-size={size}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-1 top-1 bottom-1 z-0 rounded-[10px] bg-green-400 transition-opacity duration-150 ease-out",
            indicatorStyle ? "opacity-100" : "opacity-0",
          )}
          style={{
            width: indicatorStyle?.width ?? 0,
            transform: `translateX(${indicatorStyle ? indicatorStyle.x - 4 : 0}px)`,
          }}
        />
        {options.map((option) => (
          <TabsTrigger
            key={option.value}
            variant="segment"
            value={option.value}
            disabled={disabled}
            data-testid={option.testId}
            {...{ [slidingTabValueAttribute]: option.value }}
          >
            <SlidingTabTextMask
              activeClassName="text-white"
              indicatorStyle={indicatorStyle}
              itemStyle={itemStyles[option.value]}
              overlayClassName="items-center justify-center"
            >
              {option.label}
            </SlidingTabTextMask>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

const segmentSizeClassName: Record<ControlSize, string> = {
  sm: "h-[34px] min-h-[34px] [&_[data-slot=tabs-trigger]]:h-[26px] [&_[data-slot=tabs-trigger]]:rounded-[8px] [&_[data-slot=tabs-trigger]]:px-2 [&_[data-slot=tabs-trigger]]:py-0 [&_[data-slot=tabs-trigger]]:text-label-14-medium",
  default:
    "h-[38px] min-h-[38px] [&_[data-slot=tabs-trigger]]:h-[30px] [&_[data-slot=tabs-trigger]]:rounded-[8px] [&_[data-slot=tabs-trigger]]:px-3 [&_[data-slot=tabs-trigger]]:py-0 [&_[data-slot=tabs-trigger]]:text-label-18",
  lg: "h-11 min-h-11 [&_[data-slot=tabs-trigger]]:h-9 [&_[data-slot=tabs-trigger]]:rounded-[8px] [&_[data-slot=tabs-trigger]]:px-4 [&_[data-slot=tabs-trigger]]:py-0 [&_[data-slot=tabs-trigger]]:text-h-18-semibold",
  xl: "h-12 min-h-12 [&_[data-slot=tabs-trigger]]:h-10 [&_[data-slot=tabs-trigger]]:rounded-[8px] [&_[data-slot=tabs-trigger]]:px-4 [&_[data-slot=tabs-trigger]]:py-0 [&_[data-slot=tabs-trigger]]:text-h-18-semibold",
};

export { Segment };
