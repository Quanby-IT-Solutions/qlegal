"use client"

import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import { Button } from "@/core/components/ui/button"
import { cn } from "@/core/lib/utils"

export function ModeToggle({ className }: { className?: string }) {
	const { setTheme, theme } = useTheme()
	const [mounted, setMounted] = useState(false)

	// Prevent hydration mismatch by only rendering after mount
	useEffect(() => {
		setMounted(true)
	}, [])

	const toggleTheme = () => {
		setTheme(theme === "light" ? "dark" : "light")
	}

	// Render placeholder during SSR to prevent hydration mismatch
	if (!mounted) {
		return (
			<Button
				variant="ghost"
				size="icon"
				className={cn("size-8", className)}
				aria-label="Toggle theme"
				disabled
			>
				<SunIcon className="h-[1.2rem] w-[1.2rem]" />
				<span className="sr-only">Toggle theme</span>
			</Button>
		)
	}

	return (
		<Button
			variant="ghost"
			size="icon"
			className={cn("size-8", className)}
			onClick={toggleTheme}
			aria-label="Toggle theme"
		>
			<SunIcon className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
			<MoonIcon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
			<span className="sr-only">Toggle theme</span>
		</Button>
	)
}
