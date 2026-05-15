"use client";

import { SlidingTabTextMask } from "@/shared/ui/sliding-tab-text-mask";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useSlidingTabIndicator } from "@/shared/ui/use-sliding-tab-indicator";
import { cn } from "@/shared/lib/utils";

type Option<T extends string> = { value: T; label: string };

type FilterTabTone = "green" | "orange" | "pink" | "blue" | "grey";

const indicatorToneClassNames: Record<FilterTabTone, string> = {
  green: "bg-green-400",
  orange: "bg-orange-400",
  pink: "bg-red-500",
  blue: "bg-blue-500",
  grey: "bg-gray-500",
};

type FilterTabsProps<T extends string> = {
  options: (Option<T> & { tone?: FilterTabTone })[];
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
  const selectedTone =
    options.find((option) => option.value === value)?.tone ?? "green";

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
            "pointer-events-none absolute left-0 top-1 bottom-1 z-0 rounded-full shadow-sm transition-colors duration-150 ease-out",
            indicatorToneClassNames[selectedTone],
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

export { FilterTabs, type FilterTabTone };
