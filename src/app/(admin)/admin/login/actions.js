"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  ADMIN_HOME_PATH,
  getAdminProfileByUserId,
} from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

const adminLoginSchema = z.object({
  email: z.email("Entrez une adresse email valide.").trim(),
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caracteres."),
  next: z.string().optional(),
});

function normalizeNextPath(value) {
  const nextPath = String(value || "").trim();

  if (!nextPath.startsWith("/admin")) {
    return ADMIN_HOME_PATH;
  }

  if (nextPath.startsWith("/admin/login")) {
    return ADMIN_HOME_PATH;
  }

  return nextPath || ADMIN_HOME_PATH;
}

export async function loginAdminAction(_previousState, formData) {
  const validatedFields = adminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0]?.message || "Invalid credentials.",
    };
  }

  const { email, password, next } = validatedFields.data;
  const supabase = await createClient();

  const {
    data: { user },
    error: signInError,
  } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !user) {
    return {
      error: signInError?.message || "Email ou mot de passe incorrect.",
    };
  }

  const adminProfile = await getAdminProfileByUserId(supabase, user.id);

  if (!adminProfile) {
    await supabase.auth.signOut();

    return {
      error:
        "Ce compte est authentifie mais n'a pas acces a l'administration.",
    };
  }

  redirect(normalizeNextPath(next));
}
