import {
  defaultWorkerDetailRouteId,
  WorkerApplicationsScreen,
  WorkerDetailBasicScreen,
  WorkerDetailPayrollScreen,
  WorkerDetailScheduleScreen,
  WorkerTagsScreen,
  WorkersListScreen,
} from "@/features/workers";

export { defaultWorkerDetailRouteId };

export function WorkersListPage() {
  return <WorkersListScreen />;
}

export function WorkerApplicationsPage() {
  return <WorkerApplicationsScreen />;
}

export function WorkerTagsPage() {
  return <WorkerTagsScreen />;
}

export function WorkerDetailBasicPage({ workerId }: { workerId: string }) {
  return <WorkerDetailBasicScreen workerId={workerId} />;
}

export function WorkerDetailSchedulePage({ workerId }: { workerId: string }) {
  return <WorkerDetailScheduleScreen workerId={workerId} />;
}

export function WorkerDetailPayrollPage({ workerId }: { workerId: string }) {
  return <WorkerDetailPayrollScreen workerId={workerId} />;
}
