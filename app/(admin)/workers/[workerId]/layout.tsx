import type { ReactNode } from "react";
import { WorkerDetailLayoutPage } from "@/pages/workers";

type WorkerDetailLayoutProps = {
  children: ReactNode;
  params: Promise<{ workerId: string }>;
};

export default async function Layout({
  children,
  params,
}: WorkerDetailLayoutProps) {
  const { workerId } = await params;

  return (
    <WorkerDetailLayoutPage workerId={workerId}>
      {children}
    </WorkerDetailLayoutPage>
  );
}
