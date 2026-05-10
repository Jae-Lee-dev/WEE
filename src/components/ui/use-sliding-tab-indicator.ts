"use client";

import * as React from "react";

type IndicatorOption<T extends string> = { value: T };

type IndicatorStyle = {
  width: number;
  x: number;
};

type IndicatorStyleMap = Record<string, IndicatorStyle>;

type IndicatorState = {
  itemStyles: IndicatorStyleMap;
  targetStyle: IndicatorStyle | null;
};

const slidingTabValueAttribute = "data-sliding-tab-value";
const defaultAnimationDurationMs = 300;

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

function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3;
}

function interpolateIndicatorStyle(
  fromStyle: IndicatorStyle,
  toStyle: IndicatorStyle,
  progress: number,
): IndicatorStyle {
  return {
    width: fromStyle.width + (toStyle.width - fromStyle.width) * progress,
    x: fromStyle.x + (toStyle.x - fromStyle.x) * progress,
  };
}

function measureItemStyles(list: HTMLElement) {
  const listRect = list.getBoundingClientRect();
  const triggers = Array.from(
    list.querySelectorAll<HTMLElement>(`[${slidingTabValueAttribute}]`),
  );

  return triggers.reduce<IndicatorStyleMap>((styles, trigger) => {
    const itemValue = trigger.getAttribute(slidingTabValueAttribute);
    if (!itemValue) return styles;

    const triggerRect = trigger.getBoundingClientRect();
    styles[itemValue] = {
      width: triggerRect.width,
      x: triggerRect.left - listRect.left,
    };

    return styles;
  }, {});
}

function useSlidingTabIndicator<
  T extends string,
  TElement extends HTMLElement = HTMLDivElement,
>({
  animationDurationMs = defaultAnimationDurationMs,
  options,
  value,
}: {
  animationDurationMs?: number;
  options: IndicatorOption<T>[];
  value: T;
}) {
  const listRef = React.useRef<TElement>(null);
  const [indicatorState, setIndicatorState] = React.useState<IndicatorState>({
    itemStyles: {},
    targetStyle: null,
  });
  const [animatedIndicatorStyle, setAnimatedIndicatorStyle] =
    React.useState<IndicatorStyle | null>(null);
  const animatedIndicatorStyleRef = React.useRef<IndicatorStyle | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);
  const optionKey = options.map((option) => option.value).join("\u0000");
  const targetIndicatorStyle = indicatorState.targetStyle;

  const publishAnimatedStyle = React.useCallback(
    (nextStyle: IndicatorStyle | null) => {
      animatedIndicatorStyleRef.current = nextStyle;
      setAnimatedIndicatorStyle((currentStyle) => {
        if (areIndicatorStylesEqual(currentStyle, nextStyle)) {
          return currentStyle;
        }

        return nextStyle;
      });
    },
    [],
  );

  const updateIndicator = React.useCallback(() => {
    const list = listRef.current;
    if (!list) return;

    const nextItemStyles = measureItemStyles(list);
    const nextTargetStyle = nextItemStyles[value] ?? null;

    setIndicatorState((currentState) => {
      const itemStyles = areIndicatorStyleMapsEqual(
        currentState.itemStyles,
        nextItemStyles,
      )
        ? currentState.itemStyles
        : nextItemStyles;
      const targetStyle = areIndicatorStylesEqual(
        currentState.targetStyle,
        nextTargetStyle,
      )
        ? currentState.targetStyle
        : nextTargetStyle;

      if (
        itemStyles === currentState.itemStyles &&
        targetStyle === currentState.targetStyle
      ) {
        return currentState;
      }

      return { itemStyles, targetStyle };
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

  React.useEffect(() => {
    const cancelAnimationFrame = () => {
      if (animationFrameRef.current === null) return;

      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    };

    const schedulePublish = (nextStyle: IndicatorStyle | null) => {
      animationFrameRef.current = window.requestAnimationFrame(() => {
        publishAnimatedStyle(nextStyle);
        animationFrameRef.current = null;
      });
    };

    cancelAnimationFrame();

    const targetStyle = targetIndicatorStyle;

    if (!targetStyle) {
      animatedIndicatorStyleRef.current = null;
      schedulePublish(null);
      return cancelAnimationFrame;
    }

    const fromStyle = animatedIndicatorStyleRef.current;

    if (!fromStyle || animationDurationMs <= 0) {
      animatedIndicatorStyleRef.current = targetStyle;
      schedulePublish(targetStyle);
      return cancelAnimationFrame;
    }

    if (areIndicatorStylesEqual(fromStyle, targetStyle)) {
      animatedIndicatorStyleRef.current = targetStyle;
      return cancelAnimationFrame;
    }

    const startedAt = performance.now();

    const step = (time: number) => {
      const progress = Math.min((time - startedAt) / animationDurationMs, 1);
      const easedProgress = easeOutCubic(progress);
      const nextStyle = interpolateIndicatorStyle(
        fromStyle,
        targetStyle,
        easedProgress,
      );

      if (progress >= 1) {
        publishAnimatedStyle(targetStyle);
        animationFrameRef.current = null;
        return;
      }

      publishAnimatedStyle(nextStyle);
      animationFrameRef.current = window.requestAnimationFrame(step);
    };

    animationFrameRef.current = window.requestAnimationFrame(step);

    return cancelAnimationFrame;
  }, [
    animationDurationMs,
    publishAnimatedStyle,
    targetIndicatorStyle,
  ]);

  return {
    indicatorStyle: animatedIndicatorStyle,
    itemStyles: indicatorState.itemStyles,
    listRef,
    slidingTabValueAttribute,
  };
}

export { useSlidingTabIndicator };
