import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "../../dictionaries";
import { fetchTruckStatusAdmin } from "@/lib/db/admin-menu";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { TruckControls } from "@/components/admin/TruckControls";
import { OpeningHoursEditor } from "@/components/admin/OpeningHoursEditor";

export const dynamic = "force-dynamic";

export default async function AdminTruckPage({ params }: PageProps<"/[lang]/admin/truck">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const truck = await fetchTruckStatusAdmin();

  return (
    <>
      <AdminTopbar title={dict.adminNav.truck} subtitle={dict.admin.subTruck} />
      <div className="px-9 pb-20 pt-7">
        <div className="grid items-start gap-4" style={{ gridTemplateColumns: "1fr 1fr", maxWidth: 920 }}>
          <TruckControls
            open={truck?.is_open ?? false}
            scheduled={truck?.accepting_scheduled ?? false}
            wait={truck?.est_wait_minutes ?? 0}
            lang={lang}
            dict={dict}
          />
          <OpeningHoursEditor hours={truck?.opening_hours ?? []} lang={lang} dict={dict} />
        </div>
      </div>
    </>
  );
}
