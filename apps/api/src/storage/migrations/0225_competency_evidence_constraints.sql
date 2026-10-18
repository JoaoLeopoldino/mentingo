DO $$ BEGIN
 ALTER TABLE "competency_evidence" ADD CONSTRAINT "competency_evidence_level_fk" FOREIGN KEY ("tenant_id","competency_id","level") REFERENCES "public"."competency_levels"("tenant_id","competency_id","rank") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competency_requirements" ADD CONSTRAINT "competency_requirements_level_fk" FOREIGN KEY ("tenant_id","competency_id","minimum_level") REFERENCES "public"."competency_levels"("tenant_id","competency_id","rank") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
