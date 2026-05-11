import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  WorkerDetailShell,
  WorkerDetailSubsection,
  WorkerDetailSubsectionHeader,
} from "./worker-detail-shell";
import {
  workerDetailPayrollIssues,
  workerDetailPayrollStatements,
  workerDetailPayrollSummary,
  type WorkerDetailPayrollIssue,
  type WorkerDetailPayrollMetric,
  type WorkerDetailPayrollStatement,
  type WorkerDetailPayrollTone,
} from "./worker-detail-payroll-fixtures";

const payrollToneConfig = {
  green: {
    variant: "green",
    style: { color: "var(--color-green-400)" },
  },
  orange: {
    variant: "orange",
    style: { color: "var(--color-orange-400)" },
  },
  red: {
    variant: "red",
    style: { color: "var(--color-red-500)" },
  },
  blue: {
    variant: "blue",
    style: { color: "var(--color-blue-500)" },
  },
  grey: {
    variant: "grey",
    style: { color: "var(--color-gray-600)" },
  },
} as const satisfies Record<
  WorkerDetailPayrollTone,
  {
    variant: "green" | "orange" | "red" | "blue" | "grey";
    style: { color: string };
  }
>;

export function WorkerDetailPayrollScreen() {
  return (
    <WorkerDetailShell activeTab="payroll">
      <div
        className="grid grid-cols-[minmax(0,1fr)_minmax(480px,1fr)] gap-4"
        data-testid="worker-detail-payroll-screen"
      >
        <div className="flex min-w-0 flex-col gap-4">
          <PayrollSummaryCard />
          <RecentStatementsCard />
        </div>
        <PendingIssuesCard />
      </div>
    </WorkerDetailShell>
  );
}

function PayrollSummaryCard() {
  return (
    <WorkerDetailSubsection ariaLabel="급여 요약">
      <WorkerDetailSubsectionHeader>
        <h2 className="text-h-20 text-gray-900">
          {workerDetailPayrollSummary.title}
        </h2>
      </WorkerDetailSubsectionHeader>
      <div className="grid grid-cols-3 gap-3">
        {workerDetailPayrollSummary.metrics.map((metric) => (
          <PayrollMetricCard key={metric.id} metric={metric} />
        ))}
      </div>
      <div className="flex gap-3">
        {workerDetailPayrollSummary.actions.map((label) => (
          <Button
            key={label}
            type="button"
            variant="secondary"
            className="h-9 rounded-full px-4 text-h-18-regular text-gray-800"
          >
            {label}
          </Button>
        ))}
      </div>
    </WorkerDetailSubsection>
  );
}

function PayrollMetricCard({ metric }: { metric: WorkerDetailPayrollMetric }) {
  const valueColor =
    metric.tone === "green"
      ? "text-green-400"
      : metric.tone === "red"
        ? "text-red-500"
        : "text-gray-900";

  return (
    <article className="flex h-[108px] flex-col justify-between rounded-[8px] border border-gray-200 p-3.5">
      <div className="text-h-18-semibold text-gray-800">{metric.label}</div>
      <div className="flex items-center gap-2">
        <span className={`text-h-24 ${valueColor}`}>{metric.value}</span>
        {metric.badge ? (
          <Badge
            variant="green"
            size="M"
            style={{ color: "var(--color-green-400)" }}
          >
            {metric.badge}
          </Badge>
        ) : null}
      </div>
    </article>
  );
}

function RecentStatementsCard() {
  return (
    <WorkerDetailSubsection
      ariaLabel="최근 확정 명세"
      className="min-h-[280px]"
      testId="worker-detail-payroll-statements"
    >
      <WorkerDetailSubsectionHeader>
        <h2 className="text-h-20 text-gray-900">최근 확정 명세</h2>
      </WorkerDetailSubsectionHeader>
      <div
        className="grid h-10 grid-cols-[24%_24%_24%_1fr] items-center border-b border-gray-300 text-h-18-regular text-gray-500"
        role="row"
      >
        <div role="columnheader">월</div>
        <div role="columnheader">상태</div>
        <div role="columnheader">확정 금액</div>
        <div role="columnheader">메모</div>
      </div>
      <div role="rowgroup">
        {workerDetailPayrollStatements.map((statement) => (
          <RecentStatementRow key={statement.id} statement={statement} />
        ))}
      </div>
    </WorkerDetailSubsection>
  );
}

function RecentStatementRow({
  statement,
}: {
  statement: WorkerDetailPayrollStatement;
}) {
  return (
    <div
      className="grid h-10 grid-cols-[24%_24%_24%_1fr] items-center border-b border-gray-100 text-h-18-regular text-gray-900 last:border-b-0"
      role="row"
    >
      <div role="cell">{statement.month}</div>
      <div role="cell">
        <PayrollBadge label={statement.status} tone={statement.statusTone} />
      </div>
      <div role="cell">{statement.amount}</div>
      <div role="cell">{statement.memo}</div>
    </div>
  );
}

function PendingIssuesCard() {
  return (
    <WorkerDetailSubsection
      ariaLabel="처리 대기 건"
      className="min-h-[480px]"
      testId="worker-detail-payroll-issues"
    >
      <WorkerDetailSubsectionHeader>
        <h2 className="text-h-20 text-gray-900">처리 대기 건</h2>
        <Badge variant="grey" size="M">
          3건
        </Badge>
      </WorkerDetailSubsectionHeader>
      <div className="flex flex-col gap-3">
        {workerDetailPayrollIssues.map((issue) => (
          <PendingIssueRow issue={issue} key={issue.id} />
        ))}
      </div>
    </WorkerDetailSubsection>
  );
}

function PendingIssueRow({ issue }: { issue: WorkerDetailPayrollIssue }) {
  return (
    <article className="flex min-h-[96px] items-center justify-between gap-4 rounded-[8px] border border-gray-100 px-3.5 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <PayrollBadge label={issue.tag} tone={issue.tagTone} />
        <h3 className="min-w-0 truncate text-h-18-semibold text-gray-900">
          {issue.title}
        </h3>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="mr-2 text-h-16-medium text-gray-600">
          {issue.state}
        </span>
        <Button
          type="button"
          variant="secondary"
          className="h-9 rounded-[8px] px-4 text-h-18-semibold text-gray-900"
        >
          {issue.detailLabel}
        </Button>
        <Button
          type="button"
          className="h-9 rounded-[8px] px-4 text-h-18-semibold text-white"
        >
          {issue.processLabel}
        </Button>
      </div>
    </article>
  );
}

function PayrollBadge({
  label,
  tone,
}: {
  label: string;
  tone: WorkerDetailPayrollTone;
}) {
  const config = payrollToneConfig[tone];

  return (
    <Badge variant={config.variant} size="M" style={config.style}>
      {label}
    </Badge>
  );
}
