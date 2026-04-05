CREATE TABLE "meeting_message" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"meetingId" varchar(255) NOT NULL,
	"senderId" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meeting_message" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "meeting_participant_identity_check" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"meetingId" varchar(255) NOT NULL,
	"userId" varchar(255) NOT NULL,
	"savedIdId" varchar(255),
	"livenessValidationId" varchar(255),
	"locationVerifiedAt" timestamp with time zone,
	"locationLat" real,
	"locationLng" real,
	"locationAddress" text,
	"locationIp" varchar(255),
	"locationCountryCode" varchar(3),
	"isComplete" boolean DEFAULT false NOT NULL,
	"completedAt" timestamp with time zone,
	"snapshotDocumentType" varchar(50),
	"snapshotDocumentNumber" varchar(255),
	"snapshotFullName" varchar(500),
	"snapshotFrontImageUrl" text,
	"snapshotExpiresAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meeting_participant_identity_check" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "principal_vault_file" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"folderId" varchar(255),
	"name" varchar(255) NOT NULL,
	"mimeType" varchar(255) NOT NULL,
	"size" integer NOT NULL,
	"storagePath" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "principal_vault_file" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "principal_vault_folder_share" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"token" varchar(128) NOT NULL,
	"folderId" varchar(255) NOT NULL,
	"principalUserId" varchar(255) NOT NULL,
	"recipientEmail" varchar(255) NOT NULL,
	"recipientEnpUserId" varchar(255),
	"note" text,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "principal_vault_folder_share_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "principal_vault_folder_share" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "principal_vault_folder" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"parentId" varchar(255),
	"name" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "principal_vault_folder" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "principal_vault_share_file_comment" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"shareId" varchar(255) NOT NULL,
	"fileId" varchar(255) NOT NULL,
	"authorId" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "principal_vault_share_file_comment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "saved_id" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"kycSessionId" varchar(255),
	"documentType" varchar(50) NOT NULL,
	"documentNumber" varchar(255),
	"documentCountry" varchar(3) DEFAULT 'PHL',
	"firstName" varchar(255),
	"middleName" varchar(255),
	"lastName" varchar(255),
	"fullName" varchar(500),
	"dateOfBirth" varchar(50),
	"gender" varchar(50),
	"addressLine1" text,
	"city" varchar(255),
	"province" varchar(255),
	"country" varchar(100),
	"issueDate" varchar(50),
	"expiryDate" varchar(50),
	"expiresAt" timestamp with time zone,
	"isExpired" boolean DEFAULT false,
	"frontImageUrl" text,
	"backImageUrl" text,
	"faceImageUrl" text,
	"ocrConfidenceScore" real,
	"ocrTransactionId" varchar(255),
	"rawOcrData" jsonb,
	"isVerified" boolean DEFAULT false,
	"verifiedAt" timestamp with time zone,
	"verificationMethod" varchar(100),
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_id" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "commissionStatus" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "prefix" varchar(50);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "suffix" varchar(50);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "onboardingDetailsCompletedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "onboardingSnoozedUntil" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "enpLmsCourseCompletedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "document_signer" ADD COLUMN "identityCheckId" varchar(255);--> statement-breakpoint
ALTER TABLE "document_signer" ADD COLUMN "snapshotDocumentType" varchar(50);--> statement-breakpoint
ALTER TABLE "document_signer" ADD COLUMN "snapshotDocumentNumber" varchar(255);--> statement-breakpoint
ALTER TABLE "document_signer" ADD COLUMN "snapshotFullName" varchar(500);--> statement-breakpoint
ALTER TABLE "document_signer" ADD COLUMN "snapshotFrontImageUrl" text;--> statement-breakpoint
ALTER TABLE "notarial_act" ADD COLUMN "principalIdentityCheckId" varchar(255);--> statement-breakpoint
ALTER TABLE "notarial_act" ADD COLUMN "witnessIdentityCheckId" varchar(255);--> statement-breakpoint
ALTER TABLE "notarial_act" ADD COLUMN "principalSavedIdId" varchar(255);--> statement-breakpoint
ALTER TABLE "meeting_message" ADD CONSTRAINT "meeting_message_meetingId_meeting_id_fk" FOREIGN KEY ("meetingId") REFERENCES "public"."meeting"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_message" ADD CONSTRAINT "meeting_message_senderId_user_id_fk" FOREIGN KEY ("senderId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_participant_identity_check" ADD CONSTRAINT "meeting_participant_identity_check_meetingId_meeting_id_fk" FOREIGN KEY ("meetingId") REFERENCES "public"."meeting"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_participant_identity_check" ADD CONSTRAINT "meeting_participant_identity_check_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_participant_identity_check" ADD CONSTRAINT "meeting_participant_identity_check_savedIdId_saved_id_id_fk" FOREIGN KEY ("savedIdId") REFERENCES "public"."saved_id"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_participant_identity_check" ADD CONSTRAINT "meeting_participant_identity_check_livenessValidationId_liveness_validation_id_fk" FOREIGN KEY ("livenessValidationId") REFERENCES "public"."liveness_validation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principal_vault_file" ADD CONSTRAINT "principal_vault_file_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principal_vault_file" ADD CONSTRAINT "principal_vault_file_folderId_principal_vault_folder_id_fk" FOREIGN KEY ("folderId") REFERENCES "public"."principal_vault_folder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principal_vault_folder_share" ADD CONSTRAINT "principal_vault_folder_share_folderId_principal_vault_folder_id_fk" FOREIGN KEY ("folderId") REFERENCES "public"."principal_vault_folder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principal_vault_folder_share" ADD CONSTRAINT "principal_vault_folder_share_principalUserId_user_id_fk" FOREIGN KEY ("principalUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principal_vault_folder_share" ADD CONSTRAINT "principal_vault_folder_share_recipientEnpUserId_user_id_fk" FOREIGN KEY ("recipientEnpUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principal_vault_folder" ADD CONSTRAINT "principal_vault_folder_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principal_vault_folder" ADD CONSTRAINT "principal_vault_folder_parentId_principal_vault_folder_id_fk" FOREIGN KEY ("parentId") REFERENCES "public"."principal_vault_folder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principal_vault_share_file_comment" ADD CONSTRAINT "principal_vault_share_file_comment_shareId_principal_vault_folder_share_id_fk" FOREIGN KEY ("shareId") REFERENCES "public"."principal_vault_folder_share"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principal_vault_share_file_comment" ADD CONSTRAINT "principal_vault_share_file_comment_fileId_principal_vault_file_id_fk" FOREIGN KEY ("fileId") REFERENCES "public"."principal_vault_file"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principal_vault_share_file_comment" ADD CONSTRAINT "principal_vault_share_file_comment_authorId_user_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_id" ADD CONSTRAINT "saved_id_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_id" ADD CONSTRAINT "saved_id_kycSessionId_kyc_session_id_fk" FOREIGN KEY ("kycSessionId") REFERENCES "public"."kyc_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meeting_message_meeting_id_idx" ON "meeting_message" USING btree ("meetingId");--> statement-breakpoint
CREATE INDEX "meeting_message_created_at_idx" ON "meeting_message" USING btree ("createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "mpic_meeting_user_unique" ON "meeting_participant_identity_check" USING btree ("meetingId","userId");--> statement-breakpoint
CREATE INDEX "mpic_meeting_id_idx" ON "meeting_participant_identity_check" USING btree ("meetingId");--> statement-breakpoint
CREATE INDEX "mpic_user_id_idx" ON "meeting_participant_identity_check" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "mpic_saved_id_id_idx" ON "meeting_participant_identity_check" USING btree ("savedIdId");--> statement-breakpoint
CREATE INDEX "mpic_is_complete_idx" ON "meeting_participant_identity_check" USING btree ("isComplete");--> statement-breakpoint
CREATE INDEX "principal_vault_file_user_folder_idx" ON "principal_vault_file" USING btree ("userId","folderId");--> statement-breakpoint
CREATE INDEX "principal_vault_file_user_id_idx" ON "principal_vault_file" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "principal_vault_folder_share_token_idx" ON "principal_vault_folder_share" USING btree ("token");--> statement-breakpoint
CREATE INDEX "principal_vault_folder_share_folder_idx" ON "principal_vault_folder_share" USING btree ("folderId");--> statement-breakpoint
CREATE INDEX "principal_vault_folder_user_parent_idx" ON "principal_vault_folder" USING btree ("userId","parentId");--> statement-breakpoint
CREATE INDEX "principal_vault_folder_user_id_idx" ON "principal_vault_folder" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "principal_vault_share_file_comment_share_file_idx" ON "principal_vault_share_file_comment" USING btree ("shareId","fileId");--> statement-breakpoint
CREATE INDEX "principal_vault_share_file_comment_file_idx" ON "principal_vault_share_file_comment" USING btree ("fileId");--> statement-breakpoint
CREATE INDEX "saved_ids_user_id_idx" ON "saved_id" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "saved_ids_user_id_active_idx" ON "saved_id" USING btree ("userId","isActive");--> statement-breakpoint
CREATE INDEX "saved_ids_expires_at_idx" ON "saved_id" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "saved_ids_document_type_idx" ON "saved_id" USING btree ("documentType");--> statement-breakpoint
ALTER TABLE "document_signer" ADD CONSTRAINT "document_signer_identityCheckId_meeting_participant_identity_check_id_fk" FOREIGN KEY ("identityCheckId") REFERENCES "public"."meeting_participant_identity_check"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notarial_act" ADD CONSTRAINT "notarial_act_principalIdentityCheckId_meeting_participant_identity_check_id_fk" FOREIGN KEY ("principalIdentityCheckId") REFERENCES "public"."meeting_participant_identity_check"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notarial_act" ADD CONSTRAINT "notarial_act_witnessIdentityCheckId_meeting_participant_identity_check_id_fk" FOREIGN KEY ("witnessIdentityCheckId") REFERENCES "public"."meeting_participant_identity_check"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notarial_act" ADD CONSTRAINT "notarial_act_principalSavedIdId_saved_id_id_fk" FOREIGN KEY ("principalSavedIdId") REFERENCES "public"."saved_id"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_signers_identity_check_id_idx" ON "document_signer" USING btree ("identityCheckId");--> statement-breakpoint
CREATE INDEX "notarial_act_principal_identity_check_id_idx" ON "notarial_act" USING btree ("principalIdentityCheckId");--> statement-breakpoint
CREATE INDEX "notarial_act_witness_identity_check_id_idx" ON "notarial_act" USING btree ("witnessIdentityCheckId");--> statement-breakpoint
CREATE INDEX "notarial_act_principal_saved_id_id_idx" ON "notarial_act" USING btree ("principalSavedIdId");