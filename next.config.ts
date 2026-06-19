import type { NextConfig } from "next";

// Allow next/image to optimize menu photos served from Supabase Storage.
// Derived from the public Supabase URL so we don't hardcode a project ref.
const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : undefined;
  } catch {
    return undefined;
  }
})();

// Content-Security-Policy. Kept intentionally tight: the app loads scripts,
// styles and images only from itself + Supabase, talks to Supabase (REST +
// realtime websockets) and the Moyasar API, and is never meant to be framed.
// `'unsafe-inline'` for script/style is required by Next's hydration bootstrap
// and Tailwind's injected styles (no nonce pipeline is configured).
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${supabaseHost ? ` https://${supabaseHost}` : ""}`,
  "font-src 'self' data:",
  `connect-src 'self' https://api.moyasar.com${
    supabaseHost ? ` https://${supabaseHost} wss://${supabaseHost}` : ""
  }`,
]
  .join("; ")
  .concat(";");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // 2 years, preload-eligible. Safe because the prod origin is HTTPS-only.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost }]
      : [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
