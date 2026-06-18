import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "../../dictionaries";
import { listTeam } from "@/lib/db/team";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { TeamPanel } from "@/components/admin/TeamPanel";

export const dynamic = "force-dynamic";

export default async function TeamPage({ params }: PageProps<"/[lang]/admin/team">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const members = await listTeam();

  return (
    <>
      <AdminTopbar title={dict.adminNav.team} subtitle={dict.admin.subTeam} />
      <div className="px-9 pb-20 pt-7">
        <TeamPanel members={members} lang={lang} dict={dict} />
      </div>
    </>
  );
}
