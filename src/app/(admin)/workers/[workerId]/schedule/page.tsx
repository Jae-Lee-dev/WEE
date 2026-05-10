import { WorkerDetailScheduleScreen } from "@/features/workers/worker-detail-schedule-screen";

export function generateStaticParams() {
  return [{ workerId: "worker_kim_seoyeon" }];
}

export default function Page() {
  return <WorkerDetailScheduleScreen />;
}
