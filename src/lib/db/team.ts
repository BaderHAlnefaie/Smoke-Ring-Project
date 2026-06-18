import "server-only";
import { createClient } from "@/lib/supabase/server";

/** A user who holds at least one staff/admin role, with their auth email. */
export type TeamMember = {
  user_id: string;
  email: string;
  roles: ("customer" | "staff" | "admin")[];
};

export type AssignableRole = "staff" | "admin";

/**
 * Team queries/mutations go through SECURITY DEFINER RPCs that internally check
 * `is_admin()` against the caller's auth.uid(). We therefore use the request-
 * scoped session client (not the service-role admin client) so the RPC sees the
 * acting admin — the DB is the real authority, the app gate is defense in depth.
 */

export async function listTeam(): Promise<TeamMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_team");
  if (error) throw error;
  return (data ?? []) as TeamMember[];
}

export async function assignRoleByEmail(email: string, role: AssignableRole): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_assign_role", { p_email: email, p_role: role });
  if (error) throw error;
}

export async function revokeRoleByEmail(email: string, role: AssignableRole): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_revoke_role", { p_email: email, p_role: role });
  if (error) throw error;
}
