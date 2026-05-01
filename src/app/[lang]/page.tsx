import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "./dictionaries";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <span
        aria-live="polite"
        className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
      >
        {dict.truck.open}
      </span>
      <h1 className="text-4xl font-bold tracking-tight">{dict.menu.title}</h1>
      <p className="max-w-md text-base text-zinc-600 dark:text-zinc-400">
        {dict.phase1.placeholder}
      </p>
    </main>
  );
}
