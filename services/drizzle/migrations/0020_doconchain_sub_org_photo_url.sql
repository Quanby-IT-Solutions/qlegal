-- Add DocOnChain branding image URL to sub-org (set after uploading via PUT sub-org)

ALTER TABLE "doconchain_sub_organization"
ADD COLUMN IF NOT EXISTS "photoUrl" text;
