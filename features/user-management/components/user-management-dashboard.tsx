"use client"

import { useState } from "react"
import { UserPlus } from "lucide-react"

import { Button } from "@/core/components/ui/button"

import { AddUserDialog } from "./add-user-dialog"
import { UserFilters } from "./user-filters"
import { UserList } from "./user-list"
import { UserStats } from "./user-stats"

export function UserManagementDashboard() {
	const [searchTerm, setSearchTerm] = useState("")
	const [roleFilter, setRoleFilter] = useState("all")
	const [statusFilter, setStatusFilter] = useState("all")
	const [isAddUserOpen, setIsAddUserOpen] = useState(false)

	return (
		<div className="min-h-screen w-full" suppressHydrationWarning>
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-6">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
					<p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
						Manage platform users, roles, and permissions
					</p>
				</div>
				<Button onClick={() => setIsAddUserOpen(true)} className="w-full sm:w-auto">
					<UserPlus className="mr-2 h-4 w-4" />
					Add User
				</Button>
			</div>

			{/* User Statistics */}
			<div className="px-4 sm:px-6">
				<UserStats />
			</div>

			{/* Filters */}
			<div className="px-4 sm:px-6 mt-4 sm:mt-6">
				<UserFilters
					searchTerm={searchTerm}
					setSearchTerm={setSearchTerm}
					roleFilter={roleFilter}
					setRoleFilter={setRoleFilter}
					statusFilter={statusFilter}
					setStatusFilter={setStatusFilter}
				/>
			</div>

			{/* Users List */}
			<div className="px-4 sm:px-6 mt-4 sm:mt-6 pb-4 sm:pb-6">
				<UserList searchTerm={searchTerm} roleFilter={roleFilter} statusFilter={statusFilter} />
			</div>

			{/* Add User Dialog */}
			<AddUserDialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen} />
		</div>
	)
}