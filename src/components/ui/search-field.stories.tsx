import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SearchField } from "@/components/ui/search-field";

const meta = {
  title: "Design System/Composed/SearchField",
  component: SearchField,
  tags: ["autodocs"],
  args: {
    placeholder: "조교 이름 또는 연락처 검색",
  },
} satisfies Meta<typeof SearchField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Widths: Story = {
  render: () => (
    <div className="grid gap-3">
      <SearchField className="w-[320px]" placeholder="320px" />
      <SearchField className="w-[520px]" placeholder="520px" />
    </div>
  ),
};
