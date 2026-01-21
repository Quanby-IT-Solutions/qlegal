CREATE TYPE "public"."meeting_participant_status" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED');--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "enpName" varchar(255);--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "enpRoleNumber" varchar(100);--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "attyName" varchar(255);--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "rollNo" varchar(100);--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "rollNoDate" varchar(100);--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "commissionNo" varchar(100);--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "commissionNoValidUntil" varchar(100);--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "ptrNo" varchar(100);--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "ptrNoLocation" varchar(255);--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "ptrNoDate" varchar(100);--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "ibpNo" varchar(100);--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "ibpNoDate" varchar(100);--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "notaryEmail" varchar(255);--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "notaryAddress" text;--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "mcleNoPeriod" varchar(50);--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "mcleNo" varchar(100);--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "mcleNoDate" varchar(100);--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "modeOfNotarization" varchar(50);--> statement-breakpoint
ALTER TABLE "meeting_participant" ADD COLUMN "status" "meeting_participant_status" DEFAULT 'ACCEPTED' NOT NULL;--> statement-breakpoint
ALTER TABLE "meeting_participant" ADD COLUMN "invitedById" varchar(255);--> statement-breakpoint
ALTER TABLE "meeting_participant" ADD CONSTRAINT "meeting_participant_invitedById_user_id_fk" FOREIGN KEY ("invitedById") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "enp_profile_user_id_idx" ON "enp_profile" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "meeting_participants_status_idx" ON "meeting_participant" USING btree ("status");--> statement-breakpoint
ALTER TABLE "meeting_participant" DROP COLUMN "role";--> statement-breakpoint
DROP TYPE "public"."meeting_participant_role";