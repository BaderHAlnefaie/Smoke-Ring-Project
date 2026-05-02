"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const useEmailFallback = process.env.AUTH_FALLBACK_EMAIL === "true";

export type SignInState = {
  error?: string;
  identifier?: string;
  step?: "request" | "verify";
};

const RequestSchema = useEmailFallback
  ? z.object({ identifier: z.email("Enter a valid email address.") })
  : z.object({
      identifier: z
        .string()
        .trim()
        .regex(/^\+?[1-9]\d{7,14}$/, "Enter a valid phone number in E.164 format (e.g. +9665…)."),
    });

const VerifySchema = z.object({
  identifier: z.string().min(1),
  token: z.string().trim().regex(/^\d{4,10}$/, "Enter the numeric code from your email."),
});

export async function requestOtp(
  _prev: SignInState | undefined,
  formData: FormData,
): Promise<SignInState> {
  const parsed = RequestSchema.safeParse({
    identifier: formData.get("identifier"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      step: "request",
    };
  }

  const supabase = await createClient();
  const { identifier } = parsed.data;

  const { error } = useEmailFallback
    ? await supabase.auth.signInWithOtp({
        email: identifier,
        options: { shouldCreateUser: true },
      })
    : await supabase.auth.signInWithOtp({
        phone: identifier,
        options: { shouldCreateUser: true },
      });

  if (error) {
    return { error: error.message, identifier, step: "request" };
  }

  return { step: "verify", identifier };
}

export async function verifyOtp(
  _prev: SignInState | undefined,
  formData: FormData,
): Promise<SignInState> {
  const parsed = VerifySchema.safeParse({
    identifier: formData.get("identifier"),
    token: formData.get("token"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid code.",
      identifier: String(formData.get("identifier") ?? ""),
      step: "verify",
    };
  }

  const supabase = await createClient();
  const { identifier, token } = parsed.data;

  const { error } = useEmailFallback
    ? await supabase.auth.verifyOtp({ email: identifier, token, type: "email" })
    : await supabase.auth.verifyOtp({ phone: identifier, token, type: "sms" });

  if (error) {
    return { error: error.message, identifier, step: "verify" };
  }

  const next = String(formData.get("next") ?? "/");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  redirect(safeNext);
}
