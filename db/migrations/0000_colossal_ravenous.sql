CREATE TABLE "body_photo_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"body_photo_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "body_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taken_at" timestamp with time zone NOT NULL,
	"description" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"external_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_id" uuid NOT NULL,
	"ingredient" text NOT NULL,
	"quantity_value" numeric(10, 2),
	"quantity_unit" text,
	"quantity_raw" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"eaten_at" timestamp with time zone NOT NULL,
	"location" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"external_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"taken_at" timestamp with time zone NOT NULL,
	"location" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"external_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metric_definitions" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"category" text NOT NULL,
	"default_unit" text NOT NULL,
	"value_kind" text DEFAULT 'simple' NOT NULL,
	"requires_body_site" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metric_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_type" text NOT NULL,
	"value" numeric(10, 3) NOT NULL,
	"unit" text NOT NULL,
	"value_secondary" numeric(10, 3),
	"body_site" text,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_date" date NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"external_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_episodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"episode_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"started_at" timestamp with time zone NOT NULL,
	"recovered_at" date,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sleep_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"went_to_bed_at" timestamp with time zone NOT NULL,
	"woke_up_at" timestamp with time zone NOT NULL,
	"is_nap" boolean DEFAULT false NOT NULL,
	"quality_rating" integer,
	"wake_feeling" integer,
	"notes" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"external_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sleep_sessions_time_check" CHECK ("sleep_sessions"."woke_up_at" > "sleep_sessions"."went_to_bed_at")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_id" uuid NOT NULL,
	"metric_type" text NOT NULL,
	"value" numeric(10, 3) NOT NULL,
	"unit" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_id" uuid NOT NULL,
	"exercise_name" text NOT NULL,
	"set_number" integer NOT NULL,
	"reps" integer,
	"weight_kg" numeric(6, 2),
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_types" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer,
	"workout_type" text NOT NULL,
	"notes" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"external_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "body_photo_files" ADD CONSTRAINT "body_photo_files_body_photo_id_body_photos_id_fk" FOREIGN KEY ("body_photo_id") REFERENCES "public"."body_photos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "body_photos" ADD CONSTRAINT "body_photos_source_sources_code_fk" FOREIGN KEY ("source") REFERENCES "public"."sources"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_ingredients" ADD CONSTRAINT "meal_ingredients_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_photos" ADD CONSTRAINT "meal_photos_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_source_sources_code_fk" FOREIGN KEY ("source") REFERENCES "public"."sources"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_source_sources_code_fk" FOREIGN KEY ("source") REFERENCES "public"."sources"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_entries" ADD CONSTRAINT "metric_entries_metric_type_metric_definitions_code_fk" FOREIGN KEY ("metric_type") REFERENCES "public"."metric_definitions"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_entries" ADD CONSTRAINT "metric_entries_source_sources_code_fk" FOREIGN KEY ("source") REFERENCES "public"."sources"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_episodes" ADD CONSTRAINT "health_episodes_source_sources_code_fk" FOREIGN KEY ("source") REFERENCES "public"."sources"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sleep_sessions" ADD CONSTRAINT "sleep_sessions_source_sources_code_fk" FOREIGN KEY ("source") REFERENCES "public"."sources"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_metrics" ADD CONSTRAINT "workout_metrics_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_photos" ADD CONSTRAINT "workout_photos_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_workout_type_workout_types_code_fk" FOREIGN KEY ("workout_type") REFERENCES "public"."workout_types"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_source_sources_code_fk" FOREIGN KEY ("source") REFERENCES "public"."sources"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "metric_entries_source_external_unique" ON "metric_entries" USING btree ("source","external_id");--> statement-breakpoint
CREATE INDEX "metric_entries_type_recorded_at_idx" ON "metric_entries" USING btree ("metric_type","recorded_at");