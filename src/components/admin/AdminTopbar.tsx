import type { ReactNode } from "react";

/** Sticky page header for back-office pages: title + subtitle + optional action. */
export function AdminTopbar({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <header
      className="sticky top-0 z-20 flex items-end gap-5 px-9 py-5"
      style={{
        background: "rgba(244,236,219,.9)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid #e2d6bf",
      }}
    >
      <div>
        <h1 className="font-serif text-[28px] leading-tight">{title}</h1>
        <p className="mt-1 text-sm" style={{ color: "#8a7c6b" }}>
          {subtitle}
        </p>
      </div>
      {action ? <div className="ms-auto flex items-center gap-2.5">{action}</div> : null}
    </header>
  );
}
