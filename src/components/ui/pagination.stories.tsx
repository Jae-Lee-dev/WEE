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
    pageSizeOptions: {
      control: "object",
    },
  },
  args: {
    currentPage: 1,
    itemLabel: "명",
    onPageChange: () => undefined,
    pageSize: 20,
    pageSizeOptions: [20, 50, 100, 500],
    siblingCount: 1,
    totalItems: 247,
    totalPages: 13,
  },
} satisfies Meta<typeof Pagination>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: function Render(args) {
    const [page, setPage] = useState(args.currentPage);
    const [pageSize, setPageSize] = useState(args.pageSize ?? 20);
    const totalItems = args.totalItems ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(page, totalPages);

    return (
      <div className="w-[720px] overflow-hidden rounded-[8px] border border-gray-200 bg-white">
        <Pagination
          {...args}
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          }}
        />
      </div>
    );
  },
};

export const ManyPages: Story = {
  render: function Render() {
    const [page, setPage] = useState(6);
    const [pageSize, setPageSize] = useState(20);
    const totalItems = 642;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(page, totalPages);

    return (
      <div className="w-[760px] overflow-hidden rounded-[8px] border border-gray-200 bg-white">
        <Pagination
          currentPage={currentPage}
          itemLabel="명"
          pageSize={pageSize}
          pageSizeOptions={[20, 50, 100, 500]}
          totalItems={totalItems}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          }}
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
        pageSize={20}
        totalItems={43}
        totalPages={3}
        onPageChange={() => undefined}
      />
      <Pagination
        currentPage={3}
        itemLabel="명"
        pageSize={20}
        totalItems={43}
        totalPages={3}
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
        pageSize={20}
        totalItems={0}
        totalPages={1}
        onPageChange={() => undefined}
      />
    </div>
  ),
};
