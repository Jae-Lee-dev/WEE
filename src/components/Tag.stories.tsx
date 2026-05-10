import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Tag } from "./Tag";

const meta = {
  title: "Components/Tag",
  component: Tag,
  argTypes: {
    variant: {
      control: "select",
      options: ["green", "orange", "red", "blue", "grey", "outline"],
    },
    size: {
      control: "inline-radio",
      options: ["M", "L"],
    },
    interactive: {
      control: "boolean",
    },
  },
  args: {
    children: "승인 대기",
    variant: "green",
    size: "M",
    interactive: false,
  },
} satisfies Meta<typeof Tag>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Large: Story = {
  args: {
    size: "L",
  },
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Tag variant="green">승인</Tag>
      <Tag variant="orange">대기</Tag>
      <Tag variant="red">반려</Tag>
      <Tag variant="blue">정보</Tag>
      <Tag variant="grey">비활성</Tag>
      <Tag variant="outline">선택</Tag>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Tag size="M">승인 대기</Tag>
      <Tag size="L">승인 대기</Tag>
    </div>
  ),
};

export const Interactive: Story = {
  args: {
    interactive: true,
    size: "L",
    variant: "outline",
    children: "선택",
  },
};
