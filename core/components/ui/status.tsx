import type { ComponentProps, HTMLAttributes } from "react"

import { Badge } from "@/core/components/ui/badge"
import { cn } from "@/core/lib/utils"

export interface StatusProps extends ComponentProps<typeof Badge> {
	status: "primary" | "secondary" | "success" | "info" | "warning" | "danger" | "outline"
}

const intentClasses: Record<StatusProps["status"], string> = {
	primary:
		"bg-primary/15 text-primary group-hover:bg-primary/25 dark:bg-primary/10 dark:text-primary dark:group-hover:bg-primary/20",
	secondary:
		"bg-secondary group-hover:bg-muted dark:bg-secondary dark:group-hover:bg-muted text-secondary-foreground",
	success:
		"bg-emerald-500/15 text-emerald-700 group-hover:bg-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400 dark:group-hover:bg-emerald-500/20",
	info: "bg-sky-500/15 text-sky-700 group-hover:bg-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300 dark:group-hover:bg-sky-500/20",
	warning:
		"bg-amber-400/20 text-amber-700 group-hover:bg-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400 dark:group-hover:bg-amber-400/15",
	danger:
		"bg-red-500/15 text-red-700 group-hover:bg-red-500/25 dark:bg-red-500/10 dark:text-red-400 dark:group-hover:bg-red-500/20",
	outline: "bg-transparent text-foreground border border-border",
}

export const Status = ({ className, status, ...props }: StatusProps) => (
	<Badge
		className={cn("flex items-center gap-2", "group", status, intentClasses[status], className)}
		{...props}
	/>
)

export type StatusIndicatorProps = HTMLAttributes<HTMLSpanElement>

export const StatusIndicator = ({ ...props }: StatusIndicatorProps) => (
	<span className="relative flex h-2 w-2" {...props}>
		<span
			className={cn(
				"absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
				"group-[.success]:bg-emerald-500",
				"group-[.info]:bg-sky-500",
				"group-[.warning]:bg-amber-400",
				"group-[.danger]:bg-red-500",
				"group-[.primary]:bg-primary",
				"group-[.secondary]:bg-muted-foreground",
				"group-[.outline]:bg-muted-foreground"
			)}
		/>
		<span
			className={cn(
				"relative inline-flex h-2 w-2 rounded-full",
				"group-[.success]:bg-emerald-600",
				"group-[.info]:bg-sky-600",
				"group-[.warning]:bg-amber-500",
				"group-[.danger]:bg-red-600",
				"group-[.primary]:bg-primary",
				"group-[.secondary]:bg-muted-foreground",
				"group-[.outline]:bg-muted-foreground"
			)}
		/>
	</span>
)

export type StatusLabelProps = HTMLAttributes<HTMLSpanElement>

export const StatusLabel = ({ className, children, ...props }: StatusLabelProps) => (
	<span className={cn(className)} {...props}>
		{children ?? (
			<>
				<span className="hidden group-[.primary]:block">Primary</span>
				<span className="hidden group-[.secondary]:block">Secondary</span>
				<span className="hidden group-[.success]:block">Success</span>
				<span className="hidden group-[.info]:block">Info</span>
				<span className="hidden group-[.warning]:block">Warning</span>
				<span className="hidden group-[.danger]:block">Danger</span>
				<span className="hidden group-[.outline]:block">Outline</span>
			</>
		)}
	</span>
)
