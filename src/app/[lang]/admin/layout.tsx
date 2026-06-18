import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "../dictionaries";
import { requireAdmin } from "@/lib/auth/dal";
import { countActiveOrders } from "@/lib/db/admin-stats";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
  params,
}: LayoutProps<"/[lang]/admin">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const user = await requireAdmin(`/${lang}/admin`);
  const dict = await getDictionary(lang);
  const activeOrders = await countActiveOrders();

  return (
    <div className="fixed inset-0 z-40 flex" style={{ background: "#f4ecdb", color: "#2e2218" }}>
      <AdminSidebar
        lang={lang}
        dict={dict}
        activeOrders={activeOrders}
        userEmail={user.email ?? ""}
      />
      <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
