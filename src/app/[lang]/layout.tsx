import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import "../globals.css";
import { getDictionary, isLocale, locales } from "./dictionaries";
import { CartButton } from "@/components/cart/CartButton";
import { CartDrawer } from "@/components/cart/CartDrawer";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

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

  return (
    <html
      lang={lang}
      dir={dir}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-black">
        <header className="flex items-center justify-between border-b border-black/[.08] dark:border-white/[.145] px-4 py-3 bg-white dark:bg-black">
          <Link href={`/${lang}`} className="text-xl font-semibold tracking-tight">
            {dict.header.appName}
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={`/${otherLocale}`}
              className="text-sm font-medium underline-offset-4 hover:underline px-2"
            >
              {dict.common.language}
            </Link>
            <CartButton />
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
        <CartDrawer lang={lang} dict={dict} />
      </body>
    </html>
  );
}
