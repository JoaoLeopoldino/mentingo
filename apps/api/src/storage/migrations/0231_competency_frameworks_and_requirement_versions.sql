CREATE TABLE IF NOT EXISTS "competency_frameworks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"categories" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "competency_frameworks_tenant_id_code_unique" UNIQUE("tenant_id","code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "competency_requirement_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL,
	"requirement_id" uuid NOT NULL,
	"job_role_id" uuid NOT NULL,
	"competency_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"minimum_level" integer NOT NULL,
	"mandatory" boolean DEFAULT true NOT NULL,
	"effective_from" timestamp(3) with time zone NOT NULL,
	"effective_until" timestamp(3) with time zone,
	"course_id" uuid,
	"learning_path_id" uuid,
	"recorded_by" uuid,
	CONSTRAINT "competency_requirement_versions_tenant_id_requirement_id_version_unique" UNIQUE("tenant_id","requirement_id","version")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "competency_scales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"levels" jsonb NOT NULL,
	CONSTRAINT "competency_scales_tenant_id_code_unique" UNIQUE("tenant_id","code")
);
--> statement-breakpoint
ALTER TABLE "competencies" ADD COLUMN "framework_id" uuid;--> statement-breakpoint
ALTER TABLE "competencies" ADD COLUMN "scale_id" uuid;--> statement-breakpoint
ALTER TABLE "competency_requirements" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "competency_requirements" ADD COLUMN "mandatory" boolean DEFAULT true NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_frameworks" ADD CONSTRAINT "competency_frameworks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_requirement_versions" ADD CONSTRAINT "competency_requirement_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_requirement_versions" ADD CONSTRAINT "competency_requirement_versions_requirement_id_competency_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."competency_requirements"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_requirement_versions" ADD CONSTRAINT "competency_requirement_versions_job_role_id_competency_job_roles_id_fk" FOREIGN KEY ("job_role_id") REFERENCES "public"."competency_job_roles"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_requirement_versions" ADD CONSTRAINT "competency_requirement_versions_competency_id_competencies_id_fk" FOREIGN KEY ("competency_id") REFERENCES "public"."competencies"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_requirement_versions" ADD CONSTRAINT "competency_requirement_versions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_requirement_versions" ADD CONSTRAINT "competency_requirement_versions_learning_path_id_learning_paths_id_fk" FOREIGN KEY ("learning_path_id") REFERENCES "public"."learning_paths"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_requirement_versions" ADD CONSTRAINT "competency_requirement_versions_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_requirement_versions" ADD CONSTRAINT "competency_requirement_versions_level_fk" FOREIGN KEY ("tenant_id","competency_id","minimum_level") REFERENCES "public"."competency_levels"("tenant_id","competency_id","rank") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_scales" ADD CONSTRAINT "competency_scales_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competency_frameworks_tenant_id_idx" ON "competency_frameworks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competency_requirement_versions_tenant_id_idx" ON "competency_requirement_versions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competency_scales_tenant_id_idx" ON "competency_scales" USING btree ("tenant_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competencies" ADD CONSTRAINT "competencies_framework_id_competency_frameworks_id_fk" FOREIGN KEY ("framework_id") REFERENCES "public"."competency_frameworks"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competencies" ADD CONSTRAINT "competencies_scale_id_competency_scales_id_fk" FOREIGN KEY ("scale_id") REFERENCES "public"."competency_scales"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
