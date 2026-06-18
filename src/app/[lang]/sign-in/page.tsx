import { notFound, redirect } from "next/navigation";
import { getDictionary, isLocale } from "../dictionaries";
import { getSessionUser } from "@/lib/auth/dal";
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
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-5 py-12">
      <div className="w-full overflow-hidden rounded-3xl border border-line bg-cream shadow-2xl">
        <div className="bg-ember px-8 pb-7 pt-9 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cream">
            <span className="h-6 w-6 rounded-full border-4 border-ember" />
          </div>
          <div className="font-serif text-3xl text-cream">{dict.header.appName}</div>
          <div className="mt-1 text-sm" style={{ color: "#f2d9b8" }}>
            {dict.menu.tagline}
          </div>
        </div>
        <div className="px-7 pb-9 pt-6">
          <h1 className="font-serif text-2xl">{dict.auth.title}</h1>
          <p className="mb-5 mt-1 text-[13.5px] text-muted">{dict.auth.subtitle}</p>
          <SignInForm
            next={next}
            mode={useEmailFallback ? "email" : "phone"}
            dict={dict.auth}
          />
        </div>
      </div>
    </main>
  );
}
