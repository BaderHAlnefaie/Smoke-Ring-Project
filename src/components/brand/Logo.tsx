/** The Smoke Ring mark: an ember disc with a cream ring. */
export function Logo({ size = 34 }: { size?: number }) {
  const ring = Math.round(size * 0.44);
  return (
    <span
      className="flex flex-none items-center justify-center rounded-full bg-ember"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        className="rounded-full border-cream"
        style={{ width: ring, height: ring, borderWidth: Math.max(2, size * 0.075) }}
      />
    </span>
  );
}
