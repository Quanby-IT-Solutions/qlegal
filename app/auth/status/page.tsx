import { redirect } from "next/navigation"

import { QuanbyLogo } from "@/core/components/quanby-logo"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { auth } from "@/services/next-auth"

import { UserStatusCard } from "@/features/auth/components/cards/user-status-card"

export default async function UserStatusPage() {
	const session = await auth()
	if (!session?.user?.id) {
		redirect("/auth/login")
	}

	const userStatus = session.user.status

	if (userStatus === "ACTIVE") {
		redirect("/dashboard")
	}

	const isSuspended = userStatus === "SUSPENDED"

	return (
		<Card className="w-full max-w-xl">
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<QuanbyLogo className="size-16" />
				</div>
				<CardTitle className="text-2xl">
					{isSuspended ? "Account Status" : "ENP Approval Required"}
				</CardTitle>
				<CardDescription>
					{isSuspended
						? "Your account is currently unavailable."
						: "To access lawyer routes, please complete your Supreme Court requirements first."}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<UserStatusCard status={userStatus as "PENDING" | "SUSPENDED"} />
			</CardContent>
		</Card>
	)
}
