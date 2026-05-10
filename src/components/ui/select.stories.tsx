import { useState } from "react";
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
      <SelectTrigger>
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

const pendingOptions = [
  { value: "all", label: "전체" },
  { value: "membership", label: "소속 신청 대기" },
  { value: "schedule", label: "시간표 승인 대기" },
  { value: "overtime", label: "추가근무 승인 대기" },
  { value: "correction", label: "이의신청 처리 대기" },
  { value: "anomaly", label: "이상 플래그 미처리" },
  { value: "payroll", label: "급여 재확정 필요" },
];

export const FigmaPendingSelect: Story = {
  name: "Figma tag_L select",
  render: function Render() {
    const [value, setValue] = useState("membership");
    const [open, setOpen] = useState(true);

    return (
      <Select
        value={value}
        open={open}
        onValueChange={setValue}
        onOpenChange={setOpen}
      >
        <SelectTrigger>
          <SelectValue placeholder="대기 항목 선택" />
        </SelectTrigger>
        <SelectContent>
          {pendingOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  },
};
