import "server-only";

import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_HOME_PATH = "/admin";

export async function getAdminProfileByUserId(supabase, userId) {
  const { data, error } = await supabase
    .from("admin_profiles")
    .select("id, email, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function getCurrentAdminSession() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      user: null,
      adminProfile: null,
    };
  }

  const adminProfile = await getAdminProfileByUserId(supabase, user.id);

  return {
    supabase,
    user,
    adminProfile,
  };
}

export async function requireAdminSession() {
  const session = await getCurrentAdminSession();

  if (!session.user || !session.adminProfile) {
    redirect(ADMIN_LOGIN_PATH);
  }

  return session;
}

export async function ensureAdminRouteAccess(supabase) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      user: null,
      adminProfile: null,
      unauthorizedResponse: NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      ),
    };
  }

  try {
    const adminProfile = await getAdminProfileByUserId(supabase, user.id);

    if (!adminProfile) {
      return {
        user,
        adminProfile: null,
        unauthorizedResponse: NextResponse.json(
          { error: "Admin access required." },
          { status: 403 },
        ),
      };
    }

    return {
      user,
      adminProfile,
      unauthorizedResponse: null,
    };
  } catch (error) {
    return {
      user,
      adminProfile: null,
      unauthorizedResponse: NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to verify admin access.",
        },
        { status: 500 },
      ),
    };
  }
}
