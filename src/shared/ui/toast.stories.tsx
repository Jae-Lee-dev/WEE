import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/shared/ui/button";
import { Toaster } from "@/shared/ui/sonner";
import { useWeeToast } from "@/shared/ui/wee-toast";

const meta = {
  title: "Design System/Feedback/Toast",
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function DefaultToastExample() {
  const weeToast = useWeeToast();

  return (
    <div>
      <Toaster />
      <Button
        onClick={() =>
          weeToast.success({
            title: "작업이 완료되었습니다.",
            description: "공통 피드백 메시지가 표시되었어요.",
          })
        }
      >
        토스트 표시
      </Button>
    </div>
  );
}

function ToastToneExample() {
  const weeToast = useWeeToast();

  return (
    <div className="grid grid-cols-2 gap-3">
      <Toaster />
      <Button
        onClick={() =>
          weeToast.success({
            title: "작업이 완료되었습니다.",
            description: "담당자에게 안내할 준비가 되었어요.",
          })
        }
      >
        성공
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          weeToast.info({
            title: "새 요청이 있습니다.",
            description: "운영 인박스에서 내용을 확인해 주세요.",
          })
        }
      >
        안내
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          weeToast.warning({
            title: "확인이 필요합니다.",
            description: "근무 시간이 겹치는 항목이 있어요.",
          })
        }
      >
        주의
      </Button>
      <Button
        variant="danger"
        onClick={() =>
          weeToast.error({
            title: "처리하지 못했습니다.",
            description: "잠시 후 다시 시도해 주세요.",
          })
        }
      >
        오류
      </Button>
    </div>
  );
}

function FigmaToastExample() {
  const weeToast = useWeeToast();

  return (
    <div className="grid place-items-center gap-4">
      <Toaster />
      <div className="rounded-full bg-gray-500 px-4 py-2 text-body-14-medium text-white shadow-[0_0_7px_rgba(0,0,0,0.05)]">
        매칭이 종료되었어요
      </div>
      <Button
        variant="secondary"
        onClick={() =>
          weeToast.compact({
            title: "매칭이 종료되었어요",
          })
        }
      >
        Figma 토스트 표시
      </Button>
    </div>
  );
}

export const Default: Story = {
  render: () => <DefaultToastExample />,
};

export const Tones: Story = {
  render: () => <ToastToneExample />,
};

export const FigmaToast: Story = {
  render: () => <FigmaToastExample />,
};
