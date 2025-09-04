import Link from "next/link"

import { Button } from "@/core/components/ui/button"
import { GridBackground } from "@/core/components/ui/grid-background"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="relative min-h-screen w-full overflow-hidden">
			<div className="absolute top-6 left-6 z-50">
				<Button variant="ghost" size="sm" asChild>
					<Link href="/" className="text-foreground/80 hover:text-foreground transition-colors">
						← Back to Home
					</Link>
				</Button>
			</div>

			<GridBackground
				gridSize="6:6"
				colors={{
					background:
						"bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900",
					borderColor: "border-blue-200/30 dark:border-blue-800/20",
					borderSize: "1px",
					borderStyle: "solid",
				}}
				beams={{
					count: 6,
					colors: [
						"bg-blue-500/80 dark:bg-blue-400/80",
						"bg-slate-600/60 dark:bg-slate-300/60",
						"bg-blue-600/70 dark:bg-blue-300/70",
						"bg-slate-700/50 dark:bg-slate-200/50",
						"bg-blue-400/60 dark:bg-blue-500/60",
						"bg-slate-500/40 dark:bg-slate-400/40",
					],
					speed: 4,
					shadow: "shadow-lg shadow-blue-500/20 dark:shadow-blue-400/30",
				}}
			>
				<div className="flex min-h-screen items-center justify-center p-4">{children}</div>
			</GridBackground>
		</div>
	)
}
