import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "../dictionaries";
import { getSessionUser } from "@/lib/auth/dal";
import { redirect } from "next/navigation";
import { SignInForm } from "./SignInForm";

export default async function SignInPage({
  params,
  searchParams,
}: PageProps<"/[lang]/sign-in">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const user = await getSessionUser();
  const sp = await searchParams;
  const nextRaw = typeof sp.next === "string" ? sp.next : `/${lang}`;
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : `/${lang}`;

  if (user) redirect(next);

  const dict = await getDictionary(lang);
  const useEmailFallback = process.env.AUTH_FALLBACK_EMAIL === "true";

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-10 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{dict.auth.title}</h1>
      <SignInForm
        next={next}
        mode={useEmailFallback ? "email" : "phone"}
        dict={dict.auth}
      />
    </main>
  );
}
