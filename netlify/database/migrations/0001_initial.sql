CREATE TABLE IF NOT EXISTS "app_state" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_credentials" (
	"key" text PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"salt" text NOT NULL,
	"session_version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
