import { redirect } from "next/navigation"

// Redirect to notarial-registry (the actual notarial book page)
export default function NotarialBook2Page() {
	redirect("/notarial-registry")
}
