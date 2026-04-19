import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request) {
  return updateSession(request);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/upload/:path*"],
};
