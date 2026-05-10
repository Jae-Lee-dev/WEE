import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { Segment } from "@/components/ui/segment";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const meta = {
  title: "Design System/UI/Tabs",
  component: Tabs,
  tags: ["autodocs"],
} satisfies Meta<typeof Tabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SectionTabs: Story = {
  render: () => (
    <Tabs defaultValue="inbox">
      <TabsList variant="line">
        <TabsTrigger variant="line" value="inbox">
          운영 인박스
        </TabsTrigger>
        <TabsTrigger variant="line" value="locations">
          근무지별 대시보드
        </TabsTrigger>
        <TabsTrigger variant="line" value="workers">
          근무자별 대시보드
        </TabsTrigger>
      </TabsList>
    </Tabs>
  ),
};

export const SegmentControl: Story = {
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

export const FilterControl: Story = {
  render: function Render() {
    const [value, setValue] = useState("active");

    return (
      <FilterTabs
        options={[
          { value: "active", label: "활성 17" },
          { value: "all", label: "전체 20" },
          { value: "inactive", label: "비활성 3" },
        ]}
        value={value}
        onChange={setValue}
      />
    );
  },
};
