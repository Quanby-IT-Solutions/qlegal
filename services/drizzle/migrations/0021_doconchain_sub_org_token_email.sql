-- Store a member email on the sub-org for sub-org scoped token generation

ALTER TABLE "doconchain_sub_organization"
ADD COLUMN IF NOT EXISTS "tokenEmail" text;

