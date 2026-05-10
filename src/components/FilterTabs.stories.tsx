import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { FilterTabs } from "./FilterTabs";

type WorkerStatus = "active" | "all" | "inactive";

const workerStatusOptions: { value: WorkerStatus; label: string }[] = [
  { value: "active", label: "활성 17" },
  { value: "all", label: "전체 20" },
  { value: "inactive", label: "비활성 3" },
];

const meta = {
  title: "Components/FilterTabs",
  component: FilterTabs<WorkerStatus>,
  args: {
    options: workerStatusOptions,
    value: "active",
    onChange: fn<(value: WorkerStatus) => void>(),
  },
} satisfies Meta<typeof FilterTabs<WorkerStatus>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState<WorkerStatus>(args.value);

    return (
      <FilterTabs
        {...args}
        value={value}
        onChange={(nextValue) => {
          setValue(nextValue);
          args.onChange(nextValue);
        }}
      />
    );
  },
};

export const AllSelected: Story = {
  args: {
    value: "all",
  },
  render: Default.render,
};
