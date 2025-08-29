"use client"

import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { DropdownMenuGroup, DropdownMenuItem } from "@/core/components/ui/dropdown-menu"
import { Switch } from "@/core/components/ui/switch"

export function ModeToggleDropdown({ className }: { className?: string }) {
	const { setTheme, theme } = useTheme()

	const toggleTheme = () => {
		setTheme(theme === "light" ? "dark" : "light")
	}

	return (
		<DropdownMenuGroup className={className}>
			<DropdownMenuItem
				onClick={e => {
					e.preventDefault()
					toggleTheme()
				}}
				className="flex items-center justify-between"
			>
				<div className="flex items-center gap-2">
					<SunIcon className="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
					<MoonIcon className="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
					Toggle theme
				</div>
				<Switch
					checked={theme === "dark"}
					onCheckedChange={checked => setTheme(checked ? "dark" : "light")}
					onClick={e => e.stopPropagation()}
					size="sm"
				/>
			</DropdownMenuItem>
		</DropdownMenuGroup>
	)
}
