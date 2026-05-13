import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";

const meta = {
  title: "Design System/UI/Overlays",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const DialogExample: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>승인 처리</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>근무 신청 승인</DialogTitle>
          <DialogDescription>
            선택한 근무 신청을 승인 상태로 변경합니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary">취소</Button>
          <Button>승인</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const SheetExample: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">상세 열기</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>조교 상세</SheetTitle>
          <SheetDescription>
            기본 정보와 최근 근무 상태를 확인합니다.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-3 px-4 text-body-14-regular text-gray-700">
          <div>이름: 김민채</div>
          <div>근무지: 본관</div>
          <div>상태: 활성</div>
        </div>
        <SheetFooter>
          <Button>저장</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const TooltipExample: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip defaultOpen>
        <TooltipTrigger asChild>
          <Button size="icon" variant="secondary" aria-label="도움말">
            ?
          </Button>
        </TooltipTrigger>
        <TooltipContent>승인 대기 항목을 확인합니다.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};
