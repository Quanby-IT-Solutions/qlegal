DO $$ BEGIN
	ALTER TABLE "user" ADD COLUMN "kycLastExpiredAt" timestamp with time zone;
EXCEPTION
	WHEN duplicate_column THEN null;
END $$;
