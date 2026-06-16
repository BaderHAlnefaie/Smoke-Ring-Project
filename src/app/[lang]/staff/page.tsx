import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "../dictionaries";
import { requireStaff } from "@/lib/auth/dal";
import { fetchActiveOrdersForStaff } from "@/lib/db/orders";
import { StaffBoard } from "@/components/staff/StaffBoard";

export const dynamic = "force-dynamic";

export default async function StaffPage({ params }: PageProps<"/[lang]/staff">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  await requireStaff(`/${lang}/staff`);
  const dict = await getDictionary(lang);
  const orders = await fetchActiveOrdersForStaff();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{dict.staff.title}</h1>
        <span className="text-sm text-zinc-500 tabular-nums">
          {orders.length} {dict.staff.active}
        </span>
      </div>
      <StaffBoard orders={orders} lang={lang} dict={dict} />
    </main>
  );
}
