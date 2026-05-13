import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ControlSize } from "@/shared/ui/control-size";
import { Input } from "@/shared/ui/input";
import { OptionSelect } from "@/shared/ui/select";

const meta = {
  title: "Design System/UI/Select",
  component: OptionSelect,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof OptionSelect>;

export default meta;

type Story = StoryObj<typeof meta>;

const statusOptions = [
  { value: "all", label: "전체" },
  { value: "active", label: "활성" },
  { value: "inactive", label: "비활성" },
];
const sizes: ControlSize[] = ["sm", "default", "lg", "xl"];

export const Status: Story = {
  args: {
    defaultValue: "all",
    options: statusOptions,
    placeholder: "상태 선택",
  },
  render: (args) => <OptionSelect {...args} />,
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
  args: {
    options: pendingOptions,
    placeholder: "대기 항목 선택",
  },
  name: "Figma tag_L select",
  render: function Render() {
    const [value, setValue] = useState("membership");
    const [open, setOpen] = useState(true);

    return (
      <OptionSelect
        onValueChange={setValue}
        onOpenChange={setOpen}
        open={open}
        options={pendingOptions}
        placeholder="대기 항목 선택"
        value={value}
      />
    );
  },
};

export const MatchedInputAndSelectSizes: Story = {
  args: {
    options: statusOptions,
  },
  render: () => (
    <div className="grid w-[620px] gap-3">
      {sizes.map((size) => (
        <div key={size} className="grid grid-cols-[72px_1fr_1fr] items-center gap-3">
          <span className="text-label-14-medium text-gray-500">{size}</span>
          <Input placeholder={`${size} input`} size={size} />
          <OptionSelect
            defaultValue="active"
            options={statusOptions}
            size={size}
          />
        </div>
      ))}
    </div>
  ),
};
