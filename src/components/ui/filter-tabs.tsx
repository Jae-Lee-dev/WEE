"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const listRef = React.useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = React.useState<{
    width: number;
    x: number;
  } | null>(null);

  const updateIndicator = React.useCallback(() => {
    const list = listRef.current;
    if (!list) return;

    const activeTrigger = Array.from(
      list.querySelectorAll<HTMLElement>("[data-filter-tab-value]"),
    ).find((trigger) => trigger.dataset.filterTabValue === value);

    if (!activeTrigger) {
      setIndicatorStyle(null);
      return;
    }

    const listRect = list.getBoundingClientRect();
    const triggerRect = activeTrigger.getBoundingClientRect();

    const nextStyle = {
      width: triggerRect.width,
      x: triggerRect.left - listRect.left,
    };

    setIndicatorStyle((currentStyle) => {
      if (
        currentStyle?.width === nextStyle.width &&
        currentStyle.x === nextStyle.x
      ) {
        return currentStyle;
      }

      return nextStyle;
    });
  }, [value]);

  React.useLayoutEffect(() => {
    updateIndicator();
  }, [options, updateIndicator]);

  React.useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const resizeObserver = new ResizeObserver(updateIndicator);
    resizeObserver.observe(list);

    const triggers = list.querySelectorAll<HTMLElement>(
      "[data-filter-tab-value]",
    );
    triggers.forEach((trigger) => resizeObserver.observe(trigger));

    window.addEventListener("resize", updateIndicator);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [options, updateIndicator]);

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
            "pointer-events-none absolute left-0 top-1 bottom-1 z-0 rounded-full bg-green-400 shadow-sm transition-[opacity,transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
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
            data-filter-tab-value={option.value}
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export { FilterTabs };
