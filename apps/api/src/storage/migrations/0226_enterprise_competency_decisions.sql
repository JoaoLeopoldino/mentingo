CREATE TABLE IF NOT EXISTS "competency_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"competency_id" uuid NOT NULL,
	"level" integer NOT NULL,
	"revision" integer NOT NULL,
	"source_evidence_id" uuid,
	"supersedes_assessment_id" uuid,
	"rationale" text NOT NULL,
	"assessor_id" uuid NOT NULL,
	"assessed_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expires_at" timestamp(3) with time zone,
	"review_at" timestamp(3) with time zone,
	"command_hash" text NOT NULL,
	CONSTRAINT "competency_assessments_tenant_id_user_id_competency_id_revision_unique" UNIQUE("tenant_id","user_id","competency_id","revision")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "competency_evidence_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL,
	"evidence_id" uuid NOT NULL,
	"status" text NOT NULL,
	"rationale" text NOT NULL,
	"reviewer_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "competency_revocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"reason" text NOT NULL,
	"responsible_id" uuid NOT NULL,
	"effective_at" timestamp(3) with time zone NOT NULL,
	"ends_at" timestamp(3) with time zone,
	"command_hash" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_assessments" ADD CONSTRAINT "competency_assessments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_assessments" ADD CONSTRAINT "competency_assessments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_assessments" ADD CONSTRAINT "competency_assessments_competency_id_competencies_id_fk" FOREIGN KEY ("competency_id") REFERENCES "public"."competencies"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_assessments" ADD CONSTRAINT "competency_assessments_source_evidence_id_competency_evidence_id_fk" FOREIGN KEY ("source_evidence_id") REFERENCES "public"."competency_evidence"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_assessments" ADD CONSTRAINT "competency_assessments_supersedes_assessment_id_competency_assessments_id_fk" FOREIGN KEY ("supersedes_assessment_id") REFERENCES "public"."competency_assessments"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_assessments" ADD CONSTRAINT "competency_assessments_assessor_id_users_id_fk" FOREIGN KEY ("assessor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_assessments" ADD CONSTRAINT "competency_assessments_level_fk" FOREIGN KEY ("tenant_id","competency_id","level") REFERENCES "public"."competency_levels"("tenant_id","competency_id","rank") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_evidence_reviews" ADD CONSTRAINT "competency_evidence_reviews_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_evidence_reviews" ADD CONSTRAINT "competency_evidence_reviews_evidence_id_competency_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."competency_evidence"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_evidence_reviews" ADD CONSTRAINT "competency_evidence_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_revocations" ADD CONSTRAINT "competency_revocations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_revocations" ADD CONSTRAINT "competency_revocations_assessment_id_competency_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."competency_assessments"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_revocations" ADD CONSTRAINT "competency_revocations_responsible_id_users_id_fk" FOREIGN KEY ("responsible_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competency_assessments_tenant_id_idx" ON "competency_assessments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competency_evidence_reviews_tenant_id_idx" ON "competency_evidence_reviews" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competency_evidence_reviews_evidence_idx" ON "competency_evidence_reviews" USING btree ("tenant_id","evidence_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competency_revocations_tenant_id_idx" ON "competency_revocations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competency_revocations_assessment_idx" ON "competency_revocations" USING btree ("tenant_id","assessment_id","effective_at");