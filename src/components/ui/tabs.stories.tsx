import type { Meta, StoryObj } from "@storybook/nextjs-vite";
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
