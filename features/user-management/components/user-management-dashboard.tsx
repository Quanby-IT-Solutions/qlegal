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
	const [sortBy, setSortBy] = useState("name-asc")
	const [isAddUserOpen, setIsAddUserOpen] = useState(false)

	return (
		<div className="min-h-screen w-full" suppressHydrationWarning>
			{/* Header */}
			<div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
						User Management
					</h1>
					<p className="text-sm text-gray-600 sm:text-base dark:text-gray-400">
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
			<div className="mt-4 px-4 sm:mt-6 sm:px-6">
				<UserFilters
					searchTerm={searchTerm}
					setSearchTerm={setSearchTerm}
					roleFilter={roleFilter}
					setRoleFilter={setRoleFilter}
					statusFilter={statusFilter}
					setStatusFilter={setStatusFilter}
					sortBy={sortBy}
					setSortBy={setSortBy}
				/>
			</div>

			{/* Users List */}
			<div className="mt-4 px-4 pb-4 sm:mt-6 sm:px-6 sm:pb-6">
				<UserList
					searchTerm={searchTerm}
					roleFilter={roleFilter}
					statusFilter={statusFilter}
					sortBy={sortBy}
				/>
			</div>

			{/* Add User Dialog */}
			<AddUserDialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen} />
		</div>
	)
}
