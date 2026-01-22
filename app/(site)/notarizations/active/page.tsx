import { redirect } from "next/navigation"

export default function ActiveNotarizationsPage() {
	redirect("/notarizations?tab=active")
}
