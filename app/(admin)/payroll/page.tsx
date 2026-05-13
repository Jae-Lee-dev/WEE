import { PayrollCalculationPage } from "@/pages/payroll";

type PayrollPageProps = {
  searchParams: Promise<{
    focus?: string;
    month?: string;
    workerId?: string;
  }>;
};

export default async function Page({ searchParams }: PayrollPageProps) {
  const params = await searchParams;

  return <PayrollCalculationPage searchParams={params} />;
}
