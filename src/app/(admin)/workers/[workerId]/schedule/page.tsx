import { WorkerDetailScheduleScreen } from "@/features/workers/worker-detail-schedule-screen";
import { defaultWorkerDetailRouteId } from "@/features/workers/worker-detail-common-fixtures";

type WorkerDetailSchedulePageProps = {
  params: Promise<{ workerId: string }>;
};

export function generateStaticParams() {
  return [{ workerId: defaultWorkerDetailRouteId }];
}

export default async function Page({ params }: WorkerDetailSchedulePageProps) {
  const { workerId } = await params;

  return <WorkerDetailScheduleScreen workerId={workerId} />;
}
