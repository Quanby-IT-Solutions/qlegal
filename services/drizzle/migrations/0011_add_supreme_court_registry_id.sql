-- Add supremeCourtRegistryId (NRID) to notarial_act for Supreme Court eNotarization sync.
DO $$ BEGIN
    ALTER TABLE "notarial_act" ADD COLUMN "supremeCourtRegistryId" varchar(255);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
