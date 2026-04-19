import { redirect } from "next/navigation";

import { geist } from "@/app/fonts";
import { AdminLoginForm } from "@/components/admin-login-form";
import { ADMIN_HOME_PATH, getCurrentAdminSession } from "@/lib/admin-auth";

export default async function LoginPage() {
  const { user, adminProfile } = await getCurrentAdminSession();

  if (user && adminProfile) {
    redirect(ADMIN_HOME_PATH);
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <h3
          className={`${geist.className} mb-10 w-full text-center text-5xl font-bold text-[#faa472]`}>
          Admin dashboard
        </h3>
        <AdminLoginForm />
      </div>
    </div>
  );
}
