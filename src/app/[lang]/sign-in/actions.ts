"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const useEmailFallback = process.env.AUTH_FALLBACK_EMAIL === "true";

export type SignInState = {
  error?: string;
  identifier?: string;
  step?: "request" | "verify";
};

/**
 * Normalize a phone number to E.164, accepting Saudi local formats.
 *
 * Customers naturally type `0554059597`; Supabase needs `+966554059597`.
 * Stripping with /\D/ keeps only ASCII digits, which also removes spaces,
 * dashes, parens, and any stray zero-width / BOM characters pasted in.
 * Returns null if it can't be turned into a valid E.164 number.
 */
function normalizePhone(raw: string): string | null {
  const hadPlus = (raw ?? "").trim().startsWith("+");
  let s = (raw ?? "").replace(/\D/g, ""); // ASCII digits only
  if (hadPlus) s = "+" + s;
  if (!s || s === "+") return null;

  if (s.startsWith("00")) s = "+" + s.slice(2); // 00966… → +966…
  if (!s.startsWith("+")) {
    if (s.startsWith("966")) s = "+" + s; // 966… → +966…
    else if (s.startsWith("0")) s = "+966" + s.slice(1); // 0554… → +966554…
    else s = "+966" + s; // bare local digits like 554059597
  }

  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}

const RequestSchema = useEmailFallback
  ? z.object({ identifier: z.email("Enter a valid email address.") })
  : z.object({ identifier: z.string().trim().min(1, "Enter your mobile number.") });

const VerifySchema = z.object({
  identifier: z.string().min(1),
  token: z.string().trim().regex(/^\d{4,10}$/, "Enter the numeric code we sent you."),
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

  let identifier = parsed.data.identifier;

  // Phone mode: accept local Saudi formats (e.g. 0554059597) → E.164.
  if (!useEmailFallback) {
    const phone = normalizePhone(identifier);
    if (!phone) {
      return {
        error: "Enter a valid Saudi mobile number, e.g. 0554059597.",
        identifier,
        step: "request",
      };
    }
    identifier = phone;
  }

  // Throttle OTP sends: caps SMS/email cost and slows account enumeration.
  const ip = clientIp(await headers());
  const perId = await rateLimit(`otp:${identifier.toLowerCase()}`, {
    max: 5,
    windowSeconds: 600,
  });
  const perIp = await rateLimit(`otp-ip:${ip}`, { max: 15, windowSeconds: 600 });
  if (!perId || !perIp) {
    return {
      error: "Too many attempts. Please wait a few minutes and try again.",
      identifier,
      step: "request",
    };
  }

  const supabase = await createClient();

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
