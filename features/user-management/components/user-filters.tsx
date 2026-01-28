"use client"

import { ArrowDownAZ, Filter, Search, X } from "lucide-react"

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
	sortBy: string
	setSortBy: (value: string) => void
}

export function UserFilters({
	searchTerm,
	setSearchTerm,
	roleFilter,
	setRoleFilter,
	statusFilter,
	setStatusFilter,
	sortBy,
	setSortBy,
}: UserFiltersProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg">Filter Users</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col gap-4 md:flex-row">
					<div className="flex-1 md:max-w-md">
						<div className="relative">
							<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />

							<Input
								placeholder="Search by name, email, or organization..."
								value={searchTerm}
								onChange={e => setSearchTerm(e.target.value)}
								className="pr-10 pl-10"
							/>

							{searchTerm && (
								<button
									type="button"
									onClick={() => setSearchTerm("")}
									className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
									aria-label="Clear search"
								>
									<X className="h-4 w-4" />
								</button>
							)}
						</div>
					</div>

					<Select value={roleFilter} onValueChange={setRoleFilter}>
						<SelectTrigger className="w-full md:w-48">
							<Filter className="mr-2 h-4 w-4" />
							<SelectValue placeholder="Filter by role" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Roles</SelectItem>
							<SelectItem value="PRINCIPAL">Principal</SelectItem>
							<SelectItem value="ADMIN">Administrator</SelectItem>
							<SelectItem value="ENP">ENP</SelectItem>
							<SelectItem value="ENA">ENA</SelectItem>
						</SelectContent>
					</Select>

					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-full md:w-48">
							<Filter className="mr-2 h-4 w-4" />
							<SelectValue placeholder="Filter by status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Status</SelectItem>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="pending">Pending</SelectItem>
							<SelectItem value="suspended">Suspended</SelectItem>
						</SelectContent>
					</Select>

					<Select value={sortBy} onValueChange={setSortBy}>
						<SelectTrigger className="w-full md:w-48">
							<ArrowDownAZ className="mr-2 h-4 w-4" />
							<SelectValue placeholder="Sort by" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="name-asc">Name (A-Z)</SelectItem>
							<SelectItem value="name-desc">Name (Z-A)</SelectItem>
							<SelectItem value="email-asc">Email (A-Z)</SelectItem>
							<SelectItem value="email-desc">Email (Z-A)</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</CardContent>
		</Card>
	)
}