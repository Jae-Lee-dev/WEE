import { PayrollCalculationScreen } from "@/features/payroll/payroll-calculation-screen";

type PayrollPageProps = {
  searchParams: Promise<{
    focus?: string;
    month?: string;
    workerId?: string;
  }>;
};

export default async function Page({ searchParams }: PayrollPageProps) {
  const params = await searchParams;

  return (
    <PayrollCalculationScreen
      initialFocusId={params.focus}
      initialMonthKey={params.month}
      initialWorkerId={params.workerId}
    />
  );
}
