"use client";

import { SlidingTabTextMask } from "@/components/ui/sliding-tab-text-mask";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSlidingTabIndicator } from "@/components/ui/use-sliding-tab-indicator";
import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: string };

type FilterTabsProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: FilterTabsProps<T>) {
  const { indicatorStyle, itemStyles, listRef, slidingTabValueAttribute } =
    useSlidingTabIndicator({ options, value });

  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as T)}>
      <TabsList
        ref={listRef}
        variant="filter"
        className={cn(
          "relative isolate inline-flex items-center overflow-hidden",
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-0 top-1 bottom-1 z-0 rounded-full bg-green-400 shadow-sm transition-opacity duration-150 ease-out",
            indicatorStyle ? "opacity-100" : "opacity-0",
          )}
          style={{
            width: indicatorStyle?.width ?? 0,
            transform: `translateX(${indicatorStyle?.x ?? 0}px)`,
          }}
        />
        {options.map((option) => (
          <TabsTrigger
            key={option.value}
            variant="filter"
            value={option.value}
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

export { FilterTabs };
