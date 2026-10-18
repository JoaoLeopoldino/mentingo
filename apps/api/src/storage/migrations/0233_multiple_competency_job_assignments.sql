ALTER TABLE "competency_assignments" DROP CONSTRAINT "competency_assignments_tenant_id_user_id_unique";--> statement-breakpoint
ALTER TABLE "competency_assignments" ADD COLUMN "is_primary" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "competency_assignments" ADD COLUMN "state" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "competency_assignments" ADD COLUMN "manager_id" uuid;--> statement-breakpoint
ALTER TABLE "competency_assignments" ADD COLUMN "starts_at" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "competency_assignments" ADD COLUMN "ends_at" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "competency_assignments" ADD COLUMN "external_hr_id" text;--> statement-breakpoint
ALTER TABLE "competency_assignments" ADD COLUMN "command_hash" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_assignments" ADD CONSTRAINT "competency_assignments_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "competency_assignments_primary_active_unique" ON "competency_assignments" USING btree ("tenant_id","user_id") WHERE "competency_assignments"."is_primary" = true AND "competency_assignments"."state" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "competency_assignments_external_unique" ON "competency_assignments" USING btree ("tenant_id","external_hr_id") WHERE "competency_assignments"."external_hr_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competency_assignments_employee_idx" ON "competency_assignments" USING btree ("tenant_id","user_id","state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competency_assignments_manager_idx" ON "competency_assignments" USING btree ("tenant_id","manager_id","state");