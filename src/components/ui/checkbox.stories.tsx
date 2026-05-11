import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";

const meta = {
  title: "Design System/UI/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  args: {
    "aria-label": "로그인 유지",
    disabled: false,
  },
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <div className="grid max-w-[420px] gap-4">
      <CheckboxRow id="checkbox-default" label="로그인 유지" />
      <CheckboxRow id="checkbox-checked" label="운영 알림 수신" checked />
      <CheckboxRow id="checkbox-disabled" label="선택할 수 없음" disabled />
      <CheckboxRow
        id="checkbox-invalid"
        label="필수 약관 동의"
        aria-invalid
      />
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <CheckboxRow
      id="checkbox-description"
      label="월간 급여 확정 알림"
      description="급여 계산이 완료되면 관리자에게 이메일을 발송합니다."
      checked
    />
  ),
};

export const Controlled: Story = {
  render: function Render() {
    const [checked, setChecked] = useState(true);

    return (
      <div className="grid max-w-[420px] gap-3">
        <CheckboxRow
          id="checkbox-controlled"
          label="교대 변경 알림"
          description={checked ? "알림 수신 중" : "알림을 받지 않음"}
          checked={checked}
          onCheckedChange={(next) => setChecked(next === true)}
        />
      </div>
    );
  },
};

function CheckboxRow({
  id,
  label,
  description,
  ...props
}: React.ComponentProps<typeof Checkbox> & {
  id: string;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Checkbox id={id} aria-label={label} className="mt-0.5" {...props} />
      <label
        htmlFor={id}
        className="grid cursor-pointer gap-1 text-body-14-regular tracking-normal text-gray-700"
      >
        <span className="text-label-14-medium text-gray-800">{label}</span>
        {description ? (
          <span className="text-label-12-regular text-gray-500">
            {description}
          </span>
        ) : null}
      </label>
    </div>
  );
}
