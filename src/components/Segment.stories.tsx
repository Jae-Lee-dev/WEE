import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { Segment } from "./Segment";

type SegmentValue = "hourly" | "monthly";

const paymentOptions: { value: SegmentValue; label: string }[] = [
  { value: "hourly", label: "시급" },
  { value: "monthly", label: "월급" },
];

const meta = {
  title: "Components/Segment",
  component: Segment<SegmentValue>,
  args: {
    options: paymentOptions,
    value: "hourly",
    onChange: fn<(value: SegmentValue) => void>(),
    className: "w-[601px] max-w-full",
  },
} satisfies Meta<typeof Segment<SegmentValue>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState<SegmentValue>(args.value);

    return (
      <Segment
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

export const MonthlySelected: Story = {
  args: {
    value: "monthly",
  },
  render: Default.render,
};
