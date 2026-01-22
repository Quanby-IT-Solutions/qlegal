DO $$ BEGIN
    CREATE TYPE "public"."meeting_participant_status" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED');
EXCEPTION
    WHEN duplicate_object THEN null;
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
    ALTER TABLE "meeting_participant" ADD COLUMN "status" "meeting_participant_status" DEFAULT 'ACCEPTED' NOT NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "meeting_participant" ADD COLUMN "invitedById" varchar(255);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "meeting_participant" ADD CONSTRAINT "meeting_participant_invitedById_user_id_fk" FOREIGN KEY ("invitedById") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enp_profile_user_id_idx" ON "enp_profile" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meeting_participants_status_idx" ON "meeting_participant" USING btree ("status");--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "meeting_participant" DROP COLUMN "role";
EXCEPTION
    WHEN undefined_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    DROP TYPE "public"."meeting_participant_role";
EXCEPTION
    WHEN undefined_object THEN null;
END $$;