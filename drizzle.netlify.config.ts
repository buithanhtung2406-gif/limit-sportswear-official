import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // Netlify applies SQL from this directory during its deploy lifecycle.
  // Keeping it outside `drizzle/` also prevents the Sites build from treating
  // PostgreSQL SQL as Cloudflare D1 migrations.
  out: "./netlify/database/migrations",
  schema: "./db/netlify-schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      process.env.NETLIFY_DB_URL ||
      "postgres://local:local@localhost:5432/limit_sportswear",
  },
});
