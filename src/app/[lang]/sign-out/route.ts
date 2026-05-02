import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isLocale } from "@/app/[lang]/dictionaries";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/[lang]/sign-out">,
) {
  const { lang } = await ctx.params;
  const supabase = await createClient();
  await supabase.auth.signOut();
  const home = isLocale(lang) ? `/${lang}` : "/";
  return NextResponse.redirect(new URL(home, request.url), { status: 303 });
}
