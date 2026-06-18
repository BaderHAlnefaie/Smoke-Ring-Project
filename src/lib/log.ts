import "server-only";

/**
 * Minimal structured logger.
 *
 * Emits one JSON object per line so Vercel / any log drain can parse it. This is
 * deliberately tiny — it's the single seam where you'd later forward to Sentry,
 * Axiom, Logtail, etc. without touching call sites. Never log secrets or full
 * webhook payloads here.
 */
type Level = "info" | "warn" | "error";

type Fields = Record<string, unknown>;

function emit(level: Level, event: string, fields?: Fields) {
  const line = JSON.stringify({
    level,
    event,
    ts: new Date().toISOString(),
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (event: string, fields?: Fields) => emit("info", event, fields),
  warn: (event: string, fields?: Fields) => emit("warn", event, fields),
  error: (event: string, fields?: Fields) => emit("error", event, fields),
};
