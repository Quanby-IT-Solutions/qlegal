import { redirect } from "next/navigation"

export default function NotarizationHistoryPage() {
	redirect("/notarizations?tab=history")
}
