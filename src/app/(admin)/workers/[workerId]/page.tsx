import { WorkerDetailBasicScreen } from "@/features/workers/worker-detail-basic-screen";

export function generateStaticParams() {
  return [{ workerId: "worker_kim_seoyeon" }];
}

export default function Page() {
  return <WorkerDetailBasicScreen />;
}
