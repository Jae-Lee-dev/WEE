import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge } from "@/components/ui/badge";

const meta = {
  title: "Design System/UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["green", "greenSolid", "orange", "red", "blue", "grey", "outline"],
    },
    size: {
      control: "inline-radio",
      options: ["M", "L", "count"],
    },
    shape: {
      control: "inline-radio",
      options: ["default", "pill"],
    },
  },
  args: {
    children: "승인 대기",
    variant: "green",
    size: "M",
    shape: "default",
  },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="green">승인</Badge>
      <Badge variant="greenSolid">6</Badge>
      <Badge variant="orange">대기</Badge>
      <Badge variant="red">반려</Badge>
      <Badge variant="blue">정보</Badge>
      <Badge variant="grey">비활성</Badge>
      <Badge variant="outline">선택</Badge>
    </div>
  ),
};

export const NavigationPills: Story = {
  name: "Navigation count pills",
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="greenSolid" size="count" shape="pill">
        6
      </Badge>
      <Badge variant="greenSolid" size="count" shape="pill">
        12
      </Badge>
      <Badge variant="greenSolid" size="count" shape="pill">
        22
      </Badge>
    </div>
  ),
};

export const FigmaTagMatrix: Story = {
  name: "Figma tag_M / tag_L",
  render: () => {
    const tags = [
      ["green", "근무중"],
      ["orange", "승인 대기"],
      ["red", "확인 필요"],
      ["blue", "정산 완료"],
      ["grey", "비활성"],
      ["outline", "선택 안함"],
    ] as const;

    return (
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {tags.map(([variant, label]) => (
            <Badge key={`m-${variant}`} variant={variant} size="M">
              {label}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tags.map(([variant, label]) => (
            <Badge key={`l-${variant}`} variant={variant} size="L">
              {label}
            </Badge>
          ))}
        </div>
      </div>
    );
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge size="M">승인 대기</Badge>
      <Badge size="L">승인 대기</Badge>
    </div>
  ),
};
