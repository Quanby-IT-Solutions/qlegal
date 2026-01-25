import { redirect } from "next/navigation"

// Redirect to notarial-book-2 (the legitimate notarial book)
export default function NotarialBookPage() {
	redirect("/notarial-book-2")
}
