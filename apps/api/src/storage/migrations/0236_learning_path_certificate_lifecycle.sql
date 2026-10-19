ALTER TABLE "learning_path_certificates" ADD COLUMN "revoked_at" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "learning_path_certificates" ADD COLUMN "revoked_by" uuid;--> statement-breakpoint
ALTER TABLE "learning_path_certificates" ADD COLUMN "revocation_reason" text;--> statement-breakpoint
ALTER TABLE "learning_path_certificates" ADD COLUMN "replaces_certificate_id" uuid;--> statement-breakpoint
ALTER TABLE "learning_path_certificates" ADD COLUMN "renewal_reason" text;--> statement-breakpoint
ALTER TABLE "learning_path_certificates" ADD COLUMN "issued_by" uuid;--> statement-breakpoint
ALTER TABLE "learning_path_certificates" ADD COLUMN "completion_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learning_path_certificates" ADD CONSTRAINT "learning_path_certificates_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learning_path_certificates" ADD CONSTRAINT "learning_path_certificates_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "learning_path_certificates_renewal_source_idx" ON "learning_path_certificates" USING btree ("tenant_id","replaces_certificate_id");