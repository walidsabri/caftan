"use client";

import * as React from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

import { loginAdminAction } from "@/app/(admin)/admin/login/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const initialState = {
  error: "",
};

export function AdminLoginForm({ className, ...props }) {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin";
  const [state, formAction, pending] = useActionState(
    loginAdminAction,
    initialState,
  );

  return (
    <div className={cn("flex flex-col bg-white", className)} {...props}>
      <Card className="gap-8 bg-white py-5">
        <CardHeader>
          <CardTitle>Connexion admin</CardTitle>
          <CardDescription>
            Entrez les identifiants admin pour acceder au dashboard.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={formAction}>
            <input type="hidden" name="next" value={nextPath} />

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="admin-email">Email</FieldLabel>
                <Input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="admin-password">Password</FieldLabel>
                <Input
                  id="admin-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </Field>

              {state?.error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {state.error}
                </div>
              ) : null}

              <Field>
                <Button
                  type="submit"
                  disabled={pending}
                  className="bg-[#faa472] hover:bg-[#faa472]/90">
                  {pending ? "Connexion..." : "Login"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
