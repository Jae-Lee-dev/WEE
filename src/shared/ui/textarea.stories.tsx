import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Textarea } from "@/shared/ui/textarea";

const meta = {
  title: "Design System/UI/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  args: {
    placeholder: "메모를 입력하세요",
    disabled: false,
  },
} satisfies Meta<typeof Textarea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <div className="grid max-w-[420px] gap-3">
      <Textarea placeholder="기본" />
      <Textarea placeholder="비활성" disabled />
      <Textarea placeholder="오류" aria-invalid />
    </div>
  ),
};
