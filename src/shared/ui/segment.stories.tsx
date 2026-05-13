import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Segment } from "@/shared/ui/segment";

const meta = {
  title: "Design System/UI/Segment",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const PayType: Story = {
  render: function Render() {
    const [value, setValue] = useState("hourly");

    return (
      <Segment
        options={[
          { value: "hourly", label: "시급" },
          { value: "monthly", label: "월급" },
        ]}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const FigmaWageToggle: Story = {
  name: "Figma toggle_급여",
  render: function Render() {
    const [value, setValue] = useState("hourly");

    return (
      <Segment
        className="w-[601px] max-w-full"
        options={[
          { value: "hourly", label: "시급" },
          { value: "monthly", label: "월급" },
        ]}
        value={value}
        onChange={setValue}
      />
    );
  },
};
