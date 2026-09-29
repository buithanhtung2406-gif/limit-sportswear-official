import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

type RuntimeEnv = {
  DB?: Parameters<typeof drizzle>[0];
  ADMIN_PASSWORD?: string;
  ADMIN_SESSION_TOKEN?: string;
};

export function getRuntimeEnv() {
  return env as RuntimeEnv;
}

export function getDb() {
  const runtimeEnv = getRuntimeEnv();
  if (!runtimeEnv.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(runtimeEnv.DB, { schema });
}
