"use client"

import { Search } from "lucide-react"

import { Input } from "@/core/components/ui/input"

interface SearchBarProps {
	searchQuery: string
	onSearchChange: (value: string) => void
	placeholder?: string
}

export function SearchBar({
	searchQuery,
	onSearchChange,
	placeholder = "Search signed documents..."
}: SearchBarProps) {
	return (
		<div className="relative max-w-md">
			<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				placeholder={placeholder}
				value={searchQuery}
				onChange={(e) => onSearchChange(e.target.value)}
				className="h-9 border border-border bg-background pl-10 text-sm focus-visible:ring-1"
			/>
		</div>
	)
}
