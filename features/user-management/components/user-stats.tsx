"use client"

import { AlertCircle, CheckCircle, Clock, Users } from "lucide-react"

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle
} from "@/core/components/ui/card"

import { trpc } from "@/services/trpc/client"

export function UserStats() {
	const { data: stats, isLoading } = trpc.userManagement.stats.useQuery()

	if (isLoading) {
		return (
			<div className="grid grid-cols-1 gap-6 md:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Card key={i}>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
							<div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
						</CardHeader>
						<CardContent>
							<div className="mb-2 h-8 w-16 animate-pulse rounded bg-gray-200" />
							<div className="h-3 w-32 animate-pulse rounded bg-gray-200" />
						</CardContent>
					</Card>
				))}
			</div>
		)
	}

	return (
		<div
			className="grid grid-cols-1 gap-6 md:grid-cols-4"
			suppressHydrationWarning
		>
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Total Users</CardTitle>
					<Users className="h-4 w-4 text-blue-600" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats?.total ?? 0}</div>
					<p className="text-xs text-muted-foreground">All registered users</p>
				</CardContent>
			</Card>
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Active Users</CardTitle>
					<CheckCircle className="h-4 w-4 text-green-600" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats?.active ?? 0}</div>
					<p className="text-xs text-muted-foreground">Currently active</p>
				</CardContent>
			</Card>
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">
						Pending Approval
					</CardTitle>
					<Clock className="h-4 w-4 text-orange-600" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats?.pending ?? 0}</div>
					<p className="text-xs text-muted-foreground">Awaiting approval</p>
				</CardContent>
			</Card>
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Suspended</CardTitle>
					<AlertCircle className="h-4 w-4 text-red-600" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats?.suspended ?? 0}</div>
					<p className="text-xs text-muted-foreground">Account suspended</p>
				</CardContent>
			</Card>
		</div>
	)
}
