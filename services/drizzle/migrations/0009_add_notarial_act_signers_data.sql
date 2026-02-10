-- Add signersData to notarial_act so we can store signer list and show it in the registry without calling DocoChain.
DO $$ BEGIN
    ALTER TABLE "notarial_act" ADD COLUMN "signersData" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
