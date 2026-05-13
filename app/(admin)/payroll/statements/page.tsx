import { PayrollStatementsPage } from "@/pages/payroll";

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

  return <PayrollStatementsPage searchParams={params} />;
}
