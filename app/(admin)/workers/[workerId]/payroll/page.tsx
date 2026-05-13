import {
  defaultWorkerDetailRouteId,
  WorkerDetailPayrollPage,
} from "@/pages/workers";

type WorkerDetailPayrollPageProps = {
  params: Promise<{ workerId: string }>;
};

export function generateStaticParams() {
  return [{ workerId: defaultWorkerDetailRouteId }];
}

export default async function Page({ params }: WorkerDetailPayrollPageProps) {
  const { workerId } = await params;

  return <WorkerDetailPayrollPage workerId={workerId} />;
}
