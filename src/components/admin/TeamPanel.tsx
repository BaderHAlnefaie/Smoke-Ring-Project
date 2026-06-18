"use client";

import { useActionState } from "react";
import {
  assignRole,
  revokeRole,
  type TeamActionState,
} from "@/app/[lang]/admin/team/actions";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";
import type { TeamMember, AssignableRole } from "@/lib/db/team";

type Props = { members: TeamMember[]; lang: Locale; dict: Dictionary };

const CARD = { background: "#fffefb", borderColor: "#ece1cc" } as const;
const inputCls = "rounded-xl border bg-transparent px-3 py-2.5 text-sm";

function errorText(error: string, dict: Dictionary): string {
  const map = dict.team.errors;
  return (map as Record<string, string>)[error] ?? map.generic;
}

function initials(email: string): string {
  const local = email.replace(/@.*/, "").split(/[.\-_]/);
  return ((local[0]?.[0] ?? "") + (local[1]?.[0] ?? "")).toUpperCase() || email.slice(0, 2).toUpperCase();
}

const ROLE_META: Record<AssignableRole, { bg: string; color: string }> = {
  admin: { bg: "#fbe9cc", color: "#a8501f" },
  staff: { bg: "#eef2e6", color: "#42562f" },
};

export function TeamPanel({ members, lang, dict }: Props) {
  const [state, action, pending] = useActionState<TeamActionState | undefined, FormData>(
    assignRole,
    undefined,
  );
  const t = dict.team;

  return (
    <div className="max-w-3xl space-y-[18px]">
      <div className="rounded-[18px] border p-[22px]" style={CARD}>
        <h2 className="font-serif text-xl">{t.inviteTitle}</h2>
        <p className="mb-4 mt-1 text-[13.5px]" style={{ color: "#8a7c6b" }}>{t.subtitle}</p>
        <form action={action} className="flex flex-wrap items-end gap-2.5">
          <input type="hidden" name="lang" value={lang} />
          <label className="min-w-56 flex-1">
            <div className="mb-1.5 text-xs font-semibold" style={{ color: "#8a7c6b" }}>{t.emailLabel}</div>
            <input
              name="email"
              type="email"
              required
              placeholder={t.emailPlaceholder}
              className={`w-full ${inputCls}`}
              style={{ borderColor: "#e0d4bd" }}
            />
          </label>
          <label>
            <div className="mb-1.5 text-xs font-semibold" style={{ color: "#8a7c6b" }}>{t.roleLabel}</div>
            <select name="role" defaultValue="staff" className={inputCls} style={{ borderColor: "#e0d4bd" }}>
              <option value="staff">{t.roleStaff}</option>
              <option value="admin">{t.roleAdmin}</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-60"
            style={{ background: "#c2622c" }}
          >
            {pending ? t.adding : t.add}
          </button>
          {state?.ok && <span className="text-sm text-sage">{t.added}</span>}
          {state?.error && <span className="text-sm text-rust">{errorText(state.error, dict)}</span>}
        </form>
      </div>

      <div className="overflow-hidden rounded-[18px] border" style={CARD}>
        <h2 className="px-5 pb-3 pt-[18px] font-serif text-[19px]">{t.currentTitle}</h2>
        {members.length === 0 ? (
          <p className="px-5 pb-5 text-sm" style={{ color: "#a99b86" }}>{t.empty}</p>
        ) : (
          members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-3.5 px-5 py-3.5" style={{ borderTop: "1px solid #f1e8d6" }}>
              <div
                className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full text-sm font-bold"
                style={{ background: "#fbe9cc", color: "#a8501f" }}
              >
                {initials(m.email)}
              </div>
              <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium">{m.email}</span>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {m.roles
                  .filter((r) => r !== "customer")
                  .map((r) => (
                    <RemoveRoleBadge key={r} email={m.email} role={r as AssignableRole} lang={lang} dict={dict} />
                  ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RemoveRoleBadge({
  email,
  role,
  lang,
  dict,
}: { email: string; role: AssignableRole } & Pick<Props, "lang" | "dict">) {
  const [state, action, pending] = useActionState<TeamActionState | undefined, FormData>(
    revokeRole,
    undefined,
  );
  const meta = ROLE_META[role];
  const label = role === "admin" ? dict.team.roleAdmin : dict.team.roleStaff;

  return (
    <form action={action} className="inline-flex items-center gap-1">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="role" value={role} />
      <button
        type="submit"
        disabled={pending}
        title={dict.team.remove}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold disabled:opacity-60"
        style={{ background: meta.bg, color: meta.color }}
      >
        <span>{label}</span>
        <span aria-hidden>×</span>
      </button>
      {state?.error && <span className="text-xs text-rust">{errorText(state.error, dict)}</span>}
    </form>
  );
}
