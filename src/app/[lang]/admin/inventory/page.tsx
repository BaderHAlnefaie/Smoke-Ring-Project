import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "../../dictionaries";
import { fetchAllMenuItems, fetchCategories } from "@/lib/db/admin-menu";
import { fetchInventoryItems, fetchRecipeLinks } from "@/lib/db/inventory";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { InventoryManager } from "@/components/admin/InventoryManager";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage({ params }: PageProps<"/[lang]/admin/inventory">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const [inventory, items, categories, links] = await Promise.all([
    fetchInventoryItems(),
    fetchAllMenuItems(),
    fetchCategories(),
    fetchRecipeLinks(),
  ]);

  return (
    <>
      <AdminTopbar title={dict.adminNav.inventory} subtitle={dict.admin.subInventory} />
      <div className="px-9 pb-20 pt-7">
        <InventoryManager
          inventory={inventory}
          items={items}
          categories={categories}
          links={links}
          lang={lang}
          dict={dict}
        />
      </div>
    </>
  );
}
