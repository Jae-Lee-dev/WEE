import {
  defaultWorkerDetailRouteId,
  WorkerDetailBasicPage,
} from "@/pages/workers";

type WorkerDetailPageProps = {
  params: Promise<{ workerId: string }>;
};

export function generateStaticParams() {
  return [{ workerId: defaultWorkerDetailRouteId }];
}

export default async function Page({ params }: WorkerDetailPageProps) {
  const { workerId } = await params;

  return <WorkerDetailBasicPage workerId={workerId} />;
}
