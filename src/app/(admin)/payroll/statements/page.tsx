import { PayrollStatementsScreen } from "@/features/payroll/payroll-statements-screen";

type PayrollStatementsPageProps = {
  searchParams: Promise<{
    focus?: string;
    month?: string;
    monthKey?: string;
    workerId?: string;
  }>;
};

export default async function Page({ searchParams }: PayrollStatementsPageProps) {
  const params = await searchParams;

  return (
    <PayrollStatementsScreen
      initialFocusId={params.focus}
      initialMonthKey={params.month ?? params.monthKey}
      initialWorkerId={params.workerId}
    />
  );
}
