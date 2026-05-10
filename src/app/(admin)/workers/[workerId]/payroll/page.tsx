import { WorkerDetailPayrollScreen } from "@/features/workers/worker-detail-payroll-screen";

export function generateStaticParams() {
  return [{ workerId: "worker_kim_seoyeon" }];
}

export default function Page() {
  return <WorkerDetailPayrollScreen />;
}
