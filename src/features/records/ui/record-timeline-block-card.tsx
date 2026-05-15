"use client";

import type { CSSProperties } from "react";
import { cn } from "@/shared/lib/utils";
import type {
  RecordTimelineBlock,
  RecordTimelineBlockKind,
  RecordsTone,
} from "../model/records-fixtures";

const blockToneClassNames: Record<RecordsTone, string> = {
  green: "border-green-400 bg-green-100 text-gray-900",
  orange: "border-orange-400 bg-orange-100 text-gray-900",
  pink: "border-red-500 bg-red-50 text-gray-900",
  blue: "border-blue-500 bg-blue-50 text-gray-900",
  grey: "border-gray-500 bg-gray-50 text-gray-900",
};

const blockToneBackgroundStyles: Record<RecordsTone, string> = {
  green: "var(--color-green-100)",
  orange: "var(--color-orange-100)",
  pink: "var(--color-red-50)",
  blue: "var(--color-blue-50)",
  grey: "var(--color-gray-50)",
};

const blockToneBorderStyles: Record<RecordsTone, string> = {
  green: "var(--color-green-400)",
  orange: "var(--color-orange-400)",
  pink: "var(--color-red-500)",
  blue: "var(--color-blue-500)",
  grey: "var(--color-gray-500)",
};

const selectedBlockToneClassNames: Record<RecordsTone, string> = {
  green: "border-green-400 bg-green-400 text-white",
  orange: "border-orange-400 bg-orange-400 text-white",
  pink: "border-red-500 bg-red-500 text-white",
  blue: "border-blue-500 bg-blue-500 text-white",
  grey: "border-gray-500 bg-gray-500 text-white",
};

const selectedBlockToneBackgroundStyles: Record<RecordsTone, string> = {
  green: "var(--color-green-400)",
  orange: "var(--color-orange-400)",
  pink: "var(--color-red-500)",
  blue: "var(--color-blue-500)",
  grey: "var(--color-gray-500)",
};

const selectedBlockToneBorderStyles: Record<RecordsTone, string> = {
  green: "var(--color-green-400)",
  orange: "var(--color-orange-400)",
  pink: "var(--color-red-500)",
  blue: "var(--color-blue-500)",
  grey: "var(--color-gray-500)",
};

const focusRingToneClassNames: Record<RecordsTone, string> = {
  green: "focus-visible:ring-green-200",
  orange: "focus-visible:ring-orange-100",
  pink: "focus-visible:ring-red-100",
  blue: "focus-visible:ring-blue-100",
  grey: "focus-visible:ring-gray-200",
};

export const recordBlockSignalToneByKind: Record<
  RecordTimelineBlockKind,
  RecordsTone
> = {
  normal: "green",
  "location-anomaly": "pink",
  overtime: "blue",
  correction: "orange",
};

type RecordTimelineBlockCardProps = {
  block: RecordTimelineBlock;
  className?: string;
  lane?: number;
  onSelectBlock?: (block: RecordTimelineBlock) => void;
  selected?: boolean;
  style?: CSSProperties;
  testId?: string;
};

function RecordTimelineBlockCard({
  block,
  className,
  lane,
  onSelectBlock,
  selected = false,
  style,
  testId,
}: RecordTimelineBlockCardProps) {
  const selectedStateId = block.selectedStateId;
  const selectable = Boolean(selectedStateId && onSelectBlock);
  const blockClassName = cn(
    "flex min-w-0 flex-col justify-center overflow-hidden rounded-[6px] border px-1.5 py-1 text-left tracking-normal transition-colors duration-150 ease-out",
    selected
      ? selectedBlockToneClassNames[block.tone]
      : blockToneClassNames[block.tone],
    selectable &&
      cn(
        "cursor-pointer hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        focusRingToneClassNames[block.tone],
      ),
    className,
  );
  const combinedStyle = {
    ...style,
    ...getRecordTimelineBlockBackgroundStyle(block, selected),
  };
  const content = (
    <RecordTimelineBlockText
      dutyName={block.dutyName}
      selected={selected}
      timeText={`${block.startTime}~${block.endTime}`}
      workerName={block.workerName}
    />
  );

  if (selectable && selectedStateId && onSelectBlock) {
    return (
      <button
        type="button"
        aria-label={`${block.workerName} ${block.dutyName} ${block.startTime}~${block.endTime}`}
        aria-pressed={selected}
        className={blockClassName}
        data-record-block-id={block.id}
        data-record-signal-kinds={block.signalKinds.join(" ")}
        data-testid={
          testId ??
          (selectedStateId === "normal-selected"
            ? "record-block-normal"
            : "record-block-anomaly")
        }
        onClick={() => onSelectBlock(block)}
        style={combinedStyle}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      aria-label={`${block.workerName} ${block.dutyName} ${block.startTime}~${block.endTime}`}
      className={blockClassName}
      data-lane={lane}
      data-record-block-id={block.id}
      data-record-signal-kinds={block.signalKinds.join(" ")}
      role="gridcell"
      style={combinedStyle}
    >
      {content}
    </div>
  );
}

function getRecordTimelineBlockBackgroundStyle(
  block: RecordTimelineBlock,
  selected: boolean,
): CSSProperties {
  const signalTones = block.signalKinds.map(
    (kind) => recordBlockSignalToneByKind[kind],
  );

  if (signalTones.length < 2) {
    return {};
  }

  const firstTone = signalTones[0];
  const secondTone = signalTones[1];
  const toneBackgroundStyles = selected
    ? selectedBlockToneBackgroundStyles
    : blockToneBackgroundStyles;
  const toneBorderStyles = selected
    ? selectedBlockToneBorderStyles
    : blockToneBorderStyles;
  const splitGradient = `linear-gradient(to bottom right, ${toneBackgroundStyles[firstTone]} 0 49.5%, ${toneBackgroundStyles[secondTone]} 50.5% 100%)`;
  const borderGradient = `linear-gradient(to bottom right, ${toneBorderStyles[firstTone]} 0 49.5%, ${toneBorderStyles[secondTone]} 50.5% 100%)`;

  return {
    backgroundClip: "padding-box, border-box",
    backgroundImage: `${splitGradient}, ${borderGradient}`,
    backgroundOrigin: "border-box",
    borderColor: "transparent",
  };
}

function RecordTimelineBlockText({
  dutyName,
  selected = false,
  timeText,
  workerName,
}: {
  dutyName: string;
  selected?: boolean;
  timeText: string;
  workerName: string;
}) {
  const secondaryClassName = cn(
    "truncate text-[11px] leading-3 tracking-normal",
    selected ? "text-white/90" : "text-gray-800",
  );

  return (
    <>
      <span className="truncate text-[11px] leading-3 font-semibold tracking-normal">
        {workerName}
      </span>
      <span className={secondaryClassName}>{dutyName}</span>
      <span className={secondaryClassName}>{timeText}</span>
    </>
  );
}

export { RecordTimelineBlockCard, getRecordTimelineBlockBackgroundStyle };
