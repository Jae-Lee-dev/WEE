import { useState } from "react";
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

export const FigmaTextfieldSearch: Story = {
  render: function Render() {
    const [value, setValue] = useState("운영 인박스");

    return (
      <div className="grid gap-3">
        <SearchField
          className="w-[416px] [&_svg]:text-green-400"
          placeholder="검색어를 입력해 주세요"
        />
        <SearchField
          className="w-[416px] [&_svg]:text-green-400"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="검색어를 입력해 주세요"
          aria-label="운영 인박스 검색"
        />
      </div>
    );
  },
};
