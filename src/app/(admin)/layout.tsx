import type { ReactNode } from "react";
import { AdminShell } from "@/app/_components/AdminShell";
import { AdminWorkspaceGate } from "@/app/_components/AdminWorkspaceGate";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminWorkspaceGate>
      <AdminShell>{children}</AdminShell>
    </AdminWorkspaceGate>
  );
}
