-- Allow sessions to be joinable via a public link (for additional signers).
ALTER TABLE "appointment" ADD COLUMN IF NOT EXISTS "allowPublicLink" boolean DEFAULT false NOT NULL;
