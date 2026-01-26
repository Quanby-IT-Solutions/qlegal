DO $$ BEGIN
    ALTER TABLE "user" ADD COLUMN "kycReferenceIdImageBase64" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "user" ADD COLUMN "kycReferenceCreatedAt" timestamp with time zone;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
