CREATE TABLE "kyc_session" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"transactionId" varchar(255) NOT NULL,
	"sessionType" varchar(50) NOT NULL,
	"hostedLink" text,
	"hostedLinkCreatedAt" timestamp with time zone,
	"hostedLinkExpiresAt" timestamp with time zone,
	"status" "kyc_status" DEFAULT 'NOT_STARTED' NOT NULL,
	"idCardDetailId" varchar(255),
	"workflowMetadata" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"verifiedAt" timestamp with time zone,
	CONSTRAINT "kyc_session_transactionId_unique" UNIQUE("transactionId")
);
--> statement-breakpoint
ALTER TABLE "kyc_session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "appointment" ALTER COLUMN "modeOfNotarization" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notarial_act" ADD COLUMN "meetingEndedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "kyc_session" ADD CONSTRAINT "kyc_session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kyc_session_user_id_idx" ON "kyc_session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "kyc_session_transaction_id_idx" ON "kyc_session" USING btree ("transactionId");--> statement-breakpoint
CREATE INDEX "kyc_session_status_idx" ON "kyc_session" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kyc_session_created_at_idx" ON "kyc_session" USING btree ("createdAt");--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "kycTransactionId";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "kycLink";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "kycLinkCreatedAt";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "kycReferenceIdImageBase64";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "kycReferenceCreatedAt";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "kycOcrExtractedFieldsJson";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "kycOcrCreatedAt";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "livenessVerified";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "livenessVerifiedAt";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "livenessTransactionId";--> statement-breakpoint
ALTER TABLE "enp_profile" DROP COLUMN "enpName";--> statement-breakpoint
ALTER TABLE "enp_profile" DROP COLUMN "enpRoleNumber";