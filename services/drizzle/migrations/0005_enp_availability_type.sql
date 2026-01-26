-- Add support for one-time blocked slots, custom availability, and recurring blocked time slots
DO $$ BEGIN
    ALTER TABLE "enp_availability" ADD COLUMN "type" varchar(50) DEFAULT 'REGULAR' NOT NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "enp_availability" ADD COLUMN "date" date;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "enp_availability" ADD COLUMN "reason" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "enp_availability" ADD COLUMN "isAllDays" boolean DEFAULT false NOT NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Update existing rows to have REGULAR type
DO $$ BEGIN
    UPDATE "enp_availability" SET "type" = 'REGULAR' WHERE "date" IS NULL;
EXCEPTION
    WHEN others THEN RAISE WARNING 'Failed to update existing enp_availability rows: %', SQLERRM;
END $$;

-- Make dayOfWeek required for REGULAR and RECURRING_BLOCKED types
DO $$ BEGIN
    ALTER TABLE "enp_availability" ALTER COLUMN "dayOfWeek" SET NOT NULL;
EXCEPTION
    WHEN others THEN RAISE WARNING 'Failed to make dayOfWeek required: %', SQLERRM;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN "enp_availability"."type" IS 'Type of availability: REGULAR = weekly recurring, BLOCKED = one-time blocked slot, CUSTOM = one-time availability override, RECURRING_BLOCKED = recurring blocked time slots';
COMMENT ON COLUMN "enp_availability"."date" IS 'Specific date for BLOCKED and CUSTOM types (null for REGULAR and RECURRING_BLOCKED)';
COMMENT ON COLUMN "enp_availability"."reason" IS 'Optional reason for blocked slot';
COMMENT ON COLUMN "enp_availability"."isAllDays" IS 'For RECURRING_BLOCKED type, applies to all 7 days of week if true';
