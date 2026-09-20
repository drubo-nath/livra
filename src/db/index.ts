import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * postgres.js over Neon's pooled connection string.
 *
 * Chosen over the Neon HTTP/WebSocket drivers on purpose:
 *  - real transaction support (`db.transaction`)
 *  - works against ANY Postgres (local, Neon, RDS) with zero code changes
 *  - Next.js server components/actions run in the Node runtime, where a
 *    small connection pool is the right tool
 *
 * Build/prerender safety: DATABASE_URL may be absent at build time (fresh
 * hosting project, CI). The proxy below defers client creation and throws a
 * clear error only when a query is actually attempted at runtime.
 */
const url = process.env.DATABASE_URL;

export const isDbConfigured = Boolean(url);

if (!isDbConfigured) {
  console.warn(
    "[db] DATABASE_URL is not set — serving seed fallback data where available.",
  );
}

function makeClient(): ReturnType<typeof postgres> {
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set — add it to your environment (.env.local locally, project settings on your host) before querying the database.",
    );
  }
  return postgres(url, {
    prepare: false,
    max: 1,
    connect_timeout: 8,
    idle_timeout: 10,
  });
}

// Lazy singleton: no pool is opened until the first real query, so module
// evaluation never crashes the build even without credentials.
let cached: ReturnType<typeof postgres> | null = null;
const proxy = new Proxy({} as ReturnType<typeof postgres>, {
  get(_t, prop) {
    cached ??= makeClient();
    return Reflect.get(cached as object, prop);
  },
});

export const db = drizzle(proxy, { schema });
export { schema };
