CREATE TYPE "public"."user_roles" AS ENUM('client', 'admin', 'super_admin');--> statement-breakpoint
CREATE TABLE "account" (
	"userId" varchar(255) NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"providerAccountId" varchar(255) NOT NULL,
	"refreshToken" text,
	"accessToken" text,
	"expiresAt" integer,
	"tokenType" varchar(255),
	"scope" varchar(255),
	"idToken" text,
	"sessionState" varchar(255),
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "password_reset_token" (
	"id" varchar(255) PRIMARY KEY DEFAULT '30acc9e1-2c83-4c57-a820-8b1bda6c32d0' NOT NULL,
	"email" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "password_reset_token" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "two_factor_confirmation" (
	"id" varchar(255) PRIMARY KEY DEFAULT '1ec24370-09ec-4437-8255-c6da0d2a0393' NOT NULL,
	"userId" varchar(255) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "two_factor_confirmation" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "two_factor_token" (
	"id" varchar(255) PRIMARY KEY DEFAULT '0d725ac5-851b-45ba-bb48-b875907f7d1c' NOT NULL,
	"email" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "two_factor_token" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"email" varchar(255),
	"emailVerified" timestamp with time zone,
	"image" text,
	"password" text,
	"isTwoFactorEnabled" boolean DEFAULT false,
	"phoneNumber" varchar(255),
	"role" "user_roles" DEFAULT 'client' NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "verification_token" (
	"id" varchar(255) PRIMARY KEY DEFAULT '8de9e65f-8838-43d8-947f-9d3dbed9e9d2' NOT NULL,
	"email" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verification_token" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "envelopes" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "envelopes_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "envelopes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_email_user_email_fk" FOREIGN KEY ("email") REFERENCES "public"."user"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor_confirmation" ADD CONSTRAINT "two_factor_confirmation_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor_token" ADD CONSTRAINT "two_factor_token_email_user_email_fk" FOREIGN KEY ("email") REFERENCES "public"."user"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_token" ADD CONSTRAINT "verification_token_email_user_email_fk" FOREIGN KEY ("email") REFERENCES "public"."user"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envelopes" ADD CONSTRAINT "envelopes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("userId");