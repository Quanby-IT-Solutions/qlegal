DO $$ BEGIN
    CREATE TYPE "public"."kyc_status" AS ENUM('NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "liveness_validation" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"transactionId" varchar(255) NOT NULL,
	"attemptNumber" integer DEFAULT 1 NOT NULL,
	"status" varchar(50) NOT NULL,
	"errorMessage" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "liveness_validation_transactionId_unique" UNIQUE("transactionId")
);
--> statement-breakpoint
ALTER TABLE "liveness_validation" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "user" ADD COLUMN "kycTransactionId" varchar(255);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "user" ADD COLUMN "kycLink" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "user" ADD COLUMN "kycStatus" "kyc_status" DEFAULT 'NOT_STARTED';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "user" ADD COLUMN "kycVerifiedAt" timestamp with time zone;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "enp_profile" ADD COLUMN "enpName" varchar(255);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "enp_profile" ADD COLUMN "enpRoleNumber" varchar(100);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "enp_profile" ADD COLUMN "attyName" varchar(255);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "enp_profile" ADD COLUMN "rollNo" varchar(100);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "enp_profile" ADD COLUMN "rollNoDate" varchar(100);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "enp_profile" ADD COLUMN "commissionNo" varchar(100);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "enp_profile" ADD COLUMN "commissionNoValidUntil" varchar(100);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "enp_profile" ADD COLUMN "ptrNo" varchar(100);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "enp_profile" ADD COLUMN "ptrNoLocation" varchar(255);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "enp_profile" ADD COLUMN "ptrNoDate" varchar(100);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "enp_profile" ADD COLUMN "ibpNo" varchar(100);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "enp_profile" ADD COLUMN "ibpNoDate" varchar(100);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "enp_profile" ADD COLUMN "notaryEmail" varchar(255);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "enp_profile" ADD COLUMN "notaryAddress" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "enp_profile" ADD COLUMN "mcleNoPeriod" varchar(50);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "enp_profile" ADD COLUMN "mcleNo" varchar(100);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "enp_profile" ADD COLUMN "mcleNoDate" varchar(100);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "enp_profile" ADD COLUMN "modeOfNotarization" varchar(50);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "liveness_validation" ADD CONSTRAINT "liveness_validation_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "liveness_validation_user_id_idx" ON "liveness_validation" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "liveness_validation_transaction_id_idx" ON "liveness_validation" USING btree ("transactionId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "liveness_validation_status_idx" ON "liveness_validation" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "liveness_validation_created_at_idx" ON "liveness_validation" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enp_profile_user_id_idx" ON "enp_profile" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notarial_act_notarial_book_id_idx" ON "notarial_act" USING btree ("notarialBookId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notarial_act_executed_at_idx" ON "notarial_act" USING btree ("executedAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notarial_act_document_id_idx" ON "notarial_act" USING btree ("documentId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notarial_act_doco_chain_uuid_idx" ON "notarial_act" USING btree ("docoChainProjectUuid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notarial_act_principal_name_idx" ON "notarial_act" USING btree ("principalName");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notarial_act_certificate_number_idx" ON "notarial_act" USING btree ("certificateNumber");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notarial_act_enp_name_idx" ON "notarial_act" USING btree ("enpName");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notarial_act_act_type_idx" ON "notarial_act" USING btree ("actType");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notarial_act_workflow_idx" ON "notarial_act" USING btree ("workflow");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notarial_book_enp_id_idx" ON "notarial_book" USING btree ("enpId");