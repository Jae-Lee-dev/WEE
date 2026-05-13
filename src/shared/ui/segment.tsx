"use client";

import { SlidingTabTextMask } from "@/shared/ui/sliding-tab-text-mask";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useSlidingTabIndicator } from "@/shared/ui/use-sliding-tab-indicator";
import { cn } from "@/shared/lib/utils";

type Option<T extends string> = { value: T; label: string };

type SegmentProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  disabled?: boolean;
};

function Segment<T extends string>({
  disabled = false,
  options,
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
          disabled && "opacity-60",
          className,
        )}
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

export { Segment };
