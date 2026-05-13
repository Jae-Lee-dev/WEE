"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  WorkerDetailShell,
  WorkerDetailSubsection,
  WorkerDetailSubsectionHeader,
} from "./worker-detail-shell";
import { defaultWorkerDetailRouteId } from "../model/worker-detail-common-fixtures";
import {
  workerDetailPayrollSummary,
  type WorkerDetailPayrollIssue,
  type WorkerDetailPayrollMetric,
  type WorkerDetailPayrollStatement,
  type WorkerDetailPayrollTone,
} from "../model/worker-detail-payroll-fixtures";
import {
  createWorkerDetailPayrollDataSource,
  type WorkerDetailPayrollViewModel,
} from "../api/worker-detail-payroll-data-source";

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

export function WorkerDetailPayrollScreen({
  workerId = defaultWorkerDetailRouteId,
}: {
  workerId?: string;
}) {
  const dataSource = useMemo(() => createWorkerDetailPayrollDataSource(), []);
  const [viewModel, setViewModel] = useState<WorkerDetailPayrollViewModel>(
    dataSource.initialData ?? {
      currentMonthKey: undefined,
      issues: [],
      profile: {
        deleteLabel: "조교 삭제",
        monthlySummary: "급여 산정 확인 중",
        name: "조교 정보 로딩 중",
        paySummary: "급여 설정 확인 중",
        registeredSummary: "등록일 확인 중",
        status: "활성",
        tag: "태그 확인 중",
      },
      statements: [],
      summary: {
        actions: workerDetailPayrollSummary.actions,
        metrics: [],
        title: workerDetailPayrollSummary.title,
      },
    },
  );
  const [loading, setLoading] = useState(!dataSource.initialData);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (dataSource.initialData) {
      return;
    }

    let active = true;

    void dataSource
      .getPayroll(workerId)
      .then((nextViewModel) => {
        if (!active) {
          return;
        }

        setViewModel(nextViewModel);
        setLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setErrorMessage("조교 급여 현황을 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource, workerId]);

  return (
    <WorkerDetailShell
      activeTab="payroll"
      profile={viewModel.profile}
      workerId={workerId}
    >
      {errorMessage ? (
        <div
          className="rounded-[8px] border border-red-100 bg-red-50 px-4 py-2.5 text-body-14-medium tracking-normal text-red-500"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}
      <div
        className="grid grid-cols-[minmax(0,1fr)_minmax(480px,1fr)] gap-4"
        data-testid="worker-detail-payroll-screen"
      >
        <div className="flex min-w-0 flex-col gap-4">
          <PayrollSummaryCard
            currentMonthKey={viewModel.currentMonthKey}
            summary={viewModel.summary}
            workerId={workerId}
          />
          <RecentStatementsCard
            loading={loading}
            statements={viewModel.statements}
          />
        </div>
        <PendingIssuesCard
          currentMonthKey={viewModel.currentMonthKey}
          issues={viewModel.issues}
          loading={loading}
          workerId={workerId}
        />
      </div>
    </WorkerDetailShell>
  );
}

function PayrollSummaryCard({
  currentMonthKey,
  summary,
  workerId,
}: {
  currentMonthKey?: string;
  summary: WorkerDetailPayrollViewModel["summary"];
  workerId: string;
}) {
  const payrollHref = createPayrollCalculationHref(workerId, currentMonthKey);

  return (
    <WorkerDetailSubsection ariaLabel="급여 요약">
      <WorkerDetailSubsectionHeader>
        <h2 className="text-h-20 text-gray-900">
          {summary.title}
        </h2>
      </WorkerDetailSubsectionHeader>
      <div className="grid grid-cols-3 gap-3">
        {summary.metrics.map((metric) => (
          <PayrollMetricCard key={metric.id} metric={metric} />
        ))}
      </div>
      <div className="flex gap-3">
        {summary.actions.map((label) => (
          <Button
            asChild
            key={label}
            variant="secondary"
            className="h-9 rounded-full px-4 text-h-18-regular text-gray-800"
          >
            <Link
              href={
                label.includes("명세")
                  ? `/payroll/statements?workerId=${encodeURIComponent(workerId)}`
                  : payrollHref
              }
            >
              {label}
            </Link>
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

function RecentStatementsCard({
  loading,
  statements,
}: {
  loading: boolean;
  statements: readonly WorkerDetailPayrollStatement[];
}) {
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
        {loading ? (
          <PanelState>최근 명세를 불러오는 중입니다.</PanelState>
        ) : statements.length > 0 ? (
          statements.map((statement) => (
            <RecentStatementRow key={statement.id} statement={statement} />
          ))
        ) : (
          <PanelState>표시할 확정 명세가 없습니다.</PanelState>
        )}
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

function PendingIssuesCard({
  currentMonthKey,
  issues,
  loading,
  workerId,
}: {
  currentMonthKey?: string;
  issues: readonly WorkerDetailPayrollIssue[];
  loading: boolean;
  workerId: string;
}) {
  return (
    <WorkerDetailSubsection
      ariaLabel="처리 대기 건"
      className="min-h-[480px]"
      testId="worker-detail-payroll-issues"
    >
      <WorkerDetailSubsectionHeader>
        <h2 className="text-h-20 text-gray-900">처리 대기 건</h2>
        <Badge variant="grey" size="M">
          {loading ? "확인 중" : `${issues.length.toLocaleString("ko-KR")}건`}
        </Badge>
      </WorkerDetailSubsectionHeader>
      <div className="flex flex-col gap-3">
        {loading ? (
          <PanelState>처리 대기 건을 불러오는 중입니다.</PanelState>
        ) : issues.length > 0 ? (
          issues.map((issue) => (
            <PendingIssueRow
              currentMonthKey={currentMonthKey}
              issue={issue}
              key={issue.id}
              workerId={workerId}
            />
          ))
        ) : (
          <PanelState>처리 대기 건이 없습니다.</PanelState>
        )}
      </div>
    </WorkerDetailSubsection>
  );
}

function PendingIssueRow({
  currentMonthKey,
  issue,
  workerId,
}: {
  currentMonthKey?: string;
  issue: WorkerDetailPayrollIssue;
  workerId: string;
}) {
  const detailHref = issue.detailLabel.includes("REC-01")
    ? `/records?workerId=${encodeURIComponent(workerId)}`
    : createPayrollCalculationHref(workerId, currentMonthKey);

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
          asChild
          variant="secondary"
          className="h-9 rounded-[8px] px-4 text-h-18-semibold text-gray-900"
        >
          <Link href={detailHref}>{issue.detailLabel}</Link>
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

function createPayrollCalculationHref(workerId: string, monthKey?: string) {
  const params = new URLSearchParams({
    workerId,
  });

  if (monthKey) {
    params.set("month", monthKey);
  }

  return `/payroll?${params.toString()}`;
}

function PanelState({ children }: { children: string }) {
  return (
    <div className="flex min-h-20 items-center justify-center text-center text-h-18-regular text-gray-500">
      {children}
    </div>
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
