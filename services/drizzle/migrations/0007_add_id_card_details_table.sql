-- Create id_card_detail table for structured KYC ID card information
CREATE TABLE IF NOT EXISTS "id_card_detail" (
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

-- Add foreign key constraint
DO $$ BEGIN
	ALTER TABLE "id_card_detail" ADD CONSTRAINT "id_card_detail_userId_user_id_fk" 
	FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "id_card_details_user_id_idx" ON "id_card_detail" ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "id_card_details_document_number_idx" ON "id_card_detail" ("documentNumber");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "id_card_details_document_type_idx" ON "id_card_detail" ("documentType");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "id_card_details_verified_idx" ON "id_card_detail" ("isVerified");
--> statement-breakpoint

-- Enable RLS (Row Level Security)
ALTER TABLE "id_card_detail" ENABLE ROW LEVEL SECURITY;
