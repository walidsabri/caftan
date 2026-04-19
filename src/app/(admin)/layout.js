import { geist } from "@/app/fonts";
import { AdminLayoutShell } from "@/components/admin-layout-shell";

export default function AdminLayout({ children }) {
  return (
    <div className={geist.className}>
      <AdminLayoutShell>{children}</AdminLayoutShell>
    </div>
  );
}
