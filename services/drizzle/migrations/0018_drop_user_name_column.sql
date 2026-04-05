-- Backfill firstName, middleName, lastName from name where parts are not yet set
UPDATE "user"
SET
  "firstName" = (string_to_array(trim("name"), ' '))[1],
  "lastName" = CASE WHEN array_length(string_to_array(trim("name"), ' '), 1) > 1
    THEN (string_to_array(trim("name"), ' '))[array_length(string_to_array(trim("name"), ' '), 1)]
    ELSE (string_to_array(trim("name"), ' '))[1]
  END,
  "middleName" = CASE WHEN array_length(string_to_array(trim("name"), ' '), 1) > 2
    THEN array_to_string((string_to_array(trim("name"), ' '))[2:array_length(string_to_array(trim("name"), ' '), 1)-1], ' ')
    ELSE NULL
  END
WHERE "name" IS NOT NULL AND trim("name") <> '' AND "firstName" IS NULL;

-- Drop the name column
ALTER TABLE "user" DROP COLUMN IF EXISTS "name";
