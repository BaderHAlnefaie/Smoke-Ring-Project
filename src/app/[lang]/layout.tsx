import type { Metadata } from "next";
import { DM_Serif_Display, Hanken_Grotesk, Tajawal } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import "../globals.css";
import { getDictionary, isLocale, locales } from "./dictionaries";
import { CartButton } from "@/components/cart/CartButton";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { Logo } from "@/components/brand/Logo";
import { getSessionUser, isStaffUser, isAdminUser } from "@/lib/auth/dal";
import { fetchTruckStatus } from "@/lib/db/queries";

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dmserif",
  display: "swap",
});
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});
const tajawal = Tajawal({
  weight: ["400", "500", "700"],
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smoke Ring",
  description: "Order ahead from your favorite food truck.",
};

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const otherLocale = lang === "ar" ? "en" : "ar";
  const user = await getSessionUser();
  const staff = user ? await isStaffUser(user.id) : false;
  const admin = user ? await isAdminUser(user.id) : false;
  const truck = await fetchTruckStatus();

  const isOpen = truck?.is_open ?? false;
  const wait = truck?.est_wait_minutes ?? 0;
  const statusLine =
    isOpen && wait > 0
      ? `${dict.truck.open} · ~${wait} ${dict.truck.minutes}`
      : isOpen
        ? dict.truck.open
        : dict.truck.closed;

  return (
    <html
      lang={lang}
      dir={dir}
      className={`${dmSerif.variable} ${hanken.variable} ${tajawal.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-cream text-ink">
        <header className="sticky top-0 z-30 border-b border-line bg-cream/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-3">
            <Link href={`/${lang}`} className="flex items-center gap-2.5">
              <Logo size={34} />
              <span className="font-serif text-[23px] leading-none tracking-tight">
                {dict.header.appName}
              </span>
            </Link>

            <div className="ms-auto flex items-center gap-2.5">
              <span
                className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 sm:inline-flex ${
                  isOpen
                    ? "border-sage/30 bg-sage-soft text-sage"
                    : "border-rust/20 bg-rust/10 text-rust"
                }`}
              >
                <span className="relative h-2 w-2">
                  <span
                    className={`absolute inset-0 rounded-full ${isOpen ? "bg-sage sr-pulse" : "bg-rust"}`}
                  />
                  <span className={`absolute inset-0 rounded-full ${isOpen ? "bg-sage" : "bg-rust"}`} />
                </span>
                <span className="text-[13px] font-semibold">{statusLine}</span>
              </span>

              <LocaleSwitch current={lang} other={otherLocale} label={dict.common.language} />

              {staff && (
                <Link
                  href={`/${lang}/staff`}
                  className="px-2 text-sm font-semibold text-ink-soft underline-offset-4 hover:underline"
                >
                  {dict.header.staff}
                </Link>
              )}
              {admin && (
                <Link
                  href={`/${lang}/admin`}
                  className="px-2 text-sm font-semibold text-ink-soft underline-offset-4 hover:underline"
                >
                  {dict.header.admin}
                </Link>
              )}

              {user ? (
                <>
                  {!staff && (
                    <Link
                      href={`/${lang}/orders`}
                      className="px-2 text-sm font-semibold text-ink-soft underline-offset-4 hover:underline"
                    >
                      {dict.header.orders}
                    </Link>
                  )}
                  <form action={`/${lang}/sign-out`} method="post">
                    <button
                      type="submit"
                      className="px-2 text-sm font-semibold text-ink-soft underline-offset-4 hover:underline"
                    >
                      {dict.header.signOut}
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href={`/${lang}/sign-in`}
                  className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream"
                >
                  {dict.header.signIn}
                </Link>
              )}

              {!staff && <CartButton />}
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col">{children}</div>

        <CartDrawer
          lang={lang}
          dict={dict}
          truckOpen={truck?.is_open ?? false}
          acceptingScheduled={truck?.accepting_scheduled ?? false}
          estWaitMinutes={truck?.est_wait_minutes ?? 0}
        />
      </body>
    </html>
  );
}
