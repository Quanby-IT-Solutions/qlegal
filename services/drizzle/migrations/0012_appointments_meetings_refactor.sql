-- Add ONGOING to appointment_status (safe to run multiple times)
ALTER TYPE "public"."appointment_status" ADD VALUE IF NOT EXISTS 'ONGOING';

-- Create new participant enums
DO $$ BEGIN
    CREATE TYPE "public"."appointment_participant_role" AS ENUM('HOST', 'PARTICIPANT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."appointment_participant_status" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- appointment table — drop old columns, add new columns + FK constraints
DO $$ BEGIN
    ALTER TABLE "appointment" DROP COLUMN "clientId";
EXCEPTION WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "appointment" DROP COLUMN "meetingLink";
EXCEPTION WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "appointment" DROP COLUMN "notes";
EXCEPTION WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "appointment" ADD COLUMN "userId" varchar(255);
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    UPDATE "appointment"
    SET "userId" = "lawyerId"
    WHERE "userId" IS NULL AND "lawyerId" IS NOT NULL;
EXCEPTION WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "appointment" DROP COLUMN "lawyerId";
EXCEPTION WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "appointment" ALTER COLUMN "userId" SET NOT NULL;
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "appointment" ADD COLUMN "meetingId" varchar(255);
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "appointment" ADD COLUMN "title" varchar(255) NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "appointment" ADD COLUMN "description" text;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "appointment" ADD CONSTRAINT "appointment_userId_user_id_fk"
        FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "appointment" ADD CONSTRAINT "appointment_meetingId_meeting_id_fk"
        FOREIGN KEY ("meetingId") REFERENCES "public"."meeting"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- meeting table — drop old columns
DO $$ BEGIN
    ALTER TABLE "meeting" DROP COLUMN "title";
EXCEPTION WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "meeting" DROP COLUMN "status";
EXCEPTION WHEN undefined_column THEN null;
END $$;

-- Rename meeting_participant → appointment_participant and migrate columns
-- Rename table (no-op if already renamed)
DO $$ BEGIN
    ALTER TABLE "meeting_participant" RENAME TO "appointment_participant";
EXCEPTION WHEN undefined_table THEN null;
END $$;

-- Rename meetingId → appointmentId
DO $$ BEGIN
    ALTER TABLE "appointment_participant" RENAME COLUMN "meetingId" TO "appointmentId";
EXCEPTION WHEN undefined_column THEN null;
END $$;

-- Add status column with new enum (if not already present)
DO $$ BEGIN
    ALTER TABLE "appointment_participant" ADD COLUMN "status" "appointment_participant_status" DEFAULT 'ACCEPTED' NOT NULL;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- Migrate participantRole to new enum type
DO $$ BEGIN
    ALTER TABLE "appointment_participant"
        ALTER COLUMN "participantRole" TYPE "appointment_participant_role"
        USING CASE
            WHEN "participantRole"::text = 'PRINCIPAL' THEN 'HOST'::appointment_participant_role
            WHEN "participantRole"::text = 'WITNESS'   THEN 'PARTICIPANT'::appointment_participant_role
            ELSE 'PARTICIPANT'::appointment_participant_role
        END;
EXCEPTION WHEN others THEN null;
END $$;

-- Add new columns
DO $$ BEGIN
    ALTER TABLE "appointment_participant" ADD COLUMN "acceptedAt" timestamp with time zone;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "appointment_participant" ADD COLUMN "declineReason" text;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "appointment_participant" ADD COLUMN "invitedById" varchar(255);
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "appointment_participant"
        ADD CONSTRAINT "appointment_participant_invitedById_user_id_fk"
        FOREIGN KEY ("invitedById") REFERENCES "public"."user"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Drop old FK on meetingId (now appointmentId)
DO $$ BEGIN
    ALTER TABLE "appointment_participant"
        DROP CONSTRAINT "meeting_participant_meetingId_meeting_id_fk";
EXCEPTION WHEN undefined_object THEN null;
END $$;

-- Add new FK: appointmentId → appointment.id
DO $$ BEGIN
    ALTER TABLE "appointment_participant"
        ADD CONSTRAINT "appointment_participant_appointmentId_appointment_id_fk"
        FOREIGN KEY ("appointmentId") REFERENCES "public"."appointment"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Drop witness table and old enums
DROP TABLE IF EXISTS "witness";

DO $$ BEGIN
    DROP TYPE "public"."meeting_participant_role";
EXCEPTION WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    DROP TYPE "public"."meeting_participant_status";
EXCEPTION WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    DROP TYPE "public"."meeting_status";
EXCEPTION WHEN undefined_object THEN null;
END $$;
