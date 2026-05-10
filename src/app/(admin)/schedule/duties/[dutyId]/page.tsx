import { DutyListScreen } from "@/features/schedule/duty-list-screen";
import { selectedDutyDetailRouteId } from "@/features/schedule/duty-fixtures";

export function generateStaticParams() {
  return [{ dutyId: selectedDutyDetailRouteId }];
}

export default function Page() {
  return <DutyListScreen initialSelectedDutyId={selectedDutyDetailRouteId} />;
}
