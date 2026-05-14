import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { cn } from "@/shared/lib/utils";
import {
  scheduleTimelineDays,
  scheduleTimelineTimeSlots,
  type ScheduleTimelineDay,
  type ScheduleTimelineBlock,
} from "../model/schedule-fixtures";
import {
  orderTimelineDaysSundayFirst,
  TimelineBlockText,
  TimelineGridFrame,
} from "./timeline-grid-frame";
import { parseTimelineBlocks } from "./timeline-block-parser";

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

const storyDays = orderTimelineDaysSundayFirst(scheduleTimelineDays);

const storyBlocks = [
  {
    id: "lab-admin",
    dayId: "sun",
    label: "연구실 행정",
    locationName: "잠실 C학원",
    tone: "green",
    time: "09:00~12:00",
    startHour: 9,
    endHour: 12,
    worker: "미배정",
  },
  {
    id: "chemistry-g",
    dayId: "mon",
    label: "화학 G반",
    locationName: "서초 B학원",
    tone: "orange",
    time: "10:00~12:00",
    startHour: 10,
    endHour: 12,
    worker: "미배정",
  },
  {
    id: "physics-f",
    dayId: "mon",
    label: "물리 F반",
    locationName: "대치 A학원",
    tone: "pink",
    time: "13:00~15:00",
    startHour: 13,
    endHour: 15,
    worker: "미배정",
  },
  {
    id: "korean-e",
    dayId: "mon",
    label: "국어 E반",
    locationName: "송파 E학원",
    tone: "blue",
    time: "14:00~16:00",
    startHour: 14,
    endHour: 16,
    worker: "미배정",
  },
  {
    id: "english-c",
    dayId: "mon",
    label: "영어 C반",
    locationName: "잠실 C학원",
    tone: "green",
    time: "19:00~21:00",
    startHour: 19,
    endHour: 21,
    worker: "미배정",
  },
  {
    id: "korean-e-wed",
    dayId: "wed",
    label: "국어 E반",
    locationName: "송파 E학원",
    tone: "blue",
    time: "14:00~16:00",
    startHour: 14,
    endHour: 16,
    worker: "미배정",
  },
] satisfies readonly ScheduleTimelineBlock[];

const toneClassNames: Record<ScheduleTimelineBlock["tone"], string> = {
  green: "border-green-400 bg-green-100",
  orange: "border-orange-400 bg-orange-100",
  pink: "border-red-500 bg-red-50",
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
  const { dayLayouts } = parseTimelineBlocks({
    blocks: storyBlocks,
    days: storyDays,
    layout: {
      blockHeight: 46,
      laneStride: 48,
      topOffset: 1,
      xInset: 1,
    },
    timeSlots: scheduleTimelineTimeSlots,
  });
  const blocks =
    dayLayouts.find((layout) => layout.day.id === day.id)?.blocks ?? [];

  return blocks.map(({ block, style }) => (
    <div
      aria-label={`${block.label} ${block.locationName}`}
      className={cn(
        "absolute z-10 flex h-[46px] min-w-0 flex-col justify-center overflow-hidden rounded-[6px] border px-1.5 py-1 text-left",
        toneClassNames[block.tone],
      )}
      key={block.id}
      role="gridcell"
      style={style}
    >
      <TimelineBlockText title={block.label} subtitle={block.locationName} />
    </div>
  ));
}
