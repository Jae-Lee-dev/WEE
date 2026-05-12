import { WorkerDetailBasicScreen } from "@/features/workers/worker-detail-basic-screen";
import { defaultWorkerDetailRouteId } from "@/features/workers/worker-detail-common-fixtures";

type WorkerDetailPageProps = {
  params: Promise<{ workerId: string }>;
};

export function generateStaticParams() {
  return [{ workerId: defaultWorkerDetailRouteId }];
}

export default async function Page({ params }: WorkerDetailPageProps) {
  const { workerId } = await params;

  return <WorkerDetailBasicScreen workerId={workerId} />;
}
