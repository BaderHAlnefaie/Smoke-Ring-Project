import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "../dictionaries";
import { requireStaff } from "@/lib/auth/dal";
import { fetchAllMenuItems, fetchTruckStatusAdmin } from "@/lib/db/admin-menu";
import { AdminPanel } from "@/components/admin/AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage({ params }: PageProps<"/[lang]/admin">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  await requireStaff(`/${lang}/admin`);
  const dict = await getDictionary(lang);
  const [truck, items] = await Promise.all([
    fetchTruckStatusAdmin(),
    fetchAllMenuItems(),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{dict.admin.title}</h1>
      <AdminPanel truck={truck} items={items} lang={lang} dict={dict} />
    </main>
  );
}
