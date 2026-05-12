import { RecordMainScreen } from "@/features/records/record-main-screen";

type RecordsPageProps = {
  searchParams: Promise<{
    focus?: string;
    recordId?: string;
  }>;
};

export default async function Page({ searchParams }: RecordsPageProps) {
  const params = await searchParams;

  return <RecordMainScreen initialFocusId={params.focus ?? params.recordId} />;
}
