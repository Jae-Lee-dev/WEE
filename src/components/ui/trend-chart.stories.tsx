import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  TrendChart,
  TrendChartCard,
  type TrendChartDatum,
  type TrendChartTone,
} from "@/components/ui/trend-chart";

const meta = {
  title: "Design System/UI/Trend Chart",
  component: TrendChartCard,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  args: {
    data: [
      { id: "week-1", label: "1주차", value: 11, valueLabel: "11h" },
      { id: "week-2", label: "2주차", value: 12, valueLabel: "12h" },
      { id: "week-3", label: "3주차", value: 12, valueLabel: "12h" },
      { id: "week-4", label: "4주차", value: 13, valueLabel: "13h" },
    ],
    title: "근무시간 추이",
    tone: "green",
  },
  argTypes: {
    tone: {
      control: "select",
      options: ["green", "orange", "blue", "red", "grey"],
    },
  },
} satisfies Meta<typeof TrendChartCard>;

export default meta;

type Story = StoryObj<typeof meta>;

const workHourTrend = [
  { id: "week-1", label: "1주차", value: 11, valueLabel: "11h" },
  { id: "week-2", label: "2주차", value: 12, valueLabel: "12h" },
  { id: "week-3", label: "3주차", value: 12, valueLabel: "12h" },
  { id: "week-4", label: "4주차", value: 13, valueLabel: "13h" },
] as const satisfies readonly TrendChartDatum[];

const payrollTrend = [
  { id: "week-1", label: "1주차", value: 121440 },
  { id: "week-2", label: "2주차", value: 132480 },
  { id: "week-3", label: "3주차", value: 138000 },
  { id: "week-4", label: "4주차", value: 160080 },
] as const satisfies readonly TrendChartDatum[];

const weeklyTrend = [
  { id: "monday", label: "월", value: 6, valueLabel: "6h" },
  { id: "tuesday", label: "화", value: 8, valueLabel: "8h" },
  { id: "wednesday", label: "수", value: 7, valueLabel: "7h" },
  { id: "thursday", label: "목", value: 9, valueLabel: "9h" },
  { id: "friday", label: "금", value: 8, valueLabel: "8h" },
  { id: "saturday", label: "토", value: 5, valueLabel: "5h" },
  { id: "sunday", label: "일", value: 4, valueLabel: "4h" },
] as const satisfies readonly TrendChartDatum[];

function formatCurrency(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export const WorkHours: Story = {
  args: {
    data: workHourTrend,
    title: "근무시간 추이",
    tone: "green",
  },
  render: (args) => (
    <div className="w-[640px]">
      <TrendChartCard {...args} />
    </div>
  ),
};

export const Payroll: Story = {
  args: {
    data: payrollTrend,
    title: "급여 추이",
    tone: "orange",
    valueFormatter: formatCurrency,
  },
  render: (args) => (
    <div className="w-[640px]">
      <TrendChartCard {...args} />
    </div>
  ),
};

export const CompactSevenPoint: Story = {
  args: {
    data: weeklyTrend,
    title: "최근 1주 근무시간",
    tone: "green",
  },
  render: (args) => (
    <div className="w-[520px]">
      <TrendChartCard {...args} />
    </div>
  ),
};

export const ToneMatrix: Story = {
  render: () => {
    const tones = [
      ["green", "근무시간"],
      ["orange", "급여"],
      ["blue", "주의 근무지"],
      ["red", "고위험"],
      ["grey", "비활성"],
    ] as const satisfies readonly [TrendChartTone, string][];

    return (
      <div className="grid w-[760px] grid-cols-2 gap-4">
        {tones.map(([tone, title]) => (
          <TrendChartCard
            key={tone}
            data={workHourTrend}
            title={title}
            tone={tone}
          />
        ))}
      </div>
    );
  },
};

export const BareChart: Story = {
  render: () => (
    <div className="w-[520px] rounded-[8px] border border-gray-200 bg-white p-5">
      <TrendChart data={payrollTrend} tone="orange" valueFormatter={formatCurrency} />
    </div>
  ),
};
