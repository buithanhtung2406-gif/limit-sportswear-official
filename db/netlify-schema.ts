import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Netlify keeps the same versioned state model as the current D1 deployment.
export const appState = pgTable("app_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const adminCredentials = pgTable("admin_credentials", {
  key: text("key").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  salt: text("salt").notNull(),
  sessionVersion: integer("session_version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});
