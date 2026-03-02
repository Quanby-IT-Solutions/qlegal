"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Clock, Edit, MoreVertical, Shield, Trash2 } from "lucide-react"
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
import { getAvatarUrl } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"

import { ConfirmationModal } from "./confirmation-modal"
import { UserActions } from "./user-actions"
import { UserProfileSheet } from "./user-profile-sheet"

type User = {
	id: string
	name: string
	email: string
	role: string
	organization: string | null
	status: "active" | "pending" | "suspended"
	joinDate: string | undefined
	lastActive: string
	documentsCount: number
	avatar: string | null
	verified?: boolean
}

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
const sortUsers = (users: User[], sortBy: string): User[] => {
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
					<div>
						<CardTitle>Users</CardTitle>
						<CardDescription>Loading users...</CardDescription>
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-3 sm:space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="flex items-center justify-between rounded-lg border p-3 sm:p-4">
								<div className="flex items-center space-x-3">
									<div className="bg-muted h-10 w-10 shrink-0 animate-pulse rounded-full sm:h-12 sm:w-12" />
									<div className="space-y-2">
										<div className="bg-muted h-4 w-24 animate-pulse rounded sm:w-32" />
										<div className="bg-muted h-3 w-40 animate-pulse rounded sm:w-48" />
									</div>
								</div>
								<div className="space-y-2">
									<div className="bg-muted h-6 w-12 animate-pulse rounded sm:w-16" />
									<div className="bg-muted h-6 w-16 animate-pulse rounded sm:w-20" />
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
				<div>
					<CardTitle>Users</CardTitle>
					<CardDescription>{pagination?.totalCount ?? 0} user(s) found</CardDescription>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-3 sm:space-y-4">
					{users.length === 0 ? (
						<div className="flex min-h-75 flex-col items-center justify-center py-8 sm:py-12 text-center">
							<div className="text-muted-foreground space-y-2">
								<p className="text-sm">No users found.</p>
							</div>
						</div>
					) : (
						users.map(user => {
							const avatarUrl = getAvatarUrl(user.avatar)

							return (
							<div
								key={user.id}
								className="relative flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:bg-gray-50 sm:gap-3 sm:p-4 dark:hover:bg-gray-800"
							>
								{/* Kebab menu - Top Right */}
								<div className="absolute top-2 right-2 sm:top-3 sm:right-3">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
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

								{/* User Avatar and Info */}
								<div className="flex flex-1 items-start space-x-3 pr-8 sm:pr-0">
									<Avatar className="h-10 w-10 shrink-0 sm:h-12 sm:w-12">
										{avatarUrl ? <AvatarImage src={avatarUrl} alt={user.name} /> : null}
										<AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium sm:text-sm">
											{user.name
												.split(" ")
												.map((n: string) => n[0])
												.join("")
												.toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
											<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
												{user.name}
											</h3>
											{user.verified && (
												<Shield className="h-3 w-3 shrink-0 text-blue-600 sm:h-4 sm:w-4" />
											)}
										</div>
										<p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
											{user.email}
										</p>
										{user.organization && (
											<p className="text-xs text-gray-500 mb-2">
												{user.organization}
											</p>
										)}
										<div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
											<span className="hidden sm:inline">
												Last login: {formatLastLogin(user.lastActive)}
											</span>
											<span className="hidden sm:inline">
												Documents: {user.documentsCount ?? 0}
											</span>
										</div>
									</div>
								</div>

								{/* Badges */}
								<div className="flex flex-wrap items-center gap-2">
									<Badge className={`${getRoleColor(user.role)} text-xs`}>
										{user.role.toUpperCase()}
									</Badge>
									<Badge className={`${getStatusColor(user.status)} text-xs`}>
										<div className="flex items-center space-x-1">
											{getStatusIcon(user.status)}
											<span>{user.status}</span>
										</div>
									</Badge>
								</div>
							</div>
						)
					})
					)}

					{/* Pagination */}
					{pagination && pagination.totalPages > 0 && (
						<div className="mt-4 border-t pt-3 sm:mt-6 sm:pt-4">
							<div className="flex flex-row items-center justify-between gap-2 sm:gap-4">
								<div className="flex items-center space-x-1 sm:space-x-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setCurrentPage(pagination.page - 1)}
										disabled={pagination.page <= 1}
										className="h-8 w-8 p-0"
									>
										<ChevronLeft className="h-4 w-4" />
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setCurrentPage(pagination.page + 1)}
										disabled={pagination.page >= pagination.totalPages}
										className="h-8 w-8 p-0"
									>
										<ChevronRight className="h-4 w-4" />
									</Button>
								</div>
								<div className="text-muted-foreground flex-1 text-center text-xs sm:text-sm">
									Page {pagination.page} of {pagination.totalPages}
								</div>
								<div className="flex items-center space-x-1 sm:space-x-2">
									<span className="text-muted-foreground text-xs sm:text-sm">Show:</span>
									<Select value={pageSize.toString()} onValueChange={value => setPageSize(Number(value))}>
										<SelectTrigger className="h-8 w-17 sm:h-9 sm:w-16">
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
