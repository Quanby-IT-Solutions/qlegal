import { redirect } from "next/navigation"

export default function ActiveNotarizationsPage() {
	redirect("/sessions?tab=active")
}
