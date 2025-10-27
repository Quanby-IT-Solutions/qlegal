import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"

export function ToggleTwoFACardSkeleton() {
	return (
		<Card className="border-border/60 bg-card/80 dark:bg-card/70 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md">
			<CardHeader className="px-8 pt-4">
				<CardTitle className="flex items-center gap-2 text-lg font-medium">
					<Skeleton className="h-6 w-48" />
				</CardTitle>
				<CardDescription>
					<Skeleton className="h-4 w-64" />
				</CardDescription>
			</CardHeader>
			<CardContent className="px-8">
				<div className="flex flex-row items-center justify-between rounded-sm border p-4">
					<div className="space-y-0.5">
						<Skeleton className="h-4 w-40" />
						<Skeleton className="h-3 w-72" />
					</div>
					<Skeleton className="size-6 rounded-full" />
				</div>
			</CardContent>
		</Card>
	)
}
