import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
