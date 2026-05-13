import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { IconCheck } from "@/shared/ui/icons";

const meta = {
  title: "Design System/Patterns/Affiliation Switch CTA",
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const FigmaCta: Story = {
  name: "Figma CTA_소속 전환",
  render: function Render() {
    const [selected, setSelected] = useState("main");
    const options = [
      { value: "main", label: "글로리아 T" },
      { value: "branch", label: "글로리아 T" },
    ];

    return (
      <div className="grid gap-3">
        {options.map((option) => {
          const isSelected = selected === option.value;

          return (
            <button
              key={option.value}
              type="button"
              className={[
                "flex h-[57px] w-[358px] items-center justify-between rounded-[10px] border px-4 text-left text-h-18-semibold transition-colors",
                isSelected
                  ? "border-green-400 bg-green-100 text-gray-900"
                  : "border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200",
              ].join(" ")}
              onClick={() => setSelected(option.value)}
              aria-pressed={isSelected}
            >
              <span className="min-w-0 truncate">{option.label}</span>
              <span
                className={[
                  "grid size-5 shrink-0 place-items-center rounded-full",
                  isSelected ? "bg-green-400" : "bg-gray-300",
                ].join(" ")}
                aria-hidden
              >
                <IconCheck className="size-3.5 text-white" />
              </span>
            </button>
          );
        })}
      </div>
    );
  },
};
