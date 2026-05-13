import type { ReactNode } from "react";
import { AdminWorkspaceGate } from "@/app/routing";
import { AdminShell } from "@/widgets/admin-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminWorkspaceGate>
      <AdminShell>{children}</AdminShell>
    </AdminWorkspaceGate>
  );
}
