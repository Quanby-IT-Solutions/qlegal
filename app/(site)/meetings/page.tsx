import type { Route } from "next"
import { redirect } from "next/navigation"

interface MeetingsPageProps {
	searchParams?: {
		tab?: string
	}
}

export default function MeetingsPage({ searchParams }: MeetingsPageProps) {
	const tab = searchParams?.tab
	const params = new URLSearchParams()

	if (tab === "active" || tab === "history") {
		params.set("tab", tab)
	}

	const query = params.toString()
	const target = (query ? `/sessions?${query}` : "/sessions") as Route

	redirect(target)
}
