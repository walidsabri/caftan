"use client";

import { usePathname } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function AdminLayoutShell({ children }) {
  const pathname = usePathname();

  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return children;
  }

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
        "--background": "#ffffff",
        "--foreground": "#0f172a",
        "--card": "#ffffff",
        "--card-foreground": "#0f172a",
        "--primary": "#0f172a",
        "--primary-foreground": "#f8fafc",
        "--secondary": "#f1f5f9",
        "--secondary-foreground": "#0f172a",
        "--muted": "#f1f5f9",
        "--muted-foreground": "#64748b",
        "--accent": "#0f172a",
        "--accent-foreground": "#f8fafc",
        "--border": "#e2e8f0",
        "--input": "#e2e8f0",
        "--ring": "#0f172a",
        "--sidebar": "#ffffff",
        "--sidebar-foreground": "#0f172a",
        "--sidebar-primary": "#0f172a",
        "--sidebar-primary-foreground": "#f8fafc",
        "--sidebar-accent": "#f1f5f9",
        "--sidebar-accent-foreground": "#0f172a",
      }}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
