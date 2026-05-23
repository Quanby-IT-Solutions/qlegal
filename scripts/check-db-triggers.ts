import "dotenv/config"
import { sql } from "drizzle-orm"
import { db } from "@/services/drizzle/db"

async function main() {
	const triggers = await db.execute(sql`SELECT tgname, tgrelid::regclass AS table_name, pg_get_triggerdef(oid) AS def FROM pg_trigger WHERE NOT tgisinternal`)
	console.log("=== USER-DEFINED TRIGGERS ===")
	console.log(JSON.stringify(triggers, null, 2))

	const functions = await db.execute(sql`SELECT n.nspname AS schema, p.proname, pg_get_functiondef(p.oid) AS def FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema','extensions','graphql','graphql_public','net','vault','pgsodium','pgsodium_masks','realtime','storage','supabase_functions') AND p.proname ILIKE '%kyc%'`)
	console.log("\n=== FUNCTIONS WITH 'kyc' IN NAME ===")
	console.log(JSON.stringify(functions, null, 2))

	process.exit(0)
}

void main().catch(e => { console.error(e); process.exit(1) })
