import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "./Button";

const meta = {
  title: "Components/Button",
  component: Button,
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "danger"],
    },
  },
  args: {
    children: "저장",
    variant: "primary",
    disabled: false,
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: {
    children: "취소",
    variant: "secondary",
  },
};

export const Danger: Story = {
  args: {
    children: "반려",
    variant: "danger",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">저장</Button>
      <Button variant="secondary">취소</Button>
      <Button variant="danger">반려</Button>
    </div>
  ),
};
