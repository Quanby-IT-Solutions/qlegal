CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"size" integer NOT NULL,
	"path" text NOT NULL,
	"envelope_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "password_reset_token" ALTER COLUMN "id" SET DEFAULT 'c35c82b7-ec81-46fd-baed-4019f927e7ae';--> statement-breakpoint
ALTER TABLE "two_factor_confirmation" ALTER COLUMN "id" SET DEFAULT '993d13ed-2e41-4c23-bfc9-0ff495587b80';--> statement-breakpoint
ALTER TABLE "two_factor_token" ALTER COLUMN "id" SET DEFAULT '22296589-ff58-4093-af37-3fcd839cdad0';--> statement-breakpoint
ALTER TABLE "verification_token" ALTER COLUMN "id" SET DEFAULT '204a73ce-e907-445a-9a01-af7c5a0144a4';--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_envelope_id_envelopes_id_fk" FOREIGN KEY ("envelope_id") REFERENCES "public"."envelopes"("id") ON DELETE no action ON UPDATE no action;