import {
  defaultWorkerDetailRouteId,
  WorkerDetailSchedulePage,
} from "@/pages/workers";

type WorkerDetailSchedulePageProps = {
  params: Promise<{ workerId: string }>;
};

export function generateStaticParams() {
  return [{ workerId: defaultWorkerDetailRouteId }];
}

export default async function Page({ params }: WorkerDetailSchedulePageProps) {
  const { workerId } = await params;

  return <WorkerDetailSchedulePage workerId={workerId} />;
}
