import { WorkerDetailPayrollScreen } from "@/features/workers/worker-detail-payroll-screen";
import { defaultWorkerDetailRouteId } from "@/features/workers/worker-detail-common-fixtures";

type WorkerDetailPayrollPageProps = {
  params: Promise<{ workerId: string }>;
};

export function generateStaticParams() {
  return [{ workerId: defaultWorkerDetailRouteId }];
}

export default async function Page({ params }: WorkerDetailPayrollPageProps) {
  const { workerId } = await params;

  return <WorkerDetailPayrollScreen workerId={workerId} />;
}
