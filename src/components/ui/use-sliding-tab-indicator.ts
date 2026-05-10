"use client";

import * as React from "react";

type IndicatorOption<T extends string> = { value: T };

type IndicatorStyle = {
  width: number;
  x: number;
};

const slidingTabValueAttribute = "data-sliding-tab-value";

function useSlidingTabIndicator<T extends string>({
  options,
  value,
}: {
  options: IndicatorOption<T>[];
  value: T;
}) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] =
    React.useState<IndicatorStyle | null>(null);

  const updateIndicator = React.useCallback(() => {
    const list = listRef.current;
    if (!list) return;

    const activeTrigger = Array.from(
      list.querySelectorAll<HTMLElement>(`[${slidingTabValueAttribute}]`),
    ).find(
      (trigger) => trigger.getAttribute(slidingTabValueAttribute) === value,
    );

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
      `[${slidingTabValueAttribute}]`,
    );
    triggers.forEach((trigger) => resizeObserver.observe(trigger));

    window.addEventListener("resize", updateIndicator);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [options, updateIndicator]);

  return {
    indicatorStyle,
    listRef,
    slidingTabValueAttribute,
  };
}

export { useSlidingTabIndicator };
