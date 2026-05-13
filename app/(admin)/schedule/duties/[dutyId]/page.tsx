import { DutyDetailPage, selectedDutyDetailRouteId } from "@/pages/schedule";

type DutyDetailPageProps = {
  params: Promise<{ dutyId: string }>;
};

export function generateStaticParams() {
  return [{ dutyId: selectedDutyDetailRouteId }];
}

export default async function Page({ params }: DutyDetailPageProps) {
  const { dutyId } = await params;

  return <DutyDetailPage dutyId={dutyId} />;
}
