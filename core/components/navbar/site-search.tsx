"use client"

import * as React from "react"
import { SearchIcon } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "@/core/components/ui/command"
import { DialogTitle } from "@/core/components/ui/dialog"

export function SiteSearch() {
	const [open, setOpen] = React.useState(false)

	React.useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
				e.preventDefault()
				setOpen(open => !open)
			}
		}
		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [])

	return (
		<>
			<Button
				type="button"
				onClick={() => setOpen(true)}
				variant="ghost"
				className="bg-card/60 text-muted-foreground h-8 w-1/3 justify-start rounded-sm border"
			>
				<SearchIcon />
				Search
				<div className="ml-auto flex items-center gap-x-0.5 text-xs">
					<span className="bg-background rounded border px-1.5 py-0.5">Ctrl</span>
					<span className="bg-background rounded border px-1.5 py-0.5">K</span>
				</div>
			</Button>
			<CommandDialog open={open} onOpenChange={setOpen}>
				<DialogTitle className="sr-only">Command Menu</DialogTitle>
				<CommandInput placeholder="Type a command or search..." />
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>
					<CommandGroup heading="Navigation">
						<CommandItem onSelect={() => (window.location.href = "/dashboard")}>
							Go to Dashboard
							<CommandShortcut>G D</CommandShortcut>
						</CommandItem>
						<CommandItem onSelect={() => (window.location.href = "/profile")}>
							Profile
							<CommandShortcut>G P</CommandShortcut>
						</CommandItem>
					</CommandGroup>
					<CommandSeparator />
					<CommandGroup heading="Actions">
						<CommandItem onSelect={() => alert("Sign out")}>Sign out</CommandItem>
					</CommandGroup>
				</CommandList>
			</CommandDialog>
		</>
	)
}
