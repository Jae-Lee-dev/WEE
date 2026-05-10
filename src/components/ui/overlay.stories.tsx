import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

export const DropdownExample: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary">작업</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>근무 기록</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>상세 보기</DropdownMenuItem>
        <DropdownMenuItem>보정 요청</DropdownMenuItem>
        <DropdownMenuItem variant="destructive">반려</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

export const SelectExample: Story = {
  render: () => (
    <Select defaultValue="all">
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="상태 선택" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">전체</SelectItem>
        <SelectItem value="active">활성</SelectItem>
        <SelectItem value="inactive">비활성</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const TooltipExample: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon" variant="secondary" aria-label="도움말">
          ?
        </Button>
      </TooltipTrigger>
      <TooltipContent>승인 대기 항목을 확인합니다.</TooltipContent>
    </Tooltip>
  ),
};

export const ToastExample: Story = {
  render: () => (
    <div>
      <Toaster />
      <Button onClick={() => toast.success("저장되었습니다.")}>토스트 표시</Button>
    </div>
  ),
};
