import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RecordTimelineBlockCard } from "@/features/records/ui/record-timeline-block-card";
import type {
  RecordTimelineBlock,
  RecordTimelineBlockKind,
  RecordsTone,
} from "../model/records-fixtures";

const meta = {
  title: "Features/Records/RecordTimelineBlockCard",
  component: RecordTimelineBlockCard,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof RecordTimelineBlockCard>;

export default meta;

type Story = StoryObj<typeof meta>;

function createBlock({
  id,
  dutyName,
  endTime = "21:00",
  kind,
  selectedStateId = "normal-selected",
  signalKinds,
  startTime = "19:00",
  tone,
  workerName,
}: {
  dutyName: string;
  endTime?: string;
  id: string;
  kind: RecordTimelineBlockKind;
  selectedStateId?: RecordTimelineBlock["selectedStateId"];
  signalKinds: readonly RecordTimelineBlockKind[];
  startTime?: string;
  tone: RecordsTone;
  workerName: string;
}): RecordTimelineBlock {
  return {
    id,
    dateKey: "2026-05-13",
    dayId: "wed",
    dutyName,
    endHour: Number(endTime.slice(0, 2)),
    endMinute: Number(endTime.slice(3, 5)),
    endTime,
    kind,
    locationName: "별관 자습실",
    selectedStateId,
    signalKinds,
    startHour: Number(startTime.slice(0, 2)),
    startMinute: Number(startTime.slice(3, 5)),
    startTime,
    tone,
    workerName,
  };
}

const blocks = [
  createBlock({
    id: "regular",
    workerName: "김서연",
    dutyName: "수학 A반",
    kind: "normal",
    signalKinds: ["normal"],
    tone: "green",
  }),
  createBlock({
    id: "regular-anomaly",
    workerName: "송현우",
    dutyName: "물리 F반",
    kind: "location-anomaly",
    selectedStateId: "anomaly-step-1",
    signalKinds: ["location-anomaly"],
    tone: "pink",
  }),
  createBlock({
    id: "regular-correction",
    workerName: "이하은",
    dutyName: "영어 C반",
    kind: "correction",
    signalKinds: ["correction"],
    tone: "orange",
  }),
  createBlock({
    id: "correction-anomaly",
    workerName: "정수현",
    dutyName: "국어 D반",
    kind: "correction",
    selectedStateId: "anomaly-step-1",
    signalKinds: ["correction", "location-anomaly"],
    tone: "orange",
  }),
  createBlock({
    id: "overtime-pending",
    workerName: "강태우",
    dutyName: "추가근무 신청",
    endTime: "21:30",
    kind: "overtime",
    signalKinds: ["overtime"],
    startTime: "21:00",
    tone: "blue",
  }),
  createBlock({
    id: "overtime-anomaly",
    workerName: "박지민",
    dutyName: "질문 응대 연장",
    endTime: "22:00",
    kind: "overtime",
    selectedStateId: "anomaly-step-1",
    signalKinds: ["overtime", "location-anomaly"],
    startTime: "21:20",
    tone: "blue",
  }),
] satisfies readonly RecordTimelineBlock[];

export const Variants: Story = {
  args: {
    block: blocks[0],
  },
  render: () => (
    <div className="grid w-[560px] grid-cols-2 gap-3">
      {blocks.map((block) => (
        <RecordTimelineBlockCard
          key={block.id}
          block={block}
          className="h-[52px]"
          onSelectBlock={() => undefined}
        />
      ))}
    </div>
  ),
};

export const SelectedStates: Story = {
  args: {
    block: blocks[0],
  },
  render: () => (
    <div className="grid w-[560px] grid-cols-2 gap-3">
      {blocks.map((block) => (
        <RecordTimelineBlockCard
          key={block.id}
          block={block}
          className="h-[52px]"
          selected
          onSelectBlock={() => undefined}
        />
      ))}
    </div>
  ),
};

export const InteractiveSelection: Story = {
  args: {
    block: blocks[0],
  },
  render: function Render() {
    const [selectedBlockId, setSelectedBlockId] = useState(blocks[4].id);

    return (
      <div className="grid w-[560px] grid-cols-2 gap-3">
        {blocks.map((block) => (
          <RecordTimelineBlockCard
            key={block.id}
            block={block}
            className="h-[52px]"
            selected={selectedBlockId === block.id}
            onSelectBlock={(nextBlock) => setSelectedBlockId(nextBlock.id)}
          />
        ))}
      </div>
    );
  },
};
