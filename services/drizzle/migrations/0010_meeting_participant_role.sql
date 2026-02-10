-- Meeting participant role: PRINCIPAL (default) or WITNESS (set when invited as witness from lobby)
DO $$ BEGIN
    CREATE TYPE "public"."meeting_participant_role" AS ENUM('PRINCIPAL', 'WITNESS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "meeting_participant" ADD COLUMN "participantRole" "meeting_participant_role" DEFAULT 'PRINCIPAL' NOT NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
