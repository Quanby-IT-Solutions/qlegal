"use client"

import { LogOut } from "lucide-react"

import { CardFooter } from "@/core/components/ui/card"

import { LogoutButton } from "../logout-button"

interface UserStatusCardProps {
	status: "PENDING" | "SUSPENDED"
}

export function UserStatusCard({ status }: UserStatusCardProps) {
	const isPending = status === "PENDING"

	return (
		<div className="space-y-6">
			{/* Status Alert */}
			{isPending ? (
				<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-800 dark:bg-amber-950/20">
					<p className="mb-1 text-sm font-semibold text-amber-900 dark:text-amber-100">
						Pending Approval
					</p>
					<p className="text-xs text-amber-700 dark:text-amber-300">
						Your account is under review. You’ll be notified once it’s approved.
					</p>
				</div>
			) : (
				<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-800 dark:bg-red-950/20">
					<p className="mb-1 text-sm font-semibold text-red-900 dark:text-red-100">
						Account Suspended
					</p>
					<p className="text-xs text-red-700 dark:text-red-300">
						Your account has been suspended. Please contact support for assistance.
					</p>
				</div>
			)}
			{/* Logout Button */}
			<CardFooter>
				<LogoutButton callbackUrl="/auth/login" variant="link" className="w-full">
					<LogOut className="mr-2 h-4 w-4" />
					Log Out
				</LogoutButton>
			</CardFooter>
		</div>
	)
}
