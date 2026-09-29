import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./netlify-schema";

type RuntimeEnv = {
  DATABASE_URL?: string;
  NETLIFY_DB_URL?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_SESSION_TOKEN?: string;
};

let client: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getRuntimeEnv() {
  return process.env as RuntimeEnv;
}

export function getDb() {
  const env = getRuntimeEnv();
  const databaseUrl = env.DATABASE_URL || env.NETLIFY_DB_URL;
  if (!databaseUrl) {
    throw new Error(
      "Chưa cấu hình DATABASE_URL hoặc NETLIFY_DB_URL trong Netlify. Hãy kết nối PostgreSQL trước khi chạy ứng dụng.",
    );
  }
  if (!client) client = postgres(databaseUrl, { max: 5, prepare: false });
  if (!database) database = drizzle(client, { schema });
  return database;
}
