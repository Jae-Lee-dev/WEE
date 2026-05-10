import { AdminRoutePage } from "@/app/_components/AdminRoutePage";
import { findScreenByHref } from "@/app/_config/admin-navigation";

export default function Page() {
  return <AdminRoutePage screen={findScreenByHref("/records/attendance")} />;
}
