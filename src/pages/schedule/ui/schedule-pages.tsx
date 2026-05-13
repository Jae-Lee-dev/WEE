import {
  DutyListScreen,
  DutyTagsScreen,
  ScheduleApprovalScreen,
  ScheduleTimelineScreen,
  selectedDutyDetailRouteId,
} from "@/features/schedule";

export { selectedDutyDetailRouteId };

export function ScheduleApprovalPage() {
  return <ScheduleApprovalScreen />;
}

export function ScheduleTimelinePage() {
  return <ScheduleTimelineScreen />;
}

export function DutyListPage() {
  return <DutyListScreen />;
}

export function DutyDetailPage({ dutyId }: { dutyId: string }) {
  return <DutyListScreen initialSelectedDutyId={dutyId} />;
}

export function DutyTagsPage() {
  return <DutyTagsScreen />;
}
