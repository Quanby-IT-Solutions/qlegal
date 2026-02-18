CREATE TYPE "public"."meeting_participant_role" AS ENUM('PRINCIPAL', 'WITNESS');--> statement-breakpoint
ALTER TABLE "appointment" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."appointment_type";--> statement-breakpoint
CREATE TYPE "public"."appointment_type" AS ENUM('NOTARIZATION', 'CONSULTATION');--> statement-breakpoint
ALTER TABLE "appointment" ALTER COLUMN "type" SET DATA TYPE "public"."appointment_type" USING "type"::"public"."appointment_type";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "homeStreet" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "barangay" varchar(255);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "cityProvince" varchar(255);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "commissionStatus" "user_status" DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "notaryPublicNumber" varchar(100);--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "notaryFacilityNumber" varchar(100);--> statement-breakpoint
ALTER TABLE "meeting_participant" ADD COLUMN "participant_role" "meeting_participant_role" DEFAULT 'PRINCIPAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "notarial_act" ADD COLUMN "signersData" text;--> statement-breakpoint
ALTER TABLE "notarial_act" ADD COLUMN "supremeCourtRegistryId" varchar(255);--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "status";