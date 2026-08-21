CREATE TABLE "nutrition_goal_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"period_key" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"matched_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"achieved_quantity" numeric(10, 2) NOT NULL,
	"percent_complete" numeric(6, 2) NOT NULL,
	"met" boolean NOT NULL,
	"evaluated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "nutrition_goal_evaluations_goal_id_period_key_unique" UNIQUE("goal_id","period_key")
);
--> statement-breakpoint
CREATE TABLE "nutrition_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_label" text NOT NULL,
	"subject_type" text NOT NULL,
	"clarification" text,
	"limit_type" text NOT NULL,
	"target_quantity" numeric(10, 2) NOT NULL,
	"unit" text NOT NULL,
	"timespan" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "nutrition_goal_evaluations" ADD CONSTRAINT "nutrition_goal_evaluations_goal_id_nutrition_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."nutrition_goals"("id") ON DELETE cascade ON UPDATE no action;