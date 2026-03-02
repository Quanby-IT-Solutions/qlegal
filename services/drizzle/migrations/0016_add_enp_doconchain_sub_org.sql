-- Store per-ENP DocOnChain sub-organization identifiers

DO $$ BEGIN
    ALTER TABLE "enp_profile" ADD COLUMN "doconchainSubOrgId" varchar(255);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "enp_profile" ADD COLUMN "doconchainSubOrgName" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "enp_profile" ADD COLUMN "doconchainSubOrgAddress" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "enp_profile" ADD COLUMN "doconchainSubOrgCreatedAt" timestamp with time zone;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

