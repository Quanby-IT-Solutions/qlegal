CREATE TYPE "public"."appointment_status" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."appointment_type" AS ENUM('DOCUMENT_SIGNING', 'CONSULTATION');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('UPLOADED', 'PROCESSING', 'READY', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."legal_application_status" AS ENUM('DRAFT', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."meeting_status" AS ENUM('SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ENP', 'PRINCIPAL', 'ENA', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'PENDING', 'SUSPENDED');--> statement-breakpoint
CREATE TABLE "appointment" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"clientId" varchar(255) NOT NULL,
	"lawyerId" varchar(255) NOT NULL,
	"type" "appointment_type" NOT NULL,
	"status" "appointment_status" DEFAULT 'PENDING' NOT NULL,
	"appointmentDate" timestamp with time zone NOT NULL,
	"duration" integer DEFAULT 60 NOT NULL,
	"notes" text,
	"location" text,
	"meetingLink" text,
	"cancelReason" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "account" (
	"userId" varchar(255) NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"providerAccountId" varchar(255) NOT NULL,
	"refreshToken" text,
	"accessToken" text,
	"expiresAt" integer,
	"tokenType" varchar(255),
	"scope" varchar(255),
	"idToken" text,
	"sessionState" varchar(255),
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "password_reset_token" (
	"id" varchar(255) PRIMARY KEY DEFAULT '707a9add-e300-4f52-bc98-73c8eff74fb9' NOT NULL,
	"email" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "password_reset_token" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "two_factor_confirmation" (
	"id" varchar(255) PRIMARY KEY DEFAULT 'b7e1ac7d-c179-4bba-b424-17358f4b74fe' NOT NULL,
	"userId" varchar(255) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "two_factor_confirmation" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "two_factor_token" (
	"id" varchar(255) PRIMARY KEY DEFAULT '382f5dc4-faf4-4fb8-bae8-08feb469a492' NOT NULL,
	"email" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "two_factor_token" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"email" varchar(255),
	"emailVerified" timestamp with time zone,
	"image" text,
	"password" text,
	"isTwoFactorEnabled" boolean DEFAULT false,
	"phoneNumber" varchar(255),
	"role" "user_role" DEFAULT 'PRINCIPAL' NOT NULL,
	"status" "user_status" DEFAULT 'PENDING' NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "verification_token" (
	"id" varchar(255) PRIMARY KEY DEFAULT '363901ff-fa7e-41cb-91e5-6c8cbfd9defc' NOT NULL,
	"email" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verification_token" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "document" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(255) NOT NULL,
	"size" integer NOT NULL,
	"path" varchar(255) DEFAULT '',
	"status" "document_status" DEFAULT 'UPLOADED' NOT NULL,
	"docoChainProjectId" varchar(255),
	"docoChainRedirectUrl" text,
	"envelopeId" varchar(255),
	"meetingId" varchar(255),
	"order" integer DEFAULT 0,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "enp_availability" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"enpId" varchar(255) NOT NULL,
	"dayOfWeek" integer NOT NULL,
	"startTime" varchar(5) NOT NULL,
	"endTime" varchar(5) NOT NULL,
	"isAvailable" boolean DEFAULT true,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "enp_availability" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "enp_profile" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"specialization" text,
	"bio" text,
	"experience" varchar(255),
	"languages" text,
	"responseTime" varchar(255),
	"rating" real DEFAULT 0,
	"reviewCount" integer DEFAULT 0,
	"commission" real DEFAULT 0,
	"isAvailable" boolean DEFAULT true,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enp_profile_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
ALTER TABLE "enp_profile" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "envelope" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"token" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(255) DEFAULT 'DRAFT' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"userId" varchar(255) NOT NULL,
	CONSTRAINT "envelope_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "envelope" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "legal_registration" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"applicantId" varchar(255) NOT NULL,
	"status" "legal_application_status" DEFAULT 'DRAFT' NOT NULL,
	"citizenship" varchar(255) NOT NULL,
	"dateOfBirth" timestamp with time zone NOT NULL,
	"residentialAddress" text NOT NULL,
	"workOrBusinessAddress" text NOT NULL,
	"telephoneNumber" varchar(50),
	"mobileNumber" varchar(50) NOT NULL,
	"emailAddress" varchar(255) NOT NULL,
	"professionalTaxReceiptNumber" varchar(255) NOT NULL,
	"rollOfAttorneysNumber" varchar(255) NOT NULL,
	"ibpMembershipNumber" varchar(255) NOT NULL,
	"mcleComplianceNumber" varchar(255) NOT NULL,
	"ulasComplianceNumber" varchar(255) NOT NULL,
	"obcCertificationUrl" text NOT NULL,
	"ibpCertificationUrl" text NOT NULL,
	"passportPhotoUrl" text NOT NULL,
	"paymentProofUrl" text NOT NULL,
	"enfProviderCertificationUrl" text NOT NULL,
	"undertakingElectronicNotarialActs" boolean DEFAULT false NOT NULL,
	"undertakingDataSharingGuidelines" boolean DEFAULT false NOT NULL,
	"electronicSignatureApplied" boolean DEFAULT false NOT NULL,
	"electronicSignatureUrl" text,
	"submittedAt" timestamp with time zone,
	"reviewedAt" timestamp with time zone,
	"approvedAt" timestamp with time zone,
	"rejectedAt" timestamp with time zone,
	"reviewedBy" varchar(255),
	"remarks" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legal_registration_applicantId_unique" UNIQUE("applicantId")
);
--> statement-breakpoint
ALTER TABLE "legal_registration" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "meeting_participant" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"meetingId" varchar(255) NOT NULL,
	"userId" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meeting_participant" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "meeting" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"roomId" varchar(255) NOT NULL,
	"status" "meeting_status" DEFAULT 'SCHEDULED' NOT NULL,
	"createdById" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meeting" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "message_attachment" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"conversationId" varchar(255) NOT NULL,
	"uploadedBy" varchar(255) NOT NULL,
	"fileName" varchar(255) NOT NULL,
	"fileSize" integer NOT NULL,
	"fileType" varchar(100) NOT NULL,
	"filePath" text NOT NULL,
	"fileUrl" text,
	"uploadType" varchar(50) DEFAULT 'general' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_attachment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "conversation_participant" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"conversationId" varchar(255) NOT NULL,
	"userId" varchar(255) NOT NULL,
	"joinedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastReadAt" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "conversation_participant" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "conversation" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "message" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"conversationId" varchar(255) NOT NULL,
	"senderId" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "signature_request" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"meetingId" varchar(255) NOT NULL,
	"documentId" varchar(255) NOT NULL,
	"requesterId" varchar(255) NOT NULL,
	"signerId" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"signedAt" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "signature_request" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "witness" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"enpId" varchar(255) NOT NULL,
	"appointmentId" varchar(255),
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phoneNumber" varchar(255),
	"address" text,
	"idType" varchar(255),
	"idNumber" varchar(255),
	"idVerified" boolean DEFAULT false NOT NULL,
	"idVerifiedAt" timestamp with time zone,
	"signaturePath" text,
	"signatureCaptured" boolean DEFAULT false NOT NULL,
	"signatureCapturedAt" timestamp with time zone,
	"status" varchar(255) DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "witness" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_clientId_user_id_fk" FOREIGN KEY ("clientId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_lawyerId_user_id_fk" FOREIGN KEY ("lawyerId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_email_user_email_fk" FOREIGN KEY ("email") REFERENCES "public"."user"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor_confirmation" ADD CONSTRAINT "two_factor_confirmation_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor_token" ADD CONSTRAINT "two_factor_token_email_user_email_fk" FOREIGN KEY ("email") REFERENCES "public"."user"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_token" ADD CONSTRAINT "verification_token_email_user_email_fk" FOREIGN KEY ("email") REFERENCES "public"."user"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_envelopeId_envelope_id_fk" FOREIGN KEY ("envelopeId") REFERENCES "public"."envelope"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_meetingId_meeting_id_fk" FOREIGN KEY ("meetingId") REFERENCES "public"."meeting"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enp_availability" ADD CONSTRAINT "enp_availability_enpId_user_id_fk" FOREIGN KEY ("enpId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enp_profile" ADD CONSTRAINT "enp_profile_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envelope" ADD CONSTRAINT "envelope_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_registration" ADD CONSTRAINT "legal_registration_applicantId_user_id_fk" FOREIGN KEY ("applicantId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_participant" ADD CONSTRAINT "meeting_participant_meetingId_meeting_id_fk" FOREIGN KEY ("meetingId") REFERENCES "public"."meeting"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_participant" ADD CONSTRAINT "meeting_participant_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting" ADD CONSTRAINT "meeting_createdById_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachment" ADD CONSTRAINT "message_attachment_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachment" ADD CONSTRAINT "message_attachment_uploadedBy_user_id_fk" FOREIGN KEY ("uploadedBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_senderId_user_id_fk" FOREIGN KEY ("senderId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_request" ADD CONSTRAINT "signature_request_meetingId_meeting_id_fk" FOREIGN KEY ("meetingId") REFERENCES "public"."meeting"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_request" ADD CONSTRAINT "signature_request_documentId_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_request" ADD CONSTRAINT "signature_request_requesterId_user_id_fk" FOREIGN KEY ("requesterId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_request" ADD CONSTRAINT "signature_request_signerId_user_id_fk" FOREIGN KEY ("signerId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "witness" ADD CONSTRAINT "witness_enpId_user_id_fk" FOREIGN KEY ("enpId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "witness" ADD CONSTRAINT "witness_appointmentId_appointment_id_fk" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "legal_registration_status_idx" ON "legal_registration" USING btree ("status");--> statement-breakpoint
CREATE INDEX "legal_registration_applicant_id_idx" ON "legal_registration" USING btree ("applicantId");--> statement-breakpoint
CREATE INDEX "meeting_participants_meeting_id_idx" ON "meeting_participant" USING btree ("meetingId");--> statement-breakpoint
CREATE INDEX "meeting_participants_user_id_idx" ON "meeting_participant" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "meetings_room_id_idx" ON "meeting" USING btree ("roomId");--> statement-breakpoint
CREATE INDEX "meetings_created_by_idx" ON "meeting" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "message_attachment_conversation_id_idx" ON "message_attachment" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX "message_attachment_upload_type_idx" ON "message_attachment" USING btree ("uploadType");--> statement-breakpoint
CREATE INDEX "message_attachment_created_at_idx" ON "message_attachment" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "conversation_participant_conversation_id_idx" ON "conversation_participant" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX "conversation_participant_user_id_idx" ON "conversation_participant" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "conversation_updated_at_idx" ON "conversation" USING btree ("updatedAt");--> statement-breakpoint
CREATE INDEX "message_conversation_id_idx" ON "message" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX "message_created_at_idx" ON "message" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "signature_requests_meeting_id_idx" ON "signature_request" USING btree ("meetingId");--> statement-breakpoint
CREATE INDEX "signature_requests_signer_id_idx" ON "signature_request" USING btree ("signerId");--> statement-breakpoint
CREATE INDEX "signature_requests_status_idx" ON "signature_request" USING btree ("status");