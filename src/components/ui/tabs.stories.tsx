import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LineTabs } from "@/components/ui/line-tabs";
import { Tabs } from "@/components/ui/tabs";

const meta = {
  title: "Design System/UI/Tabs",
  component: Tabs,
  tags: ["autodocs"],
} satisfies Meta<typeof Tabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SectionTabs: Story = {
  render: function Render() {
    const [value, setValue] = useState("inbox");

    return (
      <LineTabs
        options={[
          { value: "inbox", label: "운영 인박스" },
          { value: "locations", label: "근무지별 대시보드" },
          { value: "workers", label: "근무자별 대시보드" },
        ]}
        value={value}
        onChange={setValue}
      />
    );
  },
};
