/**
 * Structured application logging (DPL-002).
 *
 * pino, JSON to stdout — one line per event, ready for a log aggregator. Level
 * comes from LOG_LEVEL (default "info"). For readable local output, pipe through
 * pino-pretty: `npm run dev | npx pino-pretty`. (We avoid pino's worker-thread
 * transport so it stays safe inside the Next server bundle.)
 *
 * The OpenTelemetry tracing half of DPL-002 (spans + OTLP exporter) is a
 * follow-up — it needs a real tracing backend to be meaningful; these structured
 * logs carry the same key attributes in the meantime.
 */

import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "development" ? "debug" : "info"),
  base: { service: process.env.OTEL_SERVICE_NAME ?? "treaty-lab" },
  // ISO timestamps read better in an aggregator than epoch ms.
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: { paths: ["req.headers.authorization", "req.headers.cookie"], remove: true },
});
