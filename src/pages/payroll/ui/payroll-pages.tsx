import {
  PayrollCalculationScreen,
  PayrollStatementsScreen,
} from "@/features/payroll";

export type PayrollPageSearchParams = {
  focus?: string;
  month?: string;
  workerId?: string;
};

export type PayrollStatementsPageSearchParams = PayrollPageSearchParams & {
  monthKey?: string;
};

export function PayrollCalculationPage({
  searchParams,
}: {
  searchParams: PayrollPageSearchParams;
}) {
  return (
    <PayrollCalculationScreen
      initialFocusId={searchParams.focus}
      initialMonthKey={searchParams.month}
      initialWorkerId={searchParams.workerId}
    />
  );
}

export function PayrollStatementsPage({
  searchParams,
}: {
  searchParams: PayrollStatementsPageSearchParams;
}) {
  return (
    <PayrollStatementsScreen
      initialFocusId={searchParams.focus}
      initialMonthKey={searchParams.month ?? searchParams.monthKey}
      initialWorkerId={searchParams.workerId}
    />
  );
}
