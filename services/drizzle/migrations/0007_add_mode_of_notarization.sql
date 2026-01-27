DO $$ BEGIN
    ALTER TABLE "appointment" ADD COLUMN "modeOfNotarization" varchar(10) NOT NULL DEFAULT 'REN';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
