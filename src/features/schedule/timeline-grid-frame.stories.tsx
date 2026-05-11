import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { cn } from "@/lib/utils";
import {
  scheduleTimelineDays,
  scheduleTimelineTimeSlots,
  type ScheduleTimelineDay,
  type ScheduleTimelineDayId,
} from "./schedule-fixtures";
import {
  orderTimelineDaysSundayFirst,
  TimelineBlockText,
  TimelineGridFrame,
} from "./timeline-grid-frame";

const meta = {
  title: "Features/Schedule/TimelineGridFrame",
  component: TimelineGridFrame,
  args: {
    ariaLabel: "스토리북 타임라인",
    days: scheduleTimelineDays,
    renderBlocks: () => null,
    timeSlots: scheduleTimelineTimeSlots,
  },
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof TimelineGridFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

type StoryBlock = {
  dayId: ScheduleTimelineDayId;
  endHour: number;
  id: string;
  lane?: number;
  subtitle: string;
  title: string;
  tone: "green" | "orange" | "red" | "blue";
  startHour: number;
};

const storyDays = orderTimelineDaysSundayFirst(scheduleTimelineDays);

const storyBlocks: readonly StoryBlock[] = [
  {
    id: "lab-admin",
    dayId: "sun",
    title: "연구실 행정",
    subtitle: "잠실 C학원",
    tone: "green",
    startHour: 9,
    endHour: 12,
  },
  {
    id: "chemistry-g",
    dayId: "mon",
    title: "화학 G반",
    subtitle: "서초 B학원",
    tone: "orange",
    startHour: 10,
    endHour: 12,
  },
  {
    id: "physics-f",
    dayId: "mon",
    title: "물리 F반",
    subtitle: "대치 A학원",
    tone: "red",
    startHour: 13,
    endHour: 15,
  },
  {
    id: "korean-e",
    dayId: "mon",
    title: "국어 E반",
    subtitle: "송파 E학원",
    tone: "blue",
    startHour: 14,
    endHour: 16,
    lane: 1,
  },
  {
    id: "english-c",
    dayId: "mon",
    title: "영어 C반",
    subtitle: "잠실 C학원",
    tone: "green",
    startHour: 19,
    endHour: 21,
  },
  {
    id: "korean-e-wed",
    dayId: "wed",
    title: "국어 E반",
    subtitle: "송파 E학원",
    tone: "blue",
    startHour: 14,
    endHour: 16,
  },
];

const toneClassNames: Record<StoryBlock["tone"], string> = {
  green: "border-green-400 bg-green-100",
  orange: "border-orange-400 bg-orange-100",
  red: "border-red-500 bg-red-50",
  blue: "border-blue-500 bg-blue-50",
};

export const WeeklyDutyTimeline: Story = {
  render: () => (
    <div className="h-[640px] w-[1160px] bg-gray-50 p-6">
      <TimelineGridFrame
        ariaLabel="스토리북 타임라인"
        className="h-full"
        days={storyDays}
        renderBlocks={(day) => <StoryBlocks day={day} />}
        timeSlots={scheduleTimelineTimeSlots}
      />
    </div>
  ),
};

function StoryBlocks({ day }: { day: ScheduleTimelineDay }) {
  return storyBlocks
    .filter((block) => block.dayId === day.id)
    .map((block) => (
      <div
        aria-label={`${block.title} ${block.subtitle}`}
        className={cn(
          "absolute z-10 flex h-[54px] min-w-0 flex-col justify-center overflow-hidden rounded-[6px] border px-2 text-left",
          toneClassNames[block.tone],
        )}
        key={block.id}
        role="gridcell"
        style={getStoryBlockStyle(block)}
      >
        <TimelineBlockText title={block.title} subtitle={block.subtitle} />
      </div>
    ));
}

function getStoryBlockStyle(block: StoryBlock): CSSProperties {
  const timelineStartHour = Number(scheduleTimelineTimeSlots[0]);
  const startColumn = block.startHour - timelineStartHour;
  const spanColumns = block.endHour - block.startHour;

  return {
    left: `calc(${(startColumn / scheduleTimelineTimeSlots.length) * 100}% + 1px)`,
    top: 1 + (block.lane ?? 0) * 56,
    width: `calc(${(spanColumns / scheduleTimelineTimeSlots.length) * 100}% - 2px)`,
  };
}
