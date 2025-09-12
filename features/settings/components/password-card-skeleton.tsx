import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"

export function PasswordCardSkeleton() {
	return (
		<Card className="border-border/60 bg-card/80 dark:bg-card/70 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md">
			<CardHeader className="px-8 pt-4">
				<CardTitle className="flex items-center gap-2 text-lg font-medium">
					<Skeleton className="h-6 w-32" />
				</CardTitle>
				<CardDescription>
					<Skeleton className="h-4 w-64" />
				</CardDescription>
			</CardHeader>
			<CardContent className="px-8">
				<div className="space-y-4">
					<div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:gap-8">
						<div className="md:col-span-1">
							<Skeleton className="mb-2 h-4 w-24" />
							<Skeleton className="h-10 w-full" />
						</div>
						<div className="md:col-span-1">
							<Skeleton className="mb-2 h-4 w-32" />
							<Skeleton className="h-10 w-full" />
						</div>
					</div>
					<Skeleton className="mt-4 h-10 w-32" />
				</div>
			</CardContent>
		</Card>
	)
}
