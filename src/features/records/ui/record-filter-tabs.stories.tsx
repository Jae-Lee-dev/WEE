import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  RecordFilterTabs,
  type RecordSignalFilterId,
  type RecordWorkTypeFilterId,
} from "@/features/records/ui/record-filter-tabs";

const meta = {
  title: "Features/Records/RecordFilterTabs",
  component: RecordFilterTabs,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof RecordFilterTabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WorkAndSignalAxes: Story = {
  args: {
    onSignalFilterChange: () => undefined,
    onWorkTypeFilterChange: () => undefined,
    signalFilterId: "all",
    workTypeFilterId: "all",
  },
  render: function Render() {
    const [workTypeFilterId, setWorkTypeFilterId] =
      useState<RecordWorkTypeFilterId>("all");
    const [signalFilterId, setSignalFilterId] =
      useState<RecordSignalFilterId>("all");

    return (
      <RecordFilterTabs
        workTypeFilterId={workTypeFilterId}
        signalFilterId={signalFilterId}
        onWorkTypeFilterChange={setWorkTypeFilterId}
        onSignalFilterChange={setSignalFilterId}
      />
    );
  },
};
