import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FilterTabs } from "@/components/ui/filter-tabs";

const meta = {
  title: "Design System/UI/FilterTabs",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const FigmaAssistantListToggle: Story = {
  name: "Figma toggle_조교목록",
  render: function Render() {
    const [value, setValue] = useState("active");

    return (
      <FilterTabs
        options={[
          { value: "active", label: "활성 17" },
          { value: "inactive", label: "비활성 3" },
        ]}
        value={value}
        onChange={setValue}
      />
    );
  },
};
