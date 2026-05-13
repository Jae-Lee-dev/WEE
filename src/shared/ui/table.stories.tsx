import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge } from "@/shared/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

const meta = {
  title: "Design System/UI/Table",
  component: Table,
  tags: ["autodocs"],
} satisfies Meta<typeof Table>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <div className="w-[760px] rounded-[10px] border border-gray-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>근무자</TableHead>
            <TableHead>근무지</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>갱신</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[
            ["김민채", "본관", "활성", "10분 전"],
            ["박서연", "강남 1관", "승인 대기", "24분 전"],
            ["이민재", "서초관", "확인 필요", "1시간 전"],
          ].map(([name, location, status, updated]) => (
            <TableRow key={name}>
              <TableCell>{name}</TableCell>
              <TableCell>{location}</TableCell>
              <TableCell>
                <Badge
                  variant={status === "활성" ? "green" : "orange"}
                  size="M"
                >
                  {status}
                </Badge>
              </TableCell>
              <TableCell>{updated}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
};
