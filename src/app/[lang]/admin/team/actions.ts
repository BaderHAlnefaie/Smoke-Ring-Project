"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { assignRoleByEmail, revokeRoleByEmail } from "@/lib/db/team";
import { log } from "@/lib/log";

export type TeamActionState = { ok?: boolean; error?: string };

const Schema = z.object({
  lang: z.string(),
  email: z.email(),
  role: z.enum(["staff", "admin"]),
});

/** Map a thrown DB/RPC error to a stable dictionary key the UI can render. */
function mapError(message: string): string {
  if (message.includes("user_not_found")) return "not_found";
  if (message.includes("not_authorized")) return "not_authorized";
  if (message.includes("cannot_remove_last_admin")) return "last_admin";
  return "generic";
}

export async function assignRole(
  _prev: TeamActionState | undefined,
  formData: FormData,
): Promise<TeamActionState> {
  const parsed = Schema.safeParse({
    lang: formData.get("lang"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: "generic" };

  const { lang, email, role } = parsed.data;
  await requireAdmin(`/${lang}/admin/team`);

  try {
    await assignRoleByEmail(email, role);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn("team_assign_failed", { role, message });
    return { error: mapError(message) };
  }

  revalidatePath(`/${lang}/admin/team`);
  return { ok: true };
}

export async function revokeRole(
  _prev: TeamActionState | undefined,
  formData: FormData,
): Promise<TeamActionState> {
  const parsed = Schema.safeParse({
    lang: formData.get("lang"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: "generic" };

  const { lang, email, role } = parsed.data;
  await requireAdmin(`/${lang}/admin/team`);

  try {
    await revokeRoleByEmail(email, role);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn("team_revoke_failed", { role, message });
    return { error: mapError(message) };
  }

  revalidatePath(`/${lang}/admin/team`);
  return { ok: true };
}
