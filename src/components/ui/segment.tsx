"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSlidingTabIndicator } from "@/components/ui/use-sliding-tab-indicator";
import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: string };

type SegmentProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

function Segment<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentProps<T>) {
  const { indicatorStyle, listRef, slidingTabValueAttribute } =
    useSlidingTabIndicator({ options, value });

  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as T)}>
      <TabsList
        ref={listRef}
        variant="segment"
        className={cn(
          "relative isolate inline-flex items-center overflow-hidden",
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-1 top-1 bottom-1 z-0 rounded-[10px] bg-green-400 transition-[opacity,transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
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
            {...{ [slidingTabValueAttribute]: option.value }}
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export { Segment };
