import { DutyListScreen } from "@/features/schedule/duty-list-screen";
import { selectedDutyDetailRouteId } from "@/features/schedule/duty-fixtures";

type DutyDetailPageProps = {
  params: Promise<{ dutyId: string }>;
};

export function generateStaticParams() {
  return [{ dutyId: selectedDutyDetailRouteId }];
}

export default async function Page({ params }: DutyDetailPageProps) {
  const { dutyId } = await params;

  return <DutyListScreen initialSelectedDutyId={dutyId} />;
}
