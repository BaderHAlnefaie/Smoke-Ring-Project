import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

export async function requireUser(redirectTo: string) {
  const user = await getSessionUser();
  if (!user) {
    const next = encodeURIComponent(redirectTo);
    redirect(`/sign-in?next=${next}`);
  }
  return user;
}

/** True if the user holds a staff or admin role. Cached per request. */
export const isStaffUser = cache(async (userId: string): Promise<boolean> => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["staff", "admin"])
    .limit(1)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
});

/** Require an authenticated staff/admin user, else redirect. */
export async function requireStaff(redirectTo: string) {
  const user = await requireUser(redirectTo);
  if (!(await isStaffUser(user.id))) {
    redirect("/");
  }
  return user;
}

/** True if the user holds the admin role. Cached per request. */
export const isAdminUser = cache(async (userId: string): Promise<boolean> => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
});

/** Require an authenticated admin user, else redirect. Admins are a superset of staff. */
export async function requireAdmin(redirectTo: string) {
  const user = await requireUser(redirectTo);
  if (!(await isAdminUser(user.id))) {
    redirect("/");
  }
  return user;
}

/** True if the user is staff but NOT admin — i.e. locked to the kitchen. */
export const isStaffOnly = cache(async (userId: string): Promise<boolean> => {
  const [staff, admin] = await Promise.all([isStaffUser(userId), isAdminUser(userId)]);
  return staff && !admin;
});

/**
 * Operators (staff & admins) work from their console, not the customer
 * storefront — bounce them off customer pages to it: admins to /admin, other
 * staff to the KDS. No-op for guests and customers.
 */
export async function bounceOperator(lang: string) {
  const user = await getSessionUser();
  if (!user) return;
  if (await isAdminUser(user.id)) redirect(`/${lang}/admin`);
  if (await isStaffUser(user.id)) redirect(`/${lang}/staff`);
}
