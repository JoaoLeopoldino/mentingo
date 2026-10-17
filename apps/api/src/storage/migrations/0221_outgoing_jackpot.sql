DROP INDEX IF EXISTS "scorm_attempts_student_package_sco_attempt_unique_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "assessment_attempts_tenant_assessment_learner_number_idx";--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "learning_cycle" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "scorm_attempts" ADD COLUMN "learning_cycle" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "student_courses" ADD COLUMN "learning_cycle" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD COLUMN "learning_cycle" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "certificates_active_user_course_cycle_idx" ON "certificates" USING btree ("tenant_id","user_id","course_id","learning_cycle") WHERE "certificates"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "scorm_attempts_student_package_sco_attempt_unique_idx" ON "scorm_attempts" USING btree ("student_id","package_id","sco_id","learning_cycle","attempt_number");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assessment_attempts_tenant_assessment_learner_number_idx" ON "assessment_attempts" USING btree ("tenant_id","assessment_id","learner_id","learning_cycle","attempt_number");