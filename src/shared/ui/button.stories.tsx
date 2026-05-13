import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
} from "@/shared/ui/icons";
import { Button } from "@/shared/ui/button";

const meta = {
  title: "Design System/UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "primary",
        "secondary",
        "danger",
        "ghost",
        "link",
        "default",
        "outline",
        "destructive",
      ],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon", "icon-sm", "icon-lg"],
    },
  },
  args: {
    children: "저장",
    variant: "primary",
    size: "default",
    disabled: false,
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">저장</Button>
      <Button variant="secondary">취소</Button>
      <Button variant="danger">반려</Button>
      <Button variant="ghost">더보기</Button>
      <Button variant="link">상세 보기</Button>
    </div>
  ),
};

export const FigmaButtonM: Story = {
  name: "Figma button_M",
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">저장</Button>
      <Button variant="secondary">취소</Button>
      <Button variant="danger">반려</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">작게</Button>
      <Button>기본</Button>
      <Button size="lg">크게</Button>
      <Button size="icon" aria-label="확인">
        <IconCheck className="size-5" />
      </Button>
    </div>
  ),
};

export const WithIcon: Story = {
  render: function Render() {
    const [isSaved, setIsSaved] = useState(false);
    const [iconSide, setIconSide] = useState<"left" | "right">("right");
    const DirectionIcon =
      iconSide === "left" ? IconChevronLeft : IconChevronRight;

    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button
          className="min-w-[104px]"
          onClick={() => setIsSaved((current) => !current)}
        >
          {isSaved ? "저장됨" : "저장"}
          <IconCheck className="size-5" />
        </Button>
        <Button
          variant="secondary"
          className="min-w-[104px]"
          onClick={() =>
            setIconSide((current) => (current === "left" ? "right" : "left"))
          }
        >
          {iconSide === "left" && <DirectionIcon className="size-5" />}
          다음
          {iconSide === "right" && <DirectionIcon className="size-5" />}
        </Button>
      </div>
    );
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
