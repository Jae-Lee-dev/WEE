import { useState } from "react";
import type { ChangeEvent } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { SearchField } from "./SearchField";

const meta = {
  title: "Components/SearchField",
  component: SearchField,
  args: {
    placeholder: "검색어를 입력해 주세요",
    onChange: fn<(event: ChangeEvent<HTMLInputElement>) => void>(),
  },
  decorators: [
    (Story) => (
      <div className="w-[416px] max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SearchField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = {
  args: {
    defaultValue: "김민지",
  },
};

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState("시간표 승인");

    return (
      <SearchField
        {...args}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          args.onChange?.(event);
        }}
      />
    );
  },
};
