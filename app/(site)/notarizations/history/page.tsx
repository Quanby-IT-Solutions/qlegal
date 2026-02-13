import { redirect } from "next/navigation"

export default function NotarizationHistoryPage() {
	redirect("/sessions?tab=history")
}
