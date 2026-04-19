import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const ADMIN_LOGIN_PATH = "/admin/login";

function copySupabaseCookies(sourceResponse, targetResponse) {
  sourceResponse.cookies.getAll().forEach((cookie) => {
    targetResponse.cookies.set(cookie);
  });

  return targetResponse;
}

function createRedirectResponse(request, supabaseResponse, pathname) {
  const url = request.nextUrl.clone();
  url.pathname = ADMIN_LOGIN_PATH;

  if (pathname && pathname !== ADMIN_LOGIN_PATH) {
    url.searchParams.set("next", pathname);
  }

  return copySupabaseCookies(supabaseResponse, NextResponse.redirect(url));
}

function createApiErrorResponse(supabaseResponse, status, error) {
  return copySupabaseCookies(
    supabaseResponse,
    NextResponse.json({ error }, { status }),
  );
}

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const pathname = request.nextUrl.pathname;
  const isAdminLoginRoute =
    pathname === ADMIN_LOGIN_PATH || pathname.startsWith(`${ADMIN_LOGIN_PATH}/`);
  const isProtectedAdminPage = pathname.startsWith("/admin") && !isAdminLoginRoute;
  const isProtectedApiRoute =
    pathname.startsWith("/api/admin") || pathname.startsWith("/api/upload");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    if (isProtectedApiRoute) {
      return createApiErrorResponse(
        supabaseResponse,
        401,
        "Unauthorized.",
      );
    }

    if (isProtectedAdminPage) {
      return createRedirectResponse(request, supabaseResponse, pathname);
    }

    return supabaseResponse;
  }

  let isAdmin = false;

  if (user) {
    const { data: adminProfile } = await supabase
      .from("admin_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    isAdmin = Boolean(adminProfile);
  }

  if (isAdminLoginRoute && isAdmin) {
    return copySupabaseCookies(
      supabaseResponse,
      NextResponse.redirect(new URL("/admin", request.url)),
    );
  }

  if (!user || !isAdmin) {
    if (isProtectedApiRoute) {
      return createApiErrorResponse(
        supabaseResponse,
        user ? 403 : 401,
        user ? "Admin access required." : "Unauthorized.",
      );
    }

    if (isProtectedAdminPage) {
      return createRedirectResponse(request, supabaseResponse, pathname);
    }
  }

  return supabaseResponse;
}
