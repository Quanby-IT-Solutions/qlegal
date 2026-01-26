DO $$ BEGIN
    ALTER TABLE "user" ADD COLUMN "kycOcrExtractedFieldsJson" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "user" ADD COLUMN "kycOcrCreatedAt" timestamp with time zone;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
