"use client"

import { useEffect, useState } from "react"
import { Building, Mail, Search, User } from "lucide-react"

import {
	Avatar,
	AvatarFallback,
	AvatarImage
} from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from "@/core/components/ui/command"
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from "@/core/components/ui/popover"

import { trpc } from "@/services/trpc/client"

interface User {
	id: string
	name: string | null
	email: string | null
	image: string | null
	organization: string | null
	role: string
}

interface UserSearchProps {
	onUserSelect: (user: User) => void
	placeholder?: string
	trigger?: React.ReactNode
}

export function UserSearch({
	onUserSelect,
	placeholder = "Search users...",
	trigger
}: UserSearchProps) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState("")
	const [debouncedQuery, setDebouncedQuery] = useState("")

	// Debounce the search query
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedQuery(query)
		}, 300)

		return () => clearTimeout(timer)
	}, [query])

	// Search users
	const {
		data: users,
		isLoading,
		error
	} = trpc.messages.searchUsers.useQuery(
		{
			query: debouncedQuery,
			limit: 50 // Increased limit to show more users
		},
		{
			enabled: open // Enable when popover is open
		}
	)

	const handleUserSelect = (user: User) => {
		onUserSelect(user)
		setOpen(false)
		setQuery("")
	}

	const getRoleColor = (role: string) => {
		switch (role) {
			case "ADMIN":
				return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
			case "CLIENT":
				return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
			case "SUPER_ADMIN":
				return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
			default:
				return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
		}
	}

	const getRoleLabel = (role: string) => {
		switch (role) {
			case "ADMIN":
				return "Admin"
			case "CLIENT":
				return "Client"
			case "SUPER_ADMIN":
				return "Super Admin"
			default:
				return role
		}
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				{trigger ?? (
					<Button variant="outline" className="w-full justify-start">
						<Search className="mr-2 h-4 w-4" />
						{placeholder}
					</Button>
				)}
			</PopoverTrigger>
			<PopoverContent className="w-[400px] p-0" align="start">
				<Command>
					<CommandInput
						placeholder="Search by name, email, or organization..."
						value={query}
						onValueChange={setQuery}
					/>
					<CommandList>
						<CommandEmpty>
							{isLoading ? (
								<div className="p-4 text-center text-sm text-muted-foreground">
									Searching...
								</div>
							) : debouncedQuery.length > 0 ? (
								<div className="p-4 text-center text-sm text-muted-foreground">
									No users found for &quot;{debouncedQuery}&quot;
								</div>
							) : (
								<div className="p-4 text-center text-sm text-muted-foreground">
									Start typing to search for users
								</div>
							)}
						</CommandEmpty>
						<CommandGroup>
							{users?.map((user) => (
								<CommandItem
									key={user.id}
									onSelect={() => handleUserSelect(user)}
									className="flex items-center gap-3 p-3"
								>
									<Avatar className="h-8 w-8">
										<AvatarImage src={user.image ?? undefined} />
										<AvatarFallback>
											{user.name
												?.split(" ")
												.map((n) => n[0])
												.join("") ?? "U"}
										</AvatarFallback>
									</Avatar>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<span className="truncate font-medium">
												{user.name ?? "Unknown User"}
											</span>
											<Badge
												variant="secondary"
												className={getRoleColor(user.role)}
											>
												{getRoleLabel(user.role)}
											</Badge>
										</div>
										<div className="flex items-center gap-2 text-sm text-muted-foreground">
											<Mail className="h-3 w-3" />
											<span className="truncate">{user.email}</span>
										</div>
										{user.organization && (
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<Building className="h-3 w-3" />
												<span className="truncate">{user.organization}</span>
											</div>
										)}
									</div>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
