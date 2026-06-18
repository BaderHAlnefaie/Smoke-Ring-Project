import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "./dictionaries";
import { fetchMenu } from "@/lib/db/queries";
import { MenuBrowser } from "@/components/menu/MenuBrowser";
import { CartSidebar } from "@/components/cart/CartSidebar";
import { bounceOperator } from "@/lib/auth/dal";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  await bounceOperator(lang);
  const dict = await getDictionary(lang);
  const { categories, items, truck } = await fetchMenu();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-24">
      <div className="pb-2 pt-12">
        <div className="mb-3 text-[13px] font-semibold uppercase tracking-[.14em] text-clay">
          {dict.menu.tagline}
        </div>
        <h1 className="max-w-xl whitespace-pre-line font-serif text-5xl leading-[1.04] tracking-tight">
          {dict.menu.heroTitle}
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft">
          {dict.menu.heroSub}
        </p>
      </div>

      <div className="flex items-start gap-10">
        <div className="min-w-0 flex-1">
          <MenuBrowser categories={categories} items={items} lang={lang} dict={dict} />
        </div>
        <CartSidebar
          lang={lang}
          dict={dict}
          truckOpen={truck?.is_open ?? false}
          acceptingScheduled={truck?.accepting_scheduled ?? false}
          estWaitMinutes={truck?.est_wait_minutes ?? 0}
        />
      </div>
    </main>
  );
}
