import { LoginForm } from "@/components/login-form";
import { geist } from "@/app/fonts";

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-svh w-full items-center justify-start     p-6 md:p-10">
      <h3
        className={`${geist.className} text-center mb-10 text-5xl font-bold text-[#faa472] w-full `}>
        Admin dashboard
      </h3>
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
