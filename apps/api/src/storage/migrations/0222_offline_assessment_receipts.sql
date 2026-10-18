ALTER TABLE "assessment_attempts" ADD COLUMN "offline_client_attempt_id" uuid;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD COLUMN "offline_payload_hash" text;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD COLUMN "offline_client_submitted_at" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD COLUMN "offline_sync_result" jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assessment_attempts_tenant_learner_offline_operation_idx" ON "assessment_attempts" USING btree ("tenant_id","learner_id","offline_client_attempt_id") WHERE "assessment_attempts"."offline_client_attempt_id" IS NOT NULL;