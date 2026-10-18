ALTER TABLE "certificates" ADD COLUMN "revocation_reason" text;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "revoked_by" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "certificates" ADD CONSTRAINT "certificates_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
