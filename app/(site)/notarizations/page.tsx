import { NotarizationsHub } from "@/features/notarizations/components/notarizations-hub"

export default async function NotarizationsPage({
	searchParams,
}: {
	searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
	const resolvedSearchParams = (await searchParams) ?? {}
	const tabParam = resolvedSearchParams.tab
	const tab = Array.isArray(tabParam) ? tabParam[0] : tabParam

	return <NotarizationsHub initialTab={tab === "history" ? "history" : "active"} />
}


