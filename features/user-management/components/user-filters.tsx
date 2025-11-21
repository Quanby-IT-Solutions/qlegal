"use client"

import { Filter, Search } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"

interface UserFiltersProps {
	searchTerm: string
	setSearchTerm: (value: string) => void
	roleFilter: string
	setRoleFilter: (value: string) => void
	statusFilter: string
	setStatusFilter: (value: string) => void
}

export function UserFilters({
	searchTerm,
	setSearchTerm,
	roleFilter,
	setRoleFilter,
	statusFilter,
	setStatusFilter,
}: UserFiltersProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg">Filter Users</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col gap-4 md:flex-row">
					<div className="flex-1">
						<div className="relative">
							<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
							<Input
								placeholder="Search by name, email, or organization..."
								value={searchTerm}
								onChange={e => setSearchTerm(e.target.value)}
								className="pl-10"
							/>
						</div>
					</div>
					<Select value={roleFilter} onValueChange={setRoleFilter}>
						<SelectTrigger className="w-full md:w-48">
							<Filter className="mr-2 h-4 w-4" />
							<SelectValue placeholder="Filter by role" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Roles</SelectItem>
							<SelectItem value="PRINCIPAL">Client</SelectItem>
							<SelectItem value="ADMIN">Administrator</SelectItem>
							<SelectItem value="ENP">ENP</SelectItem>
							<SelectItem value="ENA">ENA</SelectItem>
						</SelectContent>
					</Select>
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-full md:w-48">
							<SelectValue placeholder="Filter by status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Status</SelectItem>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="pending">Pending</SelectItem>
							<SelectItem value="suspended">Suspended</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</CardContent>
		</Card>
	)
}
