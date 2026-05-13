import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ControlSize } from "@/shared/ui/control-size";
import { Input } from "@/shared/ui/input";

const meta = {
  title: "Design System/UI/Input",
  component: Input,
  tags: ["autodocs"],
  args: {
    placeholder: "조교 이름 또는 연락처 검색",
    disabled: false,
  },
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

const sizes: ControlSize[] = ["sm", "default", "lg"];

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <div className="grid max-w-[420px] gap-3">
      <Input placeholder="기본" />
      <Input placeholder="비활성" disabled />
      <Input placeholder="오류" aria-invalid />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="grid w-[420px] gap-3">
      {sizes.map((size) => (
        <label key={size} className="grid grid-cols-[72px_1fr] items-center gap-3">
          <span className="text-label-14-medium text-gray-500">{size}</span>
          <Input placeholder={`${size} input`} size={size} />
        </label>
      ))}
    </div>
  ),
};
