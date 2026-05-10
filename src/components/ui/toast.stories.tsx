import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

const meta = {
  title: "Design System/Feedback/Toast",
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div>
      <Toaster />
      <Button onClick={() => toast.success("저장되었습니다.")}>토스트 표시</Button>
    </div>
  ),
};

export const FigmaToast: Story = {
  render: () => (
    <div className="grid place-items-center gap-4">
      <Toaster />
      <div className="rounded-full bg-gray-500 px-4 py-2 text-body-14-medium text-white shadow-[0_0_7px_rgba(0,0,0,0.05)]">
        매칭이 종료되었어요
      </div>
      <Button
        variant="secondary"
        onClick={() =>
          toast.custom(() => (
            <div className="rounded-full bg-gray-500 px-4 py-2 text-body-14-medium text-white shadow-[0_0_7px_rgba(0,0,0,0.05)]">
              매칭이 종료되었어요
            </div>
          ))
        }
      >
        Figma 토스트 표시
      </Button>
    </div>
  ),
};
