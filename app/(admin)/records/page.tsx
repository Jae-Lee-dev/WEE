import { RecordMainPage } from "@/pages/records";

type RecordsPageProps = {
  searchParams: Promise<{
    focus?: string;
    recordId?: string;
  }>;
};

export default async function Page({ searchParams }: RecordsPageProps) {
  const params = await searchParams;

  return <RecordMainPage searchParams={params} />;
}
