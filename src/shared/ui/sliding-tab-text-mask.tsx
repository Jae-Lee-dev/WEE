import type * as React from "react";

import { cn } from "@/shared/lib/utils";

type IndicatorStyle = {
  width: number;
  x: number;
};

type SlidingTabTextMaskProps = {
  activeClassName: string;
  baseClassName?: string;
  children: React.ReactNode;
  indicatorStyle: IndicatorStyle | null;
  itemStyle?: IndicatorStyle;
  overlayClassName?: string;
};

function getOverlapClipPath(
  indicatorStyle: IndicatorStyle | null,
  itemStyle: IndicatorStyle | undefined,
): string | null {
  if (!indicatorStyle || !itemStyle) {
    return null;
  }

  const indicatorStart = indicatorStyle.x;
  const indicatorEnd = indicatorStyle.x + indicatorStyle.width;
  const itemStart = itemStyle.x;
  const itemEnd = itemStyle.x + itemStyle.width;
  const overlapStart = Math.max(indicatorStart, itemStart);
  const overlapEnd = Math.min(indicatorEnd, itemEnd);

  if (overlapEnd <= overlapStart) {
    return null;
  }

  const rightInset = Math.max(0, itemEnd - overlapEnd);
  const leftInset = Math.max(0, overlapStart - itemStart);

  return `inset(0 ${rightInset}px 0 ${leftInset}px)`;
}

function SlidingTabTextMask({
  activeClassName,
  baseClassName,
  children,
  indicatorStyle,
  itemStyle,
  overlayClassName,
}: SlidingTabTextMaskProps) {
  const clipPath = getOverlapClipPath(indicatorStyle, itemStyle);

  return (
    <>
      <span className={cn("relative z-0", baseClassName)}>{children}</span>
      {clipPath ? (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 z-10 flex whitespace-nowrap transition-colors duration-150 ease-out",
            activeClassName,
            overlayClassName,
          )}
          style={{ clipPath }}
        >
          {children}
        </span>
      ) : null}
    </>
  );
}

export { SlidingTabTextMask };
