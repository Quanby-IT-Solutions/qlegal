-- Add first name, middle name, last name to user table (ENP and Principal)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "firstName" varchar(255);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "middleName" varchar(255);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "lastName" varchar(255);
