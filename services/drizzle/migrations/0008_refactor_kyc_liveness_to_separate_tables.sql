-- Create kyc_sessions table
CREATE TABLE IF NOT EXISTS "kyc_session" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"transactionId" varchar(255) NOT NULL UNIQUE,
	"sessionType" varchar(50) NOT NULL,
	"hostedLink" text,
	"hostedLinkCreatedAt" timestamp with time zone,
	"hostedLinkExpiresAt" timestamp with time zone,
	"status" text DEFAULT 'NOT_STARTED' NOT NULL,
	"idCardDetailId" varchar(255),
	"workflowMetadata" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"verifiedAt" timestamp with time zone,
	CONSTRAINT "kyc_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

-- Create indexes for kyc_sessions
CREATE INDEX IF NOT EXISTS "kyc_session_user_id_idx" ON "kyc_session" ("userId");
CREATE INDEX IF NOT EXISTS "kyc_session_transaction_id_idx" ON "kyc_session" ("transactionId");
CREATE INDEX IF NOT EXISTS "kyc_session_status_idx" ON "kyc_session" ("status");
CREATE INDEX IF NOT EXISTS "kyc_session_created_at_idx" ON "kyc_session" ("createdAt");

-- Migrate existing KYC data from users table to kyc_sessions table
-- Only migrate users who have a kycTransactionId (active or past KYC attempts)
INSERT INTO "kyc_session" (
	"id",
	"userId",
	"transactionId",
	"sessionType",
	"hostedLink",
	"hostedLinkCreatedAt",
	"hostedLinkExpiresAt",
	"status",
	"idCardDetailId",
	"createdAt",
	"updatedAt",
	"verifiedAt"
)
SELECT
	CONCAT('kyc_session_', u.id, '_', EXTRACT(EPOCH FROM COALESCE(u."kycLinkCreatedAt", now()))::text) as id,
	u.id as "userId",
	u."kycTransactionId" as "transactionId",
	CASE
		WHEN u."kycLink" IS NOT NULL AND u."kycLink" != '' THEN 'hosted'
		ELSE 'direct'
	END as "sessionType",
	u."kycLink" as "hostedLink",
	u."kycLinkCreatedAt" as "hostedLinkCreatedAt",
	CASE
		WHEN u."kycLinkCreatedAt" IS NOT NULL THEN u."kycLinkCreatedAt" + INTERVAL '24 hours'
		ELSE NULL
	END as "hostedLinkExpiresAt",
	COALESCE(u."kycStatus", 'NOT_STARTED') as status,
	NULL as "idCardDetailId", -- Will be updated after id_card_details migration
	COALESCE(u."kycLinkCreatedAt", now()) as "createdAt",
	COALESCE(u."kycLinkCreatedAt", now()) as "updatedAt",
	u."kycVerifiedAt" as "verifiedAt"
FROM "user" u
WHERE u."kycTransactionId" IS NOT NULL AND u."kycTransactionId" != ''
ON CONFLICT ("transactionId") DO NOTHING;

-- Link kyc_sessions to id_card_details where applicable
-- Match by userId and ocrTransactionId
UPDATE "kyc_session" ks
SET "idCardDetailId" = icd.id
FROM "id_card_detail" icd
WHERE ks."userId" = icd."userId"
	AND ks."transactionId" = icd."ocrTransactionId"
	AND ks."status" = 'VERIFIED'
	AND ks."idCardDetailId" IS NULL;

-- Remove duplicate/legacy KYC columns from users table
-- Keep only: kycStatus, kycVerifiedAt (for quick lookups)
ALTER TABLE "user" DROP COLUMN IF EXISTS "kycTransactionId";
ALTER TABLE "user" DROP COLUMN IF EXISTS "kycLink";
ALTER TABLE "user" DROP COLUMN IF EXISTS "kycLinkCreatedAt";
ALTER TABLE "user" DROP COLUMN IF EXISTS "kycReferenceIdImageBase64";
ALTER TABLE "user" DROP COLUMN IF EXISTS "kycReferenceCreatedAt";
ALTER TABLE "user" DROP COLUMN IF EXISTS "kycOcrExtractedFieldsJson";
ALTER TABLE "user" DROP COLUMN IF EXISTS "kycOcrCreatedAt";

-- Remove liveness columns from users table (data already in liveness_validations table)
ALTER TABLE "user" DROP COLUMN IF EXISTS "livenessVerified";
ALTER TABLE "user" DROP COLUMN IF EXISTS "livenessVerifiedAt";
ALTER TABLE "user" DROP COLUMN IF EXISTS "livenessTransactionId";

-- Add comment to document the refactoring
COMMENT ON TABLE "kyc_session" IS 'Tracks KYC verification workflow sessions. Separates session management from structured ID data (id_card_detail table).';
COMMENT ON TABLE "liveness_validation" IS 'Tracks liveness validation attempts per user and optionally per meeting. Replaces legacy user.livenessVerified fields.';
