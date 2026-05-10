"use client";

import * as React from "react";

type IndicatorOption<T extends string> = { value: T };

type IndicatorStyle = {
  width: number;
  x: number;
};

type IndicatorStyleMap = Record<string, IndicatorStyle>;

type IndicatorState = {
  indicatorStyle: IndicatorStyle | null;
  itemStyles: IndicatorStyleMap;
};

const slidingTabValueAttribute = "data-sliding-tab-value";

function areIndicatorStylesEqual(
  currentStyle: IndicatorStyle | null | undefined,
  nextStyle: IndicatorStyle | null | undefined,
) {
  return (
    currentStyle?.width === nextStyle?.width && currentStyle?.x === nextStyle?.x
  );
}

function areIndicatorStyleMapsEqual(
  currentStyles: IndicatorStyleMap,
  nextStyles: IndicatorStyleMap,
) {
  const currentKeys = Object.keys(currentStyles);
  const nextKeys = Object.keys(nextStyles);

  if (currentKeys.length !== nextKeys.length) return false;

  return nextKeys.every((key) =>
    areIndicatorStylesEqual(currentStyles[key], nextStyles[key]),
  );
}

function useSlidingTabIndicator<
  T extends string,
  TElement extends HTMLElement = HTMLDivElement,
>({
  options,
  value,
}: {
  options: IndicatorOption<T>[];
  value: T;
}) {
  const listRef = React.useRef<TElement>(null);
  const [indicatorState, setIndicatorState] = React.useState<IndicatorState>({
    indicatorStyle: null,
    itemStyles: {},
  });
  const optionKey = options.map((option) => option.value).join("\u0000");

  const updateIndicator = React.useCallback(() => {
    const list = listRef.current;
    if (!list) return;

    const triggers = Array.from(
      list.querySelectorAll<HTMLElement>(`[${slidingTabValueAttribute}]`),
    );
    const listRect = list.getBoundingClientRect();
    const nextItemStyles = triggers.reduce<IndicatorStyleMap>(
      (styles, trigger) => {
        const itemValue = trigger.getAttribute(slidingTabValueAttribute);
        if (!itemValue) return styles;

        const triggerRect = trigger.getBoundingClientRect();
        styles[itemValue] = {
          width: triggerRect.width,
          x: triggerRect.left - listRect.left,
        };

        return styles;
      },
      {},
    );

    const nextIndicatorStyle = nextItemStyles[value] ?? null;

    setIndicatorState((currentState) => {
      const itemStyles = areIndicatorStyleMapsEqual(
        currentState.itemStyles,
        nextItemStyles,
      )
        ? currentState.itemStyles
        : nextItemStyles;
      const indicatorStyle = areIndicatorStylesEqual(
        currentState.indicatorStyle,
        nextIndicatorStyle,
      )
        ? currentState.indicatorStyle
        : nextIndicatorStyle;

      if (
        itemStyles === currentState.itemStyles &&
        indicatorStyle === currentState.indicatorStyle
      ) {
        return currentState;
      }

      return { indicatorStyle, itemStyles };
    });
  }, [value]);

  React.useLayoutEffect(() => {
    updateIndicator();
  }, [optionKey, updateIndicator]);

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
  }, [optionKey, updateIndicator]);

  return {
    indicatorStyle: indicatorState.indicatorStyle,
    itemStyles: indicatorState.itemStyles,
    listRef,
    slidingTabValueAttribute,
  };
}

export { useSlidingTabIndicator };
