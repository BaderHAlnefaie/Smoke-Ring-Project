import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "../dictionaries";
import { requireStaff } from "@/lib/auth/dal";
import { fetchActiveOrdersForStaff, countCompletedToday } from "@/lib/db/orders";
import { StaffBoard } from "@/components/staff/StaffBoard";

export const dynamic = "force-dynamic";

export default async function StaffPage({ params }: PageProps<"/[lang]/staff">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  await requireStaff(`/${lang}/staff`);
  const dict = await getDictionary(lang);
  const [orders, completedToday] = await Promise.all([
    fetchActiveOrdersForStaff(),
    countCompletedToday(),
  ]);

  return (
    <StaffBoard orders={orders} completedToday={completedToday} lang={lang} dict={dict} />
  );
}
