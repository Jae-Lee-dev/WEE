import type * as React from "react";

import { cn } from "@/lib/utils";

type IndicatorStyle = {
  width: number;
  x: number;
};

type ClipState = {
  clipPath: string;
  measured: boolean;
};

type SlidingTabTextMaskProps = {
  activeClassName: string;
  baseClassName?: string;
  children: React.ReactNode;
  indicatorStyle: IndicatorStyle | null;
  itemStyle?: IndicatorStyle;
  overlayClassName?: string;
};

function getClipState(
  indicatorStyle: IndicatorStyle | null,
  itemStyle: IndicatorStyle | undefined,
): ClipState {
  const collapsedFromLeft = "inset(0 100% 0 0)";
  const collapsedFromRight = "inset(0 0 0 100%)";

  if (!indicatorStyle || !itemStyle) {
    return { clipPath: collapsedFromLeft, measured: false };
  }

  const indicatorStart = indicatorStyle.x;
  const indicatorEnd = indicatorStyle.x + indicatorStyle.width;
  const itemStart = itemStyle.x;
  const itemEnd = itemStyle.x + itemStyle.width;
  const overlapStart = Math.max(indicatorStart, itemStart);
  const overlapEnd = Math.min(indicatorEnd, itemEnd);

  if (overlapEnd <= overlapStart) {
    return {
      clipPath:
        indicatorEnd <= itemStart ? collapsedFromLeft : collapsedFromRight,
      measured: true,
    };
  }

  return {
    clipPath: `inset(0 ${itemEnd - overlapEnd}px 0 ${
      overlapStart - itemStart
    }px)`,
    measured: true,
  };
}

function SlidingTabTextMask({
  activeClassName,
  baseClassName,
  children,
  indicatorStyle,
  itemStyle,
  overlayClassName,
}: SlidingTabTextMaskProps) {
  const { clipPath, measured } = getClipState(indicatorStyle, itemStyle);

  return (
    <>
      <span className={cn("relative z-0", baseClassName)}>{children}</span>
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 z-10 flex whitespace-nowrap transition-[clip-path,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          measured ? "opacity-100" : "opacity-0",
          activeClassName,
          overlayClassName,
        )}
        style={{ clipPath }}
      >
        {children}
      </span>
    </>
  );
}

export { SlidingTabTextMask };
