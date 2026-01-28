"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle, Clock, Edit, MoreVertical, Shield, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"

import { trpc } from "@/services/trpc/client"
import { getAvatarUrl } from "@/core/lib/utils"

import { ConfirmationModal } from "./confirmation-modal"
import { Pagination } from "./pagination"
import { UserActions } from "./user-actions"
import { UserProfileSheet } from "./user-profile-sheet"

interface UserListProps {
	searchTerm: string
	roleFilter: string
	statusFilter: string
	sortBy: string
}

const formatLastLogin = (dateString?: string | null) => {
	if (!dateString) return "Never"

	const date = new Date(dateString)

	const month = String(date.getMonth() + 1).padStart(2, "0")
	const day = String(date.getDate()).padStart(2, "0")
	const year = date.getFullYear()

	const time = date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	})

	return `${month}-${day}-${year}, ${time}`
}

// Helper function to sort users (simplified - only name and email)
const sortUsers = (users: any[], sortBy: string) => {
	const sorted = [...users]

	switch (sortBy) {
		case "name-asc":
			return sorted.sort((a, b) => a.name.localeCompare(b.name))
		case "name-desc":
			return sorted.sort((a, b) => b.name.localeCompare(a.name))
		case "email-asc":
			return sorted.sort((a, b) => a.email.localeCompare(b.email))
		case "email-desc":
			return sorted.sort((a, b) => b.email.localeCompare(a.email))
		default:
			return sorted
	}
}

export function UserList({ searchTerm, roleFilter, statusFilter, sortBy }: UserListProps) {
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
		userName: "",
	})
	const utils = trpc.useUtils()

	const {
		data: userData,
		isLoading,
		refetch,
	} = trpc.userManagement.list.useQuery({
		search: searchTerm ?? undefined,
		role: roleFilter === "all" ? undefined : (roleFilter as "PRINCIPAL" | "ADMIN" | "ENP" | "ENA"),
		status:
			statusFilter === "all"
				? undefined
				: (statusFilter.toUpperCase() as "ACTIVE" | "PENDING" | "SUSPENDED"),
		page: currentPage,
		limit: pageSize,
	})

	// Reset to first page when filters change
	useEffect(() => {
		setCurrentPage(1)
	}, [searchTerm, roleFilter, statusFilter, sortBy])

	// Apply sorting to users
	const users = sortUsers(userData?.users ?? [], sortBy)
	const pagination = userData?.pagination

	const approveUserMutation = trpc.userManagement.approve.useMutation({
		onSuccess: () => {
			toast.success("User approved successfully")
			void refetch()
			// Invalidate stats to update the counts
			void utils.userManagement.stats.invalidate()
		},
		onError: error => {
			toast.error(error.message || "Failed to approve user")
		},
	})

	const suspendUserMutation = trpc.userManagement.suspend.useMutation({
		onSuccess: () => {
			toast.success("User suspended successfully")
			void refetch()
			// Invalidate stats to update the counts
			void utils.userManagement.stats.invalidate()
		},
		onError: error => {
			toast.error(error.message || "Failed to suspend user")
		},
	})

	const unsuspendUserMutation = trpc.userManagement.unsuspend.useMutation({
		onSuccess: () => {
			toast.success("User unsuspended successfully")
			void refetch()
			// Invalidate stats to update the counts
			void utils.userManagement.stats.invalidate()
		},
		onError: error => {
			toast.error(error.message || "Failed to unsuspend user")
		},
	})

	const deleteUserMutation = trpc.userManagement.delete.useMutation({
		onSuccess: () => {
			toast.success("User deleted successfully")
			void refetch()
			// Invalidate stats to update the counts
			void utils.userManagement.stats.invalidate()
		},
		onError: error => {
			toast.error(error.message || "Failed to delete user")
		},
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
			userName,
		})
	}

	const closeConfirmationModal = () => {
		setConfirmationModal({
			open: false,
			action: "suspend",
			userId: "",
			userName: "",
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
		switch (role.toUpperCase()) {
			case "PRINCIPAL":
				return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
			case "ENP":
				return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
			case "ENA":
				return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
			case "ADMIN":
				return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
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
				return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
			case "pending":
				return <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
			case "suspended":
				return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
			default:
				return <AlertCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
		}
	}

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
						<div>
							<CardTitle>Users</CardTitle>
							<CardDescription>Loading users...</CardDescription>
						</div>
						<div className="flex items-center space-x-2">
							<span className="text-muted-foreground text-sm">Show:</span>
							<div className="bg-muted h-9 w-20 animate-pulse rounded-md" />
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="flex items-center justify-between rounded-lg border p-4">
								<div className="flex items-center space-x-4">
									<div className="bg-muted h-12 w-12 animate-pulse rounded-full" />
									<div className="space-y-2">
										<div className="bg-muted h-4 w-32 animate-pulse rounded" />
										<div className="bg-muted h-3 w-48 animate-pulse rounded" />
									</div>
								</div>
								<div className="space-y-2">
									<div className="bg-muted h-6 w-16 animate-pulse rounded" />
									<div className="bg-muted h-6 w-20 animate-pulse rounded" />
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
				<div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
					<div>
						<CardTitle>Users</CardTitle>
						<CardDescription>{pagination?.totalCount ?? 0} user(s) found</CardDescription>
					</div>
					<div className="flex items-center space-x-2">
						<span className="text-muted-foreground text-sm">Show:</span>
						<Select value={pageSize.toString()} onValueChange={value => setPageSize(Number(value))}>
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
					{users.map(user => {
						const avatarUrl = getAvatarUrl(user.avatar)
						
						return (
							<div
								key={user.id}
								className="flex flex-col gap-4 rounded-lg border p-4 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-gray-800"
							>
								{/* Left section: Avatar and User Info */}
								<div className="flex flex-1 items-start space-x-3 sm:items-center sm:space-x-4">
									<Avatar className="h-10 w-10 shrink-0 sm:h-12 sm:w-12">
										{avatarUrl ? <AvatarImage src={avatarUrl} alt={user.name} /> : null}
										<AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium sm:text-sm">
											{user.name
												.split(" ")
												.map(n => n[0])
												.join("")
												.toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<div className="min-w-0 flex-1">
										<div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
											<h3 className="text-sm font-medium break-words text-gray-900 sm:text-base dark:text-white">
												{user.name}
											</h3>
											{/* @ts-expect-error - title is not typed */}
											{user.verified && (
												<Shield
													className="h-3 w-3 shrink-0 text-blue-600 sm:h-4 sm:w-4"
													// @ts-expect-error - title is not typed
													title="Verified"
												/>
											)}
										</div>
										<p className="text-xs break-all text-gray-600 sm:text-sm dark:text-gray-400">
											{user.email}
										</p>
										{user.organization && (
											<p className="text-xs break-words text-gray-500 sm:text-sm">
												{user.organization}
											</p>
										)}
										<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
											<span className="break-words">
												Last login: {formatLastLogin(user.lastActive)}
											</span>
											<span className="whitespace-nowrap">
												Documents: {user.documentsCount ?? 0}
											</span>
										</div>
									</div>
								</div>

								{/* Right section: Badges and Actions */}
								<div className="flex items-center justify-between gap-3 sm:justify-end">
									<div className="flex flex-wrap items-center gap-2">
										<Badge className={`${getRoleColor(user.role)} text-xs whitespace-nowrap`}>
											{user.role.toUpperCase()}
										</Badge>
										<Badge className={`${getStatusColor(user.status)} text-xs whitespace-nowrap`}>
											<div className="flex items-center space-x-1">
												{getStatusIcon(user.status)}
												<span>{user.status}</span>
											</div>
										</Badge>
									</div>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" size="icon" className="shrink-0">
												<MoreVertical className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuLabel>Actions</DropdownMenuLabel>
											<DropdownMenuSeparator />
											<DropdownMenuItem onClick={() => setSelectedUserId(user.id)}>
												<Edit className="mr-2 h-4 w-4" />
												Edit User
											</DropdownMenuItem>
											<UserProfileSheet
												userId={user.id}
												trigger={
													<DropdownMenuItem onSelect={e => e.preventDefault()}>
														<Shield className="mr-2 h-4 w-4" />
														View Profile
													</DropdownMenuItem>
												}
											/>
											{user.status === "pending" && (
												<DropdownMenuItem onClick={() => handleApproveUser(user.id)}>
													<CheckCircle className="mr-2 h-4 w-4" />
													Approve User
												</DropdownMenuItem>
											)}
											{user.status === "active" && (
												<DropdownMenuItem
													onClick={() => openConfirmationModal("suspend", user.id, user.name)}
												>
													<AlertCircle className="mr-2 h-4 w-4" />
													Suspend User
												</DropdownMenuItem>
											)}
											{user.status === "suspended" && (
												<DropdownMenuItem
													onClick={() => openConfirmationModal("unsuspend", user.id, user.name)}
												>
													<CheckCircle className="mr-2 h-4 w-4" />
													Unsuspend User
												</DropdownMenuItem>
											)}
											<DropdownMenuSeparator />
											<DropdownMenuItem
												className="text-red-600"
												onClick={() => openConfirmationModal("delete", user.id, user.name)}
											>
												<Trash2 className="mr-2 h-4 w-4" />
												Delete User
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</div>
						)
					})}

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
				onOpenChange={open => !open && closeConfirmationModal()}
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