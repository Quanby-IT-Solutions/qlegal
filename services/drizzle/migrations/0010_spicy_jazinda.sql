CREATE TYPE "public"."appointment_participant_role" AS ENUM('HOST', 'PARTICIPANT');--> statement-breakpoint
CREATE TYPE "public"."appointment_participant_status" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED');--> statement-breakpoint
ALTER TYPE "public"."appointment_status" ADD VALUE 'ONGOING' BEFORE 'CANCELLED';--> statement-breakpoint
CREATE TABLE "appointment_participant" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"appointmentId" varchar(255) NOT NULL,
	"userId" varchar(255) NOT NULL,
	"status" "appointment_participant_status" DEFAULT 'ACCEPTED' NOT NULL,
	"invitedById" varchar(255),
	"participant_role" "appointment_participant_role" DEFAULT 'PARTICIPANT' NOT NULL,
	"acceptedAt" timestamp with time zone,
	"declineReason" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointment_participant" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "meeting_participant" CASCADE;--> statement-breakpoint
DROP TABLE "witness" CASCADE;--> statement-breakpoint
ALTER TABLE "appointment" DROP CONSTRAINT "appointment_clientId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "appointment" DROP CONSTRAINT "appointment_lawyerId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "appointment" ADD COLUMN "userId" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "appointment" ADD COLUMN "meetingId" varchar(255);--> statement-breakpoint
ALTER TABLE "appointment" ADD COLUMN "title" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "appointment" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "appointment" ADD COLUMN "allowPublicLink" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "document_signer" ADD COLUMN "signerRole" varchar(20) DEFAULT 'principal' NOT NULL;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "messageType" varchar(50) DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "appointment_participant" ADD CONSTRAINT "appointment_participant_appointmentId_appointment_id_fk" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_participant" ADD CONSTRAINT "appointment_participant_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_participant" ADD CONSTRAINT "appointment_participant_invitedById_user_id_fk" FOREIGN KEY ("invitedById") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointment_participants_appointment_id_idx" ON "appointment_participant" USING btree ("appointmentId");--> statement-breakpoint
CREATE INDEX "appointment_participants_user_id_idx" ON "appointment_participant" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "appointment_participants_status_idx" ON "appointment_participant" USING btree ("status");--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_meetingId_meeting_id_fk" FOREIGN KEY ("meetingId") REFERENCES "public"."meeting"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" DROP COLUMN "clientId";--> statement-breakpoint
ALTER TABLE "appointment" DROP COLUMN "lawyerId";--> statement-breakpoint
ALTER TABLE "appointment" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "appointment" DROP COLUMN "meetingLink";--> statement-breakpoint
ALTER TABLE "meeting" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "meeting" DROP COLUMN "status";--> statement-breakpoint
DROP TYPE "public"."meeting_participant_role";--> statement-breakpoint
DROP TYPE "public"."meeting_participant_status";--> statement-breakpoint
DROP TYPE "public"."meeting_status";