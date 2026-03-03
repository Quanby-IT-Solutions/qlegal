-- Sub-organizations created in DocOnChain (admin creates here, add members later)

CREATE TABLE IF NOT EXISTS "doconchain_sub_organization" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"uuid" varchar(255) NOT NULL UNIQUE,
	"numericId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"subOrganizationTypeName" varchar(255) DEFAULT 'Department',
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE "doconchain_sub_organization" ENABLE ROW LEVEL SECURITY;

-- Allow service role / authenticated admin access (policy can be added per your auth pattern)
CREATE POLICY "doconchain_sub_org_select" ON "doconchain_sub_organization"
	FOR SELECT USING (true);

CREATE POLICY "doconchain_sub_org_insert" ON "doconchain_sub_organization"
	FOR INSERT WITH CHECK (true);

CREATE POLICY "doconchain_sub_org_update" ON "doconchain_sub_organization"
	FOR UPDATE USING (true);

CREATE POLICY "doconchain_sub_org_delete" ON "doconchain_sub_organization"
	FOR DELETE USING (true);
