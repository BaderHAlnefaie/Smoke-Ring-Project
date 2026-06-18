import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "../../dictionaries";
import { fetchAllMenuItems, fetchCategories } from "@/lib/db/admin-menu";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { MenuAdmin } from "@/components/admin/MenuAdmin";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage({ params }: PageProps<"/[lang]/admin/menu">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const [items, categories] = await Promise.all([fetchAllMenuItems(), fetchCategories()]);

  return (
    <>
      <AdminTopbar title={dict.adminNav.menu} subtitle={dict.admin.subMenu} />
      <div className="px-9 pb-20 pt-7">
        <MenuAdmin categories={categories} items={items} lang={lang} dict={dict} />
      </div>
    </>
  );
}
