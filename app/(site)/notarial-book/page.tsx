import { redirect } from "next/navigation"

// Redirect to notarial-book-2 (the legitimate notarial book)
export default function NotarialBookPage() {
	// @ts-expect-error - Route type not yet generated for /notarial-book-2
	redirect("/notarial-book-2")
}
