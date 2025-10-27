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
	placeholder = "Search signed documents...",
}: SearchBarProps) {
	return (
		<div className="relative max-w-md">
			<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
			<Input
				placeholder={placeholder}
				value={searchQuery}
				onChange={e => onSearchChange(e.target.value)}
				className="border-border bg-background h-9 border pl-10 text-sm focus-visible:ring-1"
			/>
		</div>
	)
}
