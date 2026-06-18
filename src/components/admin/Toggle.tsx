"use client";

/** The brunch on/off switch (herb when on, sand when off). RTL-safe. */
export function Toggle({
  on,
  onClick,
  disabled,
  label,
}: {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="relative h-[27px] w-[46px] flex-none rounded-full transition disabled:opacity-60"
      style={{ background: on ? "#6e8b5b" : "#e0d4bd" }}
    >
      <span
        className="absolute top-[3px] h-[21px] w-[21px] rounded-full bg-white shadow-sm transition-all"
        style={{ insetInlineStart: on ? 22 : 3 }}
      />
    </button>
  );
}
