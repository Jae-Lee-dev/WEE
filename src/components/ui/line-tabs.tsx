"use client";

import { SlidingTabTextMask } from "@/components/ui/sliding-tab-text-mask";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSlidingTabIndicator } from "@/components/ui/use-sliding-tab-indicator";
import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: string };

type LineTabsProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

function LineTabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: LineTabsProps<T>) {
  const { indicatorStyle, listRef, slidingTabValueAttribute } =
    useSlidingTabIndicator({ options, value });

  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as T)}>
      <TabsList
        ref={listRef}
        variant="line"
        className={cn("group/line-tabs relative isolate overflow-hidden", className)}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 z-0 h-0.5 rounded-full bg-green-400 transition-[opacity,transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            opacity: indicatorStyle ? 1 : 0,
            width: indicatorStyle?.width ?? 0,
            transform: `translateX(${indicatorStyle?.x ?? 0}px)`,
          }}
        />
        {options.map((option) => (
          <TabsTrigger
            key={option.value}
            variant="line"
            value={option.value}
            className="relative z-10 data-active:border-transparent data-active:text-green-400 data-active:hover:border-transparent data-active:hover:text-green-450 data-active:active:border-transparent data-active:active:text-green-500"
            {...{ [slidingTabValueAttribute]: option.value }}
          >
            {option.label}
          </TabsTrigger>
        ))}
        <SlidingTabTextMask
          className="group-has-[[data-state=active]:hover]/line-tabs:text-green-450 group-has-[[data-state=active]:active]/line-tabs:text-green-500"
          indicatorStyle={indicatorStyle}
          options={options}
          variant="line"
        />
      </TabsList>
    </Tabs>
  );
}

export { LineTabs };
