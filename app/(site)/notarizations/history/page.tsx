import { redirect } from "next/navigation"

export default function NotarizationHistoryPage() {
	redirect("/meetings?tab=history")
}
