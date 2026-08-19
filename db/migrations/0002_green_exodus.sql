CREATE TABLE "poop_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"location" text,
	"bristol_scale" integer,
	"urgency" integer,
	"effort" integer,
	"felt_complete" boolean,
	"color" text,
	"duration_minutes" integer,
	"notes" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"external_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poop_entry_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poop_entry_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "poop_entries" ADD CONSTRAINT "poop_entries_source_sources_code_fk" FOREIGN KEY ("source") REFERENCES "public"."sources"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poop_entry_photos" ADD CONSTRAINT "poop_entry_photos_poop_entry_id_poop_entries_id_fk" FOREIGN KEY ("poop_entry_id") REFERENCES "public"."poop_entries"("id") ON DELETE cascade ON UPDATE no action;