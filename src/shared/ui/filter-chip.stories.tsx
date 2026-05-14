import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FilterChip } from "@/shared/ui/filter-chip";

const meta = {
  title: "Design System/UI/FilterChip",
  component: FilterChip,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "selected",
        "neutral",
        "danger",
        "dangerSelected",
        "orange",
        "orangeSelected",
        "blue",
        "blueSelected",
      ],
    },
  },
  args: {
    children: "전체",
    variant: "neutral",
  },
} satisfies Meta<typeof FilterChip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const FigmaStates: Story = {
  name: "Figma tag_L selectable",
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <FilterChip variant="selected" aria-pressed>
        전체
      </FilterChip>
      <FilterChip variant="neutral" aria-pressed={false}>
        전체
      </FilterChip>
      <FilterChip variant="danger" aria-pressed={false}>
        전체
      </FilterChip>
      <FilterChip variant="dangerSelected" aria-pressed>
        이상 플래그
      </FilterChip>
      <FilterChip variant="blue" aria-pressed={false}>
        추가근무 신청
      </FilterChip>
      <FilterChip variant="blueSelected" aria-pressed>
        추가근무 신청
      </FilterChip>
      <FilterChip variant="orange" aria-pressed={false}>
        이의 신청
      </FilterChip>
      <FilterChip variant="orangeSelected" aria-pressed>
        이의 신청
      </FilterChip>
    </div>
  ),
};

export const Interactive: Story = {
  render: function Render() {
    const [selected, setSelected] = useState("all");
    const options = [
      { value: "all", label: "전체" },
      { value: "active", label: "활성" },
      { value: "inactive", label: "비활성" },
    ];

    return (
      <div className="flex flex-wrap items-center gap-2">
        {options.map((option) => {
          const isSelected = selected === option.value;

          return (
            <FilterChip
              key={option.value}
              variant={isSelected ? "selected" : "neutral"}
              aria-pressed={isSelected}
              onClick={() => setSelected(option.value)}
            >
              {option.label}
            </FilterChip>
          );
        })}
      </div>
    );
  },
};
