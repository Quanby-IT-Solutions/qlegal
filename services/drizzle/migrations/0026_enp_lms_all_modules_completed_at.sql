ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "enpLmsAllModulesCompletedAt" timestamp with time zone;

-- Existing ENPs who already completed the placeholder LMS: treat as fully trained for sessions/booking.
UPDATE "user"
SET "enpLmsAllModulesCompletedAt" = "enpLmsCourseCompletedAt"
WHERE "role" = 'ENP'
	AND "enpLmsCourseCompletedAt" IS NOT NULL
	AND "enpLmsAllModulesCompletedAt" IS NULL;
