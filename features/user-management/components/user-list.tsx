"use client"

import { useEffect, useState } from "react"
import {
	AlertCircle,
	CheckCircle,
	Clock,
	Edit,
	MoreVertical,
	Shield,
	Trash2
} from "lucide-react"
import { toast } from "sonner"

import {
	Avatar,
	AvatarFallback,
	AvatarImage
} from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/core/components/ui/card"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "@/core/components/ui/dropdown-menu"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/core/components/ui/select"

import { trpc } from "@/services/trpc/client"

import { ConfirmationModal } from "./confirmation-modal"
import { Pagination } from "./pagination"
import { UserActions } from "./user-actions"
import { UserProfileSheet } from "./user-profile-sheet"

interface UserListProps {
	searchTerm: string
	roleFilter: string
	statusFilter: string
}

export function UserList({
	searchTerm,
	roleFilter,
	statusFilter
}: UserListProps) {
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
	const [currentPage, setCurrentPage] = useState(1)
	const [pageSize, setPageSize] = useState(10)
	const [confirmationModal, setConfirmationModal] = useState<{
		open: boolean
		action: "suspend" | "unsuspend" | "delete"
		userId: string
		userName: string
	}>({
		open: false,
		action: "suspend",
		userId: "",
		userName: ""
	})
	const utils = trpc.useUtils()

	const {
		data: userData,
		isLoading,
		refetch
	} = trpc.userManagement.list.useQuery({
		search: searchTerm ?? undefined,
		role:
			roleFilter === "all"
				? undefined
				: (roleFilter as "CLIENT" | "ADMIN" | "SUPER_ADMIN"),
		status:
			statusFilter === "all"
				? undefined
				: (statusFilter as "active" | "pending" | "suspended"),
		page: currentPage,
		limit: pageSize
	})

	// Reset to first page when filters change
	useEffect(() => {
		setCurrentPage(1)
	}, [searchTerm, roleFilter, statusFilter])

	const users = userData?.users ?? []
	const pagination = userData?.pagination

	const approveUserMutation = trpc.userManagement.approve.useMutation({
		onSuccess: () => {
			toast.success("User approved successfully")
			void refetch()
			// Invalidate stats to update the counts
			void utils.userManagement.stats.invalidate()
		},
		onError: (error) => {
			toast.error(error.message || "Failed to approve user")
		}
	})

	const suspendUserMutation = trpc.userManagement.suspend.useMutation({
		onSuccess: () => {
			toast.success("User suspended successfully")
			void refetch()
			// Invalidate stats to update the counts
			void utils.userManagement.stats.invalidate()
		},
		onError: (error) => {
			toast.error(error.message || "Failed to suspend user")
		}
	})

	const unsuspendUserMutation = trpc.userManagement.unsuspend.useMutation({
		onSuccess: () => {
			toast.success("User unsuspended successfully")
			void refetch()
			// Invalidate stats to update the counts
			void utils.userManagement.stats.invalidate()
		},
		onError: (error) => {
			toast.error(error.message || "Failed to unsuspend user")
		}
	})

	const deleteUserMutation = trpc.userManagement.delete.useMutation({
		onSuccess: () => {
			toast.success("User deleted successfully")
			void refetch()
			// Invalidate stats to update the counts
			void utils.userManagement.stats.invalidate()
		},
		onError: (error) => {
			toast.error(error.message || "Failed to delete user")
		}
	})

	const handleApproveUser = async (userId: string) => {
		try {
			await approveUserMutation.mutateAsync({ id: userId })
		} catch {
			// Error is handled by onError callback
		}
	}

	const openConfirmationModal = (
		action: "suspend" | "unsuspend" | "delete",
		userId: string,
		userName: string
	) => {
		setConfirmationModal({
			open: true,
			action,
			userId,
			userName
		})
	}

	const closeConfirmationModal = () => {
		setConfirmationModal({
			open: false,
			action: "suspend",
			userId: "",
			userName: ""
		})
	}

	const handleConfirmAction = async () => {
		const { action, userId } = confirmationModal
		try {
			switch (action) {
				case "suspend":
					await suspendUserMutation.mutateAsync({ id: userId })
					break
				case "unsuspend":
					await unsuspendUserMutation.mutateAsync({ id: userId })
					break
				case "delete":
					await deleteUserMutation.mutateAsync({ id: userId })
					break
			}
			closeConfirmationModal()
		} catch {
			// Error is handled by onError callback
		}
	}

	const getRoleColor = (role: string) => {
		switch (role) {
			case "client":
				return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
			case "admin":
				return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
			case "super-admin":
				return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
			default:
				return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
		}
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
			case "pending":
				return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
			case "suspended":
				return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
			default:
				return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
		}
	}

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "active":
				return (
					<CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
				)
			case "pending":
				return (
					<Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
				)
			case "suspended":
				return (
					<AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
				)
			default:
				return (
					<AlertCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
				)
		}
	}

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Users</CardTitle>
							<CardDescription>Loading users...</CardDescription>
						</div>
						<div className="flex items-center space-x-2">
							<span className="text-sm text-muted-foreground">Show:</span>
							<div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div
								key={i}
								className="flex items-center justify-between rounded-lg border p-4"
							>
								<div className="flex items-center space-x-4">
									<div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
									<div className="space-y-2">
										<div className="h-4 w-32 animate-pulse rounded bg-muted" />
										<div className="h-3 w-48 animate-pulse rounded bg-muted" />
									</div>
								</div>
								<div className="space-y-2">
									<div className="h-6 w-16 animate-pulse rounded bg-muted" />
									<div className="h-6 w-20 animate-pulse rounded bg-muted" />
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card suppressHydrationWarning>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Users</CardTitle>
						<CardDescription>
							{pagination?.totalCount ?? 0} user(s) found
						</CardDescription>
					</div>
					<div className="flex items-center space-x-2">
						<span className="text-sm text-muted-foreground">Show:</span>
						<Select
							value={pageSize.toString()}
							onValueChange={(value) => setPageSize(Number(value))}
						>
							<SelectTrigger className="w-20">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="5">5</SelectItem>
								<SelectItem value="10">10</SelectItem>
								<SelectItem value="20">20</SelectItem>
								<SelectItem value="50">50</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{users.map((user) => (
						<div
							key={user.id}
							className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
						>
							<div className="flex flex-1 items-center space-x-4">
								<Avatar className="h-12 w-12">
									{user.avatar ? (
										<AvatarImage src={user.avatar} alt={user.name} />
									) : null}
									<AvatarFallback className="bg-muted font-medium text-muted-foreground">
										{user.name
											.split(" ")
											.map((n) => n[0])
											.join("")
											.toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div className="min-w-0 flex-1">
									<div className="mb-1 flex items-center space-x-2">
										<h3 className="truncate font-medium text-gray-900 dark:text-white">
											{user.name}
										</h3>
										{/* @ts-expect-error - title is not typed */}
										{user.verified && (
											<Shield
												className="h-4 w-4 text-blue-600"
												// @ts-expect-error - title is not typed
												title="Verified"
											/>
										)}
									</div>
									<p className="truncate text-sm text-gray-600 dark:text-gray-400">
										{user.email}
									</p>
									{user.organization && (
										<p className="truncate text-sm text-gray-500">
											{user.organization}
										</p>
									)}
									<div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
										<span>Last login: {user.lastActive}</span>
										<span>Documents: {user.documentsCount}</span>
									</div>
								</div>
							</div>
							<div className="flex items-center space-x-4">
								<div className="flex flex-col items-end space-y-2">
									<Badge className={getRoleColor(user.role)}>{user.role}</Badge>
									<Badge className={getStatusColor(user.status)}>
										<div className="flex items-center space-x-1">
											{getStatusIcon(user.status)}
											<span>{user.status}</span>
										</div>
									</Badge>
								</div>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="icon">
											<MoreVertical className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuLabel>Actions</DropdownMenuLabel>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											onClick={() => setSelectedUserId(user.id)}
										>
											<Edit className="mr-2 h-4 w-4" />
											Edit User
										</DropdownMenuItem>
										<UserProfileSheet
											userId={user.id}
											trigger={
												<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
													<Shield className="mr-2 h-4 w-4" />
													View Profile
												</DropdownMenuItem>
											}
										/>
										{user.status === "pending" && (
											<DropdownMenuItem
												onClick={() => handleApproveUser(user.id)}
											>
												<CheckCircle className="mr-2 h-4 w-4" />
												Approve User
											</DropdownMenuItem>
										)}
										{user.status === "active" && (
											<DropdownMenuItem
												onClick={() =>
													openConfirmationModal("suspend", user.id, user.name)
												}
											>
												<AlertCircle className="mr-2 h-4 w-4" />
												Suspend User
											</DropdownMenuItem>
										)}
										{user.status === "suspended" && (
											<DropdownMenuItem
												onClick={() =>
													openConfirmationModal("unsuspend", user.id, user.name)
												}
											>
												<CheckCircle className="mr-2 h-4 w-4" />
												Unsuspend User
											</DropdownMenuItem>
										)}
										<DropdownMenuSeparator />
										<DropdownMenuItem
											className="text-red-600"
											onClick={() =>
												openConfirmationModal("delete", user.id, user.name)
											}
										>
											<Trash2 className="mr-2 h-4 w-4" />
											Delete User
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>
					))}

					{/* Pagination */}
					{pagination && pagination.totalPages > 0 && (
						<div className="mt-6 border-t pt-4">
							<Pagination
								currentPage={pagination.page}
								totalPages={pagination.totalPages}
								onPageChange={setCurrentPage}
							/>
						</div>
					)}
				</div>
			</CardContent>

			{/* User Actions Dialog */}
			{selectedUserId && (
				<UserActions
					userId={selectedUserId}
					open={!!selectedUserId}
					onOpenChange={(open: boolean) => !open && setSelectedUserId(null)}
					onSuccess={() => {
						setSelectedUserId(null)
						void refetch()
					}}
				/>
			)}

			{/* Confirmation Modal */}
			<ConfirmationModal
				open={confirmationModal.open}
				onOpenChange={(open) => !open && closeConfirmationModal()}
				action={confirmationModal.action}
				userName={confirmationModal.userName}
				onConfirm={handleConfirmAction}
				isLoading={
					suspendUserMutation.isPending ||
					unsuspendUserMutation.isPending ||
					deleteUserMutation.isPending
				}
			/>
		</Card>
	)
}
