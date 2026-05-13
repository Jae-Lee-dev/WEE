import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ControlSize } from "@/shared/ui/control-size";
import { Input } from "@/shared/ui/input";
import { Segment } from "@/shared/ui/segment";
import { OptionSelect } from "@/shared/ui/select";

const meta = {
  title: "Design System/UI/Segment",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const sizes: ControlSize[] = ["sm", "default", "lg", "xl"];
const statusOptions = [
  { value: "active", label: "활성" },
  { value: "inactive", label: "비활성" },
];

export const PayType: Story = {
  render: function Render() {
    const [value, setValue] = useState("hourly");

    return (
      <Segment
        size="lg"
        options={[
          { value: "hourly", label: "시급" },
          { value: "monthly", label: "월급" },
        ]}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const FigmaWageToggle: Story = {
  name: "Figma toggle_급여",
  render: function Render() {
    const [value, setValue] = useState("hourly");

    return (
      <Segment
        className="w-[601px] max-w-full"
        size="lg"
        options={[
          { value: "hourly", label: "시급" },
          { value: "monthly", label: "월급" },
        ]}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const MatchedControlSizes: Story = {
  render: function Render() {
    const [valueBySize, setValueBySize] = useState<Record<ControlSize, string>>({
      sm: "hourly",
      default: "hourly",
      lg: "hourly",
      xl: "hourly",
    });

    return (
      <div className="grid w-[760px] gap-3">
        {sizes.map((size) => (
          <div
            key={size}
            className="grid grid-cols-[72px_1fr_1fr_1fr] items-center gap-3"
          >
            <span className="text-label-14-medium text-gray-500">{size}</span>
            <Input placeholder={`${size} input`} size={size} />
            <OptionSelect
              defaultValue="active"
              options={statusOptions}
              size={size}
            />
            <Segment
              className="grid w-full grid-cols-2"
              options={[
                { value: "hourly", label: "시급" },
                { value: "monthly", label: "월급" },
              ]}
              size={size}
              value={valueBySize[size]}
              onChange={(nextValue) =>
                setValueBySize((current) => ({
                  ...current,
                  [size]: nextValue,
                }))
              }
            />
          </div>
        ))}
      </div>
    );
  },
};
