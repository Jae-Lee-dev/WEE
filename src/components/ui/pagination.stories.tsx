import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { Pagination } from "@/components/ui/pagination";

const meta = {
  title: "Design System/UI/Pagination",
  component: Pagination,
  tags: ["autodocs"],
  argTypes: {
    currentPage: {
      control: { type: "number", min: 1 },
    },
    totalPages: {
      control: { type: "number", min: 1 },
    },
    siblingCount: {
      control: { type: "number", min: 0, max: 2 },
    },
  },
  args: {
    currentPage: 1,
    itemLabel: "명",
    onPageChange: () => undefined,
    pageSize: 10,
    siblingCount: 1,
    totalItems: 47,
    totalPages: 5,
  },
} satisfies Meta<typeof Pagination>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: function Render(args) {
    const [page, setPage] = useState(args.currentPage);

    return (
      <div className="w-[720px] overflow-hidden rounded-[8px] border border-gray-200 bg-white">
        <Pagination
          {...args}
          currentPage={page}
          onPageChange={setPage}
        />
      </div>
    );
  },
};

export const ManyPages: Story = {
  render: function Render() {
    const [page, setPage] = useState(6);

    return (
      <div className="w-[760px] overflow-hidden rounded-[8px] border border-gray-200 bg-white">
        <Pagination
          currentPage={page}
          itemLabel="명"
          pageSize={10}
          totalItems={128}
          totalPages={13}
          onPageChange={setPage}
        />
      </div>
    );
  },
};

export const FirstAndLastPage: Story = {
  render: () => (
    <div className="flex w-[720px] flex-col overflow-hidden rounded-[8px] border border-gray-200 bg-white">
      <Pagination
        currentPage={1}
        itemLabel="명"
        pageSize={10}
        totalItems={17}
        totalPages={2}
        onPageChange={() => undefined}
      />
      <Pagination
        currentPage={2}
        itemLabel="명"
        pageSize={10}
        totalItems={17}
        totalPages={2}
        onPageChange={() => undefined}
      />
    </div>
  ),
};

export const EmptyResult: Story = {
  render: () => (
    <div className="w-[720px] overflow-hidden rounded-[8px] border border-gray-200 bg-white">
      <Pagination
        currentPage={1}
        itemLabel="명"
        pageSize={10}
        totalItems={0}
        totalPages={1}
        onPageChange={() => undefined}
      />
    </div>
  ),
};
