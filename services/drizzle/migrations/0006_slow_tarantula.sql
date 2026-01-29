CREATE TYPE "public"."enp_availability_type" AS ENUM('REGULAR', 'BLOCKED', 'CUSTOM', 'RECURRING_BLOCKED');--> statement-breakpoint
CREATE TYPE "public"."notarization_type" AS ENUM('ACKNOWLEDGMENT', 'AFFIRMATION', 'JURAT', 'SIGNATURE_WITNESSING');--> statement-breakpoint
CREATE TABLE "document_signer" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"documentId" varchar(255) NOT NULL,
	"userId" varchar(255) NOT NULL,
	"signerName" varchar(255),
	"signerAddress" text,
	"signingOrder" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_signer" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "id_card_detail" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"documentType" varchar(50) NOT NULL,
	"documentNumber" varchar(255),
	"documentCountry" varchar(3) DEFAULT 'PHL',
	"firstName" varchar(255),
	"middleName" varchar(255),
	"lastName" varchar(255),
	"fullName" varchar(500),
	"dateOfBirth" varchar(50),
	"gender" varchar(50),
	"nationality" varchar(100),
	"addressLine1" text,
	"addressLine2" text,
	"city" varchar(255),
	"province" varchar(255),
	"postalCode" varchar(20),
	"country" varchar(100),
	"issueDate" varchar(50),
	"expiryDate" varchar(50),
	"isExpired" boolean DEFAULT false,
	"additionalFields" jsonb,
	"ocrConfidenceScore" real,
	"ocrProvider" varchar(100) DEFAULT 'hyperverge',
	"ocrTransactionId" varchar(255),
	"rawOcrData" jsonb,
	"frontImageUrl" text,
	"backImageUrl" text,
	"faceImageUrl" text,
	"isVerified" boolean DEFAULT false,
	"verifiedAt" timestamp with time zone,
	"verificationMethod" varchar(100),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "id_card_detail" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';--> statement-breakpoint
ALTER TABLE "enp_availability" ALTER COLUMN "dayOfWeek" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointment" ADD COLUMN "modeOfNotarization" varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "kycReferenceIdImageBase64" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "kycReferenceCreatedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "kycOcrExtractedFieldsJson" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "kycOcrCreatedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "notarization_type" "notarization_type";--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "fees" real;--> statement-breakpoint
ALTER TABLE "enp_availability" ADD COLUMN "type" varchar(50) DEFAULT 'REGULAR' NOT NULL;--> statement-breakpoint
ALTER TABLE "enp_availability" ADD COLUMN "date" date;--> statement-breakpoint
ALTER TABLE "enp_availability" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "enp_availability" ADD COLUMN "isAllDays" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "consultationPrice" real;--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "acknowledgmentPrice" real;--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "affirmationPrice" real;--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "juratPrice" real;--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "signatureWitnessingPrice" real;--> statement-breakpoint
ALTER TABLE "liveness_validation" ADD COLUMN "decisionJson" text;--> statement-breakpoint
ALTER TABLE "liveness_validation" ADD COLUMN "rawResultJson" text;--> statement-breakpoint
ALTER TABLE "liveness_validation" ADD COLUMN "updatedAt" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "notarial_act" ADD COLUMN "principalIdImageBase64" text;--> statement-breakpoint
ALTER TABLE "notarial_act" ADD COLUMN "principalIdType" varchar(100);--> statement-breakpoint
ALTER TABLE "notarial_act" ADD COLUMN "locationStatement" text;--> statement-breakpoint
ALTER TABLE "document_signer" ADD CONSTRAINT "document_signer_documentId_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_signer" ADD CONSTRAINT "document_signer_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "id_card_detail" ADD CONSTRAINT "id_card_detail_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_signers_document_id_idx" ON "document_signer" USING btree ("documentId");--> statement-breakpoint
CREATE INDEX "document_signers_user_id_idx" ON "document_signer" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "document_signers_document_user_unique_idx" ON "document_signer" USING btree ("documentId","userId");--> statement-breakpoint
CREATE INDEX "id_card_details_user_id_idx" ON "id_card_detail" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "id_card_details_document_number_idx" ON "id_card_detail" USING btree ("documentNumber");--> statement-breakpoint
CREATE INDEX "id_card_details_document_type_idx" ON "id_card_detail" USING btree ("documentType");--> statement-breakpoint
CREATE INDEX "id_card_details_verified_idx" ON "id_card_detail" USING btree ("isVerified");--> statement-breakpoint
CREATE INDEX "liveness_validation_updated_at_idx" ON "liveness_validation" USING btree ("updatedAt");--> statement-breakpoint
ALTER TABLE "enp_profile" DROP COLUMN "attyName";--> statement-breakpoint
ALTER TABLE "enp_profile" DROP COLUMN "notaryEmail";--> statement-breakpoint
ALTER TABLE "enp_profile" DROP COLUMN "modeOfNotarization";