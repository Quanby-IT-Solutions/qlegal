CREATE TABLE "recovery_email_verification_token" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recovery_email_verification_token" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "doconchain_sub_organization" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"uuid" varchar(255) NOT NULL,
	"numericId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"subOrganizationTypeName" varchar(255) DEFAULT 'Department',
	"photoUrl" text,
	"tokenEmail" text,
	"clientKey" text,
	"clientSecret" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "doconchain_sub_organization_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
ALTER TABLE "doconchain_sub_organization" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "firstName" varchar(255);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "middleName" varchar(255);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "lastName" varchar(255);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "recoveryEmail" varchar(255);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "recoveryEmailVerified" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "onboardingCompletedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "doconchainSubOrgId" varchar(255);--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "doconchainSubOrgName" text;--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "doconchainSubOrgAddress" text;--> statement-breakpoint
ALTER TABLE "enp_profile" ADD COLUMN "doconchainSubOrgCreatedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "recovery_email_verification_token" ADD CONSTRAINT "recovery_email_verification_token_email_user_email_fk" FOREIGN KEY ("email") REFERENCES "public"."user"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_recoveryEmail_unique" UNIQUE("recoveryEmail");