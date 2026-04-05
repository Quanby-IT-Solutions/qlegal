-- Add onboarding reminder control fields

ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "prefix" varchar(50),
ADD COLUMN IF NOT EXISTS "suffix" varchar(50),
ADD COLUMN IF NOT EXISTS "onboardingDetailsCompletedAt" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "onboardingSnoozedUntil" timestamp with time zone;
