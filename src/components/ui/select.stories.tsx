import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const meta = {
  title: "Design System/UI/Select",
  component: Select,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Select>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Status: Story = {
  render: () => (
    <Select defaultValue="all">
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="상태 선택" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">전체</SelectItem>
        <SelectItem value="active">활성</SelectItem>
        <SelectItem value="inactive">비활성</SelectItem>
      </SelectContent>
    </Select>
  ),
};
