-- Role assigned by ENP when adding signers: principal or witness (no longer inferred from invite).
ALTER TABLE "document_signer" ADD COLUMN IF NOT EXISTS "signerRole" varchar(20) DEFAULT 'principal' NOT NULL;
