import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { auth } from "@/services/next-auth"

import { HomePage } from "@/features/home/components/home-page"

export const metadata: Metadata = {
	title: "Quanby Legal | Contract AI workspace",
	description:
		"Analyze contracts, ask grounded legal workflow questions, and generate first drafts inside Quanby Legal.",
}

export default async function Page() {
	const session = await auth()
	const hasAuthenticatedUser = Boolean(session?.user?.id && session.user?.role)

	if (hasAuthenticatedUser) {
		redirect("/dashboard")
	}

	return <HomePage />
}
