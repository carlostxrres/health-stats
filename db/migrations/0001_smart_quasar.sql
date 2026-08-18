CREATE TABLE "app_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"display_name" text,
	"height_cm" numeric(5, 1),
	"birth_date" date,
	"time_zone" text DEFAULT 'Europe/Madrid' NOT NULL,
	"week_start_day" integer DEFAULT 1 NOT NULL,
	"chart_hue" integer DEFAULT 30 NOT NULL,
	"sleep_goal_minutes" integer,
	"bedtime_goal" time,
	"wake_time_goal" time,
	"weight_goal_min_kg" numeric(5, 1),
	"weight_goal_max_kg" numeric(5, 1),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
