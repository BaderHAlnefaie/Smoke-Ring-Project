import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/log";

export type RateLimitRule = {
  /** Max calls allowed within the window. */
  max: number;
  /** Window length in seconds. */
  windowSeconds: number;
};

/**
 * DB-backed fixed-window rate limiter.
 *
 * Backed by the `rate_limit_hit` Postgres function so it works across serverless
 * instances (an in-memory limiter would reset per cold start and not share state
 * between Vercel lambdas). Fails open: if the limiter itself errors we allow the
 * request rather than block real customers on an infra hiccup.
 *
 * Returns true when the call is allowed, false when it should be rejected (429).
 */
export async function rateLimit(key: string, rule: RateLimitRule): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_key: key,
      p_max: rule.max,
      p_window_seconds: rule.windowSeconds,
    });
    if (error) {
      log.warn("rate_limit_error", { key, message: error.message });
      return true; // fail open
    }
    return data !== false;
  } catch (err) {
    log.warn("rate_limit_exception", {
      key,
      message: err instanceof Error ? err.message : String(err),
    });
    return true; // fail open
  }
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}
