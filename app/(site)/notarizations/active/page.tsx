import { redirect } from "next/navigation"

export default function ActiveNotarizationsPage() {
	redirect("/meetings?tab=active")
}
