import { redirect } from "next/navigation"

export default async function NotarizationsPage({
	searchParams,
}: {
	searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
	const resolvedSearchParams = (await searchParams) ?? {}
	const tabParam = resolvedSearchParams.tab
	const tab = Array.isArray(tabParam) ? tabParam[0] : tabParam

	// Redirect to sessions page with appropriate tab
	const tabValue = tab === "history" ? "history" : "active"
	redirect(`/sessions?tab=${tabValue}`)
}
