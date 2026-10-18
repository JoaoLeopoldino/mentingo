CREATE TABLE IF NOT EXISTS "competency_development_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"competency_id" uuid NOT NULL,
	"title" text NOT NULL,
	"target_level" integer NOT NULL,
	"deadline" timestamp(3) with time zone NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"responsible_id" uuid,
	"created_by" uuid NOT NULL,
	"completed_assessment_id" uuid,
	"command_hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "competency_plan_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"title" text NOT NULL,
	"course_id" uuid,
	"learning_path_id" uuid,
	"reported_at" timestamp(3) with time zone,
	"reported_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "competency_plan_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"rationale" text NOT NULL,
	"version" integer NOT NULL,
	"from_state" text,
	"to_state" text NOT NULL,
	"activity_id" uuid,
	"assessment_id" uuid,
	"command_hash" text NOT NULL,
	CONSTRAINT "competency_plan_history_tenant_id_plan_id_version_unique" UNIQUE("tenant_id","plan_id","version")
);
--> statement-breakpoint
ALTER TABLE "competency_evidence" ADD COLUMN "development_plan_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_development_plans" ADD CONSTRAINT "competency_development_plans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_development_plans" ADD CONSTRAINT "competency_development_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_development_plans" ADD CONSTRAINT "competency_development_plans_competency_id_competencies_id_fk" FOREIGN KEY ("competency_id") REFERENCES "public"."competencies"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_development_plans" ADD CONSTRAINT "competency_development_plans_responsible_id_users_id_fk" FOREIGN KEY ("responsible_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_development_plans" ADD CONSTRAINT "competency_development_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_development_plans" ADD CONSTRAINT "competency_development_plans_completed_assessment_id_competency_assessments_id_fk" FOREIGN KEY ("completed_assessment_id") REFERENCES "public"."competency_assessments"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_development_plans" ADD CONSTRAINT "competency_plans_level_fk" FOREIGN KEY ("tenant_id","competency_id","target_level") REFERENCES "public"."competency_levels"("tenant_id","competency_id","rank") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_plan_activities" ADD CONSTRAINT "competency_plan_activities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_plan_activities" ADD CONSTRAINT "competency_plan_activities_plan_id_competency_development_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."competency_development_plans"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_plan_activities" ADD CONSTRAINT "competency_plan_activities_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_plan_activities" ADD CONSTRAINT "competency_plan_activities_learning_path_id_learning_paths_id_fk" FOREIGN KEY ("learning_path_id") REFERENCES "public"."learning_paths"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_plan_activities" ADD CONSTRAINT "competency_plan_activities_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_plan_history" ADD CONSTRAINT "competency_plan_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_plan_history" ADD CONSTRAINT "competency_plan_history_plan_id_competency_development_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."competency_development_plans"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_plan_history" ADD CONSTRAINT "competency_plan_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_plan_history" ADD CONSTRAINT "competency_plan_history_activity_id_competency_plan_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."competency_plan_activities"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_plan_history" ADD CONSTRAINT "competency_plan_history_assessment_id_competency_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."competency_assessments"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competency_development_plans_tenant_id_idx" ON "competency_development_plans" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competency_plans_employee_idx" ON "competency_development_plans" USING btree ("tenant_id","user_id","state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competency_plan_activities_tenant_id_idx" ON "competency_plan_activities" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competency_plan_activities_plan_idx" ON "competency_plan_activities" USING btree ("tenant_id","plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competency_plan_history_tenant_id_idx" ON "competency_plan_history" USING btree ("tenant_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_evidence" ADD CONSTRAINT "competency_evidence_development_plan_id_competency_development_plans_id_fk" FOREIGN KEY ("development_plan_id") REFERENCES "public"."competency_development_plans"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
