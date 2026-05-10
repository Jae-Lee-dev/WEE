import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Skeleton } from "@/components/ui/skeleton";

const meta = {
  title: "Design System/UI/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
} satisfies Meta<typeof Skeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DashboardLoading: Story = {
  render: () => (
    <div className="grid gap-4">
      <Skeleton className="h-8 w-[220px]" />
      <div className="flex gap-4">
        <Skeleton className="h-[116px] w-[250px] rounded-[10px]" />
        <Skeleton className="h-[116px] w-[250px] rounded-[10px]" />
        <Skeleton className="h-[116px] w-[250px] rounded-[10px]" />
      </div>
      <Skeleton className="h-[260px] w-[760px] rounded-[10px]" />
    </div>
  ),
};
